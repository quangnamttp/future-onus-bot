const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
require('dayjs/locale/vi');
dayjs.locale('vi');

const { users } = require('../config.json');

function translateIndicator(name) {
  const translations = {
    'Core CPI': 'CPI lõi',
    'CPI': 'Chỉ số giá tiêu dùng',
    'Fed Interest Rate Decision': 'Quyết định lãi suất của Fed',
    'Unemployment Rate': 'Tỷ lệ thất nghiệp',
    'Nonfarm Payrolls': 'Bảng lương phi nông nghiệp',
    'Interest Rate Decision': 'Quyết định lãi suất',
    'Retail Sales': 'Doanh số bán lẻ',
    'GDP': 'Tổng sản phẩm quốc nội',
  };

  for (const [key, val] of Object.entries(translations)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val;
  }

  return name;
}

async function fetchMarketNews() {
  try {
    const today = dayjs().format('DD.MM.YYYY');
    const response = await axios.get('https://www.investing.com/economic-calendar/', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      }
    });

    const $ = cheerio.load(response.data);
    const rows = $('tr.js-event-item');
    const news = [];

    rows.each((i, row) => {
      const dateAttr = $(row).attr('data-event-datetime'); // định dạng UTC timestamp
      if (!dateAttr) return;

      const eventDate = dayjs(dateAttr);
      const now = dayjs().startOf('day');
      if (!eventDate.isSame(now, 'day')) return;

      const impact = $(row).find('.sentiment span').attr('title') || '';
      const country = $(row).find('.flagCur').attr('title') || '';
      const time = $(row).find('.first.left.time').text().trim();
      const name = $(row).find('.left.event').text().trim();
      const actual = $(row).find('.bold.greenFont, .bold.redFont').first().text().trim() || '–';
      const forecast = $(row).find('td.forecast').text().trim() || '–';
      const previous = $(row).find('td.previous').text().trim() || '–';

      const level = impact.toLowerCase();
      const important =
        level.includes('cao') ||
        level.includes('quan trọng') ||
        /(CPI|Fed|Interest Rate|Lãi suất|Quyết định|Nonfarm|Unemployment)/i.test(name);

      if (important) {
        news.push({
          country,
          time,
          name: translateIndicator(name),
          impact,
          actual,
          forecast,
          previous,
        });
      }
    });

    const weekday = dayjs().format('dddd');
    const date = dayjs().format('DD/MM/YYYY');
    let message = `🗓️ *${weekday}, ${date}*\n📊 *Thị trường hôm nay có các sự kiện kinh tế đáng chú ý như sau:*\n\n`;

    if (news.length === 0) {
      message += 'Hôm nay không có tin tức kinh tế quan trọng nào. Chúc bạn một ngày giao dịch hiệu quả!';
    } else {
      news.forEach(item => {
        message += `🌍 ${item.country} | ${item.time}\n📌 ${item.name} (${item.impact})\n📈 Thực tế: ${item.actual} | Dự báo: ${item.forecast} | Trước đó: ${item.previous}\n---\n`;
      });
    }

    for (const uid of Object.keys(users)) {
      await callSendAPI(uid, { text: message });
    }
  } catch (err) {
    console.error('[MarketNews] Lỗi khi lấy lịch tin kinh tế:', err.message);
  }
}

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function callSendAPI(sender_psid, response) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: sender_psid },
        message: response
      }
    );
    console.log(`[MarketNews] Đã gửi tin nhắn đến ${sender_psid}`);
  } catch (err) {
    console.error('[MarketNews] Gửi tin nhắn thất bại:', err.response?.data || err.message);
  }
}

module.exports = { fetchMarketNews };
