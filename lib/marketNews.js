const axios = require('axios');
const dotenv = require('dotenv');
const { users } = require('../config');
const { format } = require('date-fns');
const { vi } = require('date-fns/locale');

dotenv.config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function callSendAPI(senderPsid, response) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: senderPsid },
        message: { text: response }
      }
    );
  } catch (error) {
    console.error('Gửi tin nhắn thất bại:', error.response?.data || error.message);
  }
}

function formatEvent(event) {
  const countryFlag = event.country === 'US' ? '🇺🇸' :
                      event.country === 'EU' ? '🇪🇺' :
                      event.country === 'CN' ? '🇨🇳' :
                      event.country === 'JP' ? '🇯🇵' :
                      event.country === 'GB' ? '🇬🇧' : '🌐';

  const impactMap = {
    High: 'Rất cao',
    Medium: 'Trung bình',
    Low: 'Thấp'
  };

  const viLabel = event.event
    .replace('CPI', 'Chỉ số giá tiêu dùng (CPI)')
    .replace('Fed Interest Rate Decision', 'Quyết định lãi suất Fed')
    .replace('Interest Rate', 'Lãi suất')
    .replace('GDP', 'Tăng trưởng GDP')
    .replace('Unemployment Rate', 'Tỷ lệ thất nghiệp');

  const impact = impactMap[event.impact] || event.impact;

  return `${countryFlag} | ${event.time}\n${viLabel} — ${impact}\nThực tế: ${event.actual || '-'} | Dự báo: ${event.forecast || '-'} | Trước đó: ${event.previous || '-'}\n→ ${event.analysis || 'Đang cập nhật.'}\n────────────────────`;
}

function chunkMessage(message, maxLength = 2000) {
  const chunks = [];
  while (message.length > maxLength) {
    const splitIndex = message.lastIndexOf('\n────────────────────', maxLength);
    if (splitIndex === -1) break;
    chunks.push(message.slice(0, splitIndex + 21));
    message = message.slice(splitIndex + 21);
  }
  chunks.push(message);
  return chunks;
}

async function fetchMarketNews() {
  try {
    const today = new Date();
    const formattedDate = format(today, "EEEE, dd/MM/yyyy", { locale: vi });
    const header = `📅 *Hôm nay là ${formattedDate}*\n📊 Thị trường có những sự kiện như sau:\n\n`;

    // Giả lập dữ liệu (sau này thay bằng API thật)
    const events = [
      {
        country: 'US',
        time: '19:30',
        event: 'CPI Tháng 6',
        impact: 'High',
        actual: '3.0%',
        forecast: '3.1%',
        previous: '3.3%',
        analysis: 'Giảm CPI nhẹ có thể hỗ trợ giá crypto hồi phục.'
      },
      {
        country: 'EU',
        time: '20:00',
        event: 'Lãi suất ECB',
        impact: 'High',
        actual: '4.25%',
        forecast: '4.25%',
        previous: '4.00%',
        analysis: 'Lãi suất giữ nguyên, thị trường phản ứng tích cực.'
      },
      {
        country: 'US',
        time: '21:00',
        event: 'Báo cáo việc làm ADP',
        impact: 'Medium',
        actual: '180K',
        forecast: '160K',
        previous: '175K',
        analysis: 'Số việc làm tăng vượt dự báo, hỗ trợ USD.'
      }
    ];

    const filtered = events.filter(e =>
      ['High', 'Medium'].includes(e.impact) ||
      /(CPI|Fed|lãi suất|interest rate)/i.test(e.event)
    );

    if (filtered.length === 0) return;

    const body = filtered.map(formatEvent).join('\n');
    const fullMessage = header + body;
    const chunks = chunkMessage(fullMessage);

    for (const userId of Object.keys(users)) {
      for (const chunk of chunks) {
        await callSendAPI(userId, chunk);
      }
    }

    console.log('[✔] Đã gửi lịch tin vĩ mô lúc 07:00 thành công.');
  } catch (error) {
    console.error('Lỗi khi gửi lịch tin vĩ mô:', error.message);
  }
}

module.exports = { fetchMarketNews };
