const axios = require('axios');
const moment = require('moment-timezone');
const { PAGE_ACCESS_TOKEN } = require('../config.json');

// Gửi tin nhắn Messenger
async function sendMessage(token, recipientId, message) {
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages?access_token=${token}`,
    {
      messaging_type: 'RESPONSE',
      recipient: { id: recipientId },
      message: { text: message },
    }
  );
}

// Dịch tên chỉ số
function translateIndicator(name) {
  const translations = {
    'Consumer Price Index (YoY)': 'Chỉ số CPI (so với cùng kỳ)',
    'Consumer Price Index (MoM)': 'Chỉ số CPI (theo tháng)',
    'Interest Rate Decision': 'Quyết định lãi suất',
    'Fed Interest Rate Decision': 'Lãi suất của Fed',
    'ECB Interest Rate Decision': 'Lãi suất ECB',
    'Core CPI': 'CPI lõi',
    'GDP (YoY)': 'Tăng trưởng GDP (năm)',
    'GDP (QoQ)': 'Tăng trưởng GDP (quý)',
    'Unemployment Rate': 'Tỷ lệ thất nghiệp',
    'Initial Jobless Claims': 'Số đơn xin trợ cấp thất nghiệp',
    // thêm nếu cần
  };
  return translations[name] || name;
}

// Dịch mức ảnh hưởng
function translateImpact(impact) {
  switch (impact) {
    case 'Low': return 'Thấp';
    case 'Medium': return 'Trung bình';
    case 'High': return 'Cao';
    case 'Very High': return 'Rất cao';
    default: return impact;
  }
}

// Phân tích tin vĩ mô
function analyzeNews(actual, forecast, previous, name) {
  const toFloat = val => parseFloat(val.replace('%', '').trim());
  let a = toFloat(actual), f = toFloat(forecast), p = toFloat(previous);
  if (name.includes('CPI') && !isNaN(a) && !isNaN(f)) {
    if (a < f) return '→ CPI giảm nhẹ có thể hỗ trợ giá crypto hồi phục.';
    else if (a > f) return '→ CPI tăng gây lo ngại lạm phát.';
    else return '→ CPI đúng kỳ vọng, thị trường ổn định.';
  }
  if (name.includes('lãi suất') && !isNaN(a) && !isNaN(p)) {
    if (a > p) return '→ Lãi suất tăng, thị trường có thể phản ứng tiêu cực.';
    else if (a < p) return '→ Lãi suất hạ, hỗ trợ thị trường.';
    else return '→ Lãi suất giữ nguyên, phản ứng tùy kỳ vọng trước đó.';
  }
  return '→ Dữ liệu có thể ảnh hưởng đến thị trường.';
}

// Gửi lịch tin vĩ mô
async function sendMacroNews(recipientId) {
  try {
    const now = moment().tz('Asia/Ho_Chi_Minh');
    const today = now.format('YYYY-MM-DD');

    const response = await axios.get(`https://www.investing.com/economic-calendar/Service/getCalendarFilteredData`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: `country[]=5&country[]=6&country[]=72&country[]=43&country[]=4&country[]=35&country[]=26&importance[]=1&importance[]=2&importance[]=3&importance[]=4&date=${today}|${today}`
    });

    const data = response.data;
    const rawEvents = JSON.parse(data).data;

    // Lọc và xử lý tin
    const importantKeywords = ['CPI', 'Fed', 'lãi suất', 'GDP', 'thất nghiệp', 'PPI'];
    const events = [];

    rawEvents.forEach(ev => {
      const country = ev.country;
      const time = moment(`${today} ${ev.time}`, 'YYYY-MM-DD HH:mm').tz('Asia/Ho_Chi_Minh').format('HH:mm');
      const name = translateIndicator(ev.event);
      const impact = translateImpact(ev.importance);
      const actual = ev.actual || '–';
      const forecast = ev.forecast || '–';
      const previous = ev.previous || '–';
      const analysis = analyzeNews(actual, forecast, previous, name);

      const isImportant = ev.importance >= 3 || importantKeywords.some(k => name.toLowerCase().includes(k.toLowerCase()));

      if (isImportant) {
        events.push(
          `🇻🇳 | ${time}\n` +
          `Chỉ số: ${name} — ${impact}\n` +
          `Thực tế: ${actual} | Dự báo: ${forecast} | Trước đó: ${previous}\n` +
          `${analysis}\n` +
          `────────────────────`
        );
      }
    });

    if (events.length === 0) {
      await sendMessage(PAGE_ACCESS_TOKEN, recipientId, '📅 Không có tin vĩ mô quan trọng nào hôm nay.');
      return;
    }

    // Gửi theo từng khối <2000 ký tự
    const header = `📅 Lịch tin vĩ mô hôm nay (${now.format('DD/MM')})\n\n`;
    let currentChunk = header;

    for (const event of events) {
      if ((currentChunk + event + '\n\n').length > 1900) {
        await sendMessage(PAGE_ACCESS_TOKEN, recipientId, currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += event + '\n\n';
    }

    if (currentChunk.trim()) {
      await sendMessage(PAGE_ACCESS_TOKEN, recipientId, currentChunk.trim());
    }

  } catch (err) {
    console.error('❌ Lỗi khi gửi lịch tin vĩ mô:', err.message);
  }
}

module.exports = { sendMacroNews };
