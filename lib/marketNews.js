const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
require('dayjs/locale/vi');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('vi');

const { users } = require('../config.json');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Dịch tên chỉ số kinh tế sang tiếng Việt (có thể mở rộng thêm)
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

// Gửi tin nhắn Messenger
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

// Lấy và gửi bản tin kinh tế
async function fetchMarketNews() {
  try {
    const now = dayjs().tz('Asia/Ho_Chi_Minh');
    const today = now.format('YYYY-MM-DD');

    const response = await axios.get(`https://www.investing.com/economic-calendar/${today}`);
    const $ = cheerio.load(response.data);
    const rows = $('tr.js-event-item');
    const news = [];

    rows.each((i, row) => {
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

    const weekday = now.format('dddd');
    const date = now.format('DD/MM/YYYY');
    let message = `🗓️ *${weekday}, ${date}*\n`;

    if (news.length === 0) {
      message += `Hôm nay không có sự kiện kinh tế quan trọng nào. Chúc bạn một ngày giao dịch hiệu quả và vui vẻ!`;
    } else {
      message += `📊 *Thị trường hôm nay có các sự kiện kinh tế đáng chú ý như sau:*\n\n`;
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

module.exports = { fetchMarketNews };
