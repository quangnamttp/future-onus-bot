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
    'Interest Rate Decision': 'Quyết định lãi suất',
    'Unemployment Rate': 'Tỷ lệ thất nghiệp',
    'Nonfarm Payrolls': 'Bảng lương phi nông nghiệp',
    'Retail Sales': 'Doanh số bán lẻ',
    'GDP': 'Tổng sản phẩm quốc nội',
  };

  for (const [key, val] of Object.entries(translations)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val;
  }

  return name;
}

// Phân tích cơ bản từ dữ liệu
function analyzeImpact(actual, forecast) {
  if (actual === '–' || forecast === '–') return '';
  const a = parseFloat(actual.replace('%', '').replace(',', ''));
  const f = parseFloat(forecast.replace('%', '').replace(',', ''));
  if (isNaN(a) || isNaN(f)) return '';
  const diff = a - f;
  if (diff > 0) return 'Phân tích: Chỉ số cao hơn dự báo → khả năng tác động tích cực đến đồng tiền.';
  if (diff < 0) return 'Phân tích: Chỉ số thấp hơn dự báo → khả năng gây áp lực giảm giá.';
  return 'Phân tích: Đúng bằng dự báo → phản ứng thị trường có thể trung lập.';
}

async function fetchMarketNews() {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const response = await axios.get(`https://nfs.faireconomy.media/ff_calendar_thisweek.json`);
    const $ = cheerio.load(response.data);
    const rows = $('tr.js-event-item');
    const seen = new Set();
    const news = [];

    rows.each((i, row) => {
      const impact = $(row).find('.sentiment span').attr('title') || '';
      const country = $(row).find('.flagCur').attr('title') || '';
      const time = $(row).find('.first.left.time').text().trim();
      const nameRaw = $(row).find('.left.event').text().trim();
      const name = translateIndicator(nameRaw);
      const actual = $(row).find('.bold.greenFont, .bold.redFont').first().text().trim() || '–';
      const forecast = $(row).find('td.forecast').text().trim() || '–';
      const previous = $(row).find('td.previous').text().trim() || '–';

      const level = impact.toLowerCase();
      const important =
        level.includes('cao') ||
        level.includes('quan trọng') ||
        /(CPI|Fed|Interest Rate|Lãi suất|Nonfarm|Unemployment)/i.test(nameRaw);

      const key = `${country}-${time}-${name}`;
      if (important && !seen.has(key)) {
        seen.add(key);
        news.push({ country, time, name, impact, actual, forecast, previous });
      }
    });

    const weekday = dayjs().format('dddd');
    const date = dayjs().format('DD/MM/YYYY');
    let message = `🗓️ *${weekday}, ${date}*\n📊 *Lịch tin vĩ mô đáng chú ý hôm nay:*\n\n`;

    if (news.length === 0) {
  message = `🗓️ *${weekday}, ${date}*\nHôm nay không có sự kiện kinh tế quan trọng nào. Chúc bạn một ngày giao dịch hiệu quả!`;
} else {
      news.forEach(item => {
        message += `🌍 *${item.country}* | 🕒 ${item.time}\n📌 ${item.name} (${item.impact})\n📈 Thực tế: ${item.actual} | Dự báo: ${item.forecast} | Trước đó: ${item.previous}\n${analyzeImpact(item.actual, item.forecast)}\n---\n`;
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
