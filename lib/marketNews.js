// lib/marketNews.js

const axios = require('axios');
const moment = require('moment-timezone');

// Danh sách UID người nhận
const UID_LIST = ['24110537551888914'];

// Hàm gửi tin nhắn tới từng UID
const sendMessage = async (message, PAGE_ACCESS_TOKEN) => {
  for (const uid of UID_LIST) {
    try {
      await axios.post(
        `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          recipient: { id: uid },
          message: { text: message }
        }
      );
    } catch (error) {
      console.error(`❌ Lỗi khi gửi tới UID ${uid}:`, error.response?.data || error.message);
    }
  }
};

// Dịch chỉ số từ tiếng Anh sang tiếng Việt
const translateIndicator = (name) => {
  const translations = {
    'Consumer Price Index (CPI) YoY': 'Chỉ số giá tiêu dùng (CPI) hàng năm',
    'Consumer Price Index (CPI) MoM': 'Chỉ số giá tiêu dùng (CPI) hàng tháng',
    'Fed Interest Rate Decision': 'Quyết định lãi suất của Fed',
    'ECB Interest Rate Decision': 'Quyết định lãi suất ECB',
    'Core CPI': 'CPI lõi',
    'FOMC Statement': 'Tuyên bố FOMC',
    'GDP QoQ': 'Tăng trưởng GDP hàng quý',
    'Unemployment Rate': 'Tỷ lệ thất nghiệp',
    'Nonfarm Payrolls': 'Bảng lương phi nông nghiệp',
  };

  for (const key in translations) {
    if (name.includes(key)) return translations[key];
  }

  return name; // Giữ nguyên nếu không có bản dịch
};

// Tạo phân tích cơ bản
const analyze = (actual, forecast) => {
  if (!actual || !forecast || actual === '—' || forecast === '—') return '';
  const a = parseFloat(actual.replace('%', ''));
  const f = parseFloat(forecast.replace('%', ''));
  if (isNaN(a) || isNaN(f)) return '';
  if (a < f) return '→ Dữ liệu thấp hơn dự báo, có thể hỗ trợ thị trường.';
  if (a > f) return '→ Dữ liệu cao hơn dự báo, có thể gây áp lực lên thị trường.';
  return '→ Dữ liệu khớp dự báo, thị trường ít biến động.';
};

const fetchEconomicEvents = async (PAGE_ACCESS_TOKEN) => {
  try {
    const now = moment().tz('Asia/Ho_Chi_Minh');
    const dateStr = now.format('YYYY-MM-DD');

    const { data } = await axios.get(
      `https://economic-calendar-api.p.rapidapi.com/events/${dateStr}`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'economic-calendar-api.p.rapidapi.com'
        }
      }
    );

    const rawEvents = data?.data || [];
    const filtered = rawEvents.filter(e => {
      const importantKeywords = ['CPI', 'Fed', 'FOMC', 'Lãi suất', 'Interest Rate'];
      const isImportant = importantKeywords.some(k => e.event.includes(k));
      const isHighImpact = e.impact === 'High' || e.impact === 'Very High';
      return isImportant || isHighImpact;
    });

    if (!filtered.length) return;

    const events = filtered.map(e => {
      const country = e.country || '🌐';
      const time = moment(e.date).tz('Asia/Ho_Chi_Minh').format('HH:mm');
      const name = translateIndicator(e.event);
      const impact = e.impact === 'Very High' ? 'Rất cao'
                    : e.impact === 'High' ? 'Cao'
                    : e.impact === 'Medium' ? 'Trung bình' : 'Thấp';
      const actual = e.actual || '—';
      const forecast = e.forecast || '—';
      const previous = e.previous || '—';
      const analysis = analyze(actual, forecast);

      return (
`🇨🇭 ${country} | ${time}
${name} — ${impact}
Thực tế: ${actual} | Dự báo: ${forecast} | Trước đó: ${previous}
${analysis}
────────────────────`
      );
    });

    const message =
`📅 Lịch tin vĩ mô hôm nay (${now.format('DD/MM')})\n\n` +
events.join('\n');

    await sendMessage(message, PAGE_ACCESS_TOKEN);
    console.log(`[Cron] Đã gửi lịch tin vĩ mô lúc ${now.format('HH:mm')}`);
  } catch (error) {
    console.error('❌ Lỗi fetchEconomicEvents:', error.response?.data || error.message);
  }
};

module.exports = fetchEconomicEvents;
