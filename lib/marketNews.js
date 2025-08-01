const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
require('dayjs/locale/vi');
dayjs.locale('vi');

const { users } = require('../config.json');

// Gửi tin nhắn tới người dùng
async function callSendAPI(sender_psid, response) {
  try {
    await axios.post(`https://graph.facebook.com/v17.0/me/messages?access_token=${process.env.PAGE_ACCESS_TOKEN}`, {
      recipient: { id: sender_psid },
      message: response,
    });
  } catch (err) {
    console.error('[SendAPI] Lỗi gửi tin nhắn:', err.response?.data || err.message);
  }
}

// Dịch tên chỉ số kinh tế sang tiếng Việt (có thể mở rộng thêm)
function translateIndicator(name) {
  const map = {
    'Nonfarm Payrolls': 'Bảng lương phi nông nghiệp',
    'Initial Jobless Claims': 'Số đơn xin trợ cấp thất nghiệp lần đầu',
    'GDP': 'Tổng sản phẩm quốc nội (GDP)',
    'Core CPI': 'CPI lõi',
    'CPI': 'Chỉ số giá tiêu dùng (CPI)',
    'Interest Rate': 'Lãi suất',
    'Fed Interest Rate Decision': 'Quyết định lãi suất của Fed',
    'Unemployment Rate': 'Tỷ lệ thất nghiệp',
  };

  for (const key in map) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return map[key];
    }
  }

  return name; // Trả về nguyên văn nếu không tìm thấy
}

// Tải và phân tích dữ liệu lịch kinh tế
async function fetchMarketNews() {
  try {
    const today = dayjs().format('YYYY-MM-DD');
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

    const weekday = dayjs().format('dddd');
    const date = dayjs().format('DD/MM/YYYY');
    let message = `🗓️ *${weekday}, ${date}*\n📊 *Thị trường hôm nay có các sự kiện kinh tế đáng chú ý như sau:*\n\n`;

    if (news.length === 0) {
      message += 'Không có tin tức kinh tế quan trọng nào được ghi nhận hôm nay.';
    } else {
      news.forEach(item => {
        message += `🌍 ${item.country} | ${item.time}\n📌 ${item.name} (${item.impact})\n📈 Thực tế: ${item.actual} | Dự báo: ${item.forecast} | Trước đó: ${item.previous}\n---\n`;
      });
    }

    // Gửi tin nhắn cho tất cả người dùng
    for (const uid of Object.keys(users)) {
      await callSendAPI(uid, { text: message });
    }
  } catch (err) {
    console.error('[MarketNews] Lỗi khi lấy lịch tin kinh tế:', err.message);
  }
}

module.exports = { fetchMarketNews };
