const axios = require('axios');
const dayjs = require('dayjs');
require('dayjs/locale/vi');
dayjs.locale('vi');

const { users } = require('../config.json');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Dịch tên sự kiện sang tiếng Việt
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
    'PPI': 'Chỉ số giá sản xuất',
    'Initial Jobless Claims': 'Đơn xin trợ cấp thất nghiệp lần đầu',
    'Trade Balance': 'Cán cân thương mại',
    'ISM Manufacturing PMI': 'Chỉ số PMI sản xuất ISM',
    'Bitcoin ETF': 'ETF Bitcoin',
    'Crypto Regulation': 'Quy định tiền mã hóa',
  };

  for (const [key, val] of Object.entries(translations)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val;
  }

  return name;
}

// Gắn cờ quốc gia
function getFlag(country) {
  const flags = {
    'Mỹ': '🇺🇸',
    'Anh': '🇬🇧',
    'Đức': '🇩🇪',
    'Pháp': '🇫🇷',
    'Ý': '🇮🇹',
    'Canada': '🇨🇦',
    'Trung Quốc': '🇨🇳',
    'Nhật Bản': '🇯🇵',
    'Úc': '🇦🇺',
    'New Zealand': '🇳🇿',
    'Khu vực Euro': '🇪🇺',
  };
  return flags[country] || '';
}

// Nhận diện tin liên quan Crypto
function isCryptoRelated(nameRaw) {
  return /(crypto|bitcoin|ethereum|blockchain|etf|fed|interest rate|cpi|lạm phát|tỷ lệ thất nghiệp|gdp)/i.test(nameRaw);
}

// Phân tích so sánh thực tế với dự báo
function analyzeImpact(actual, forecast) {
  if (!actual || !forecast || actual === '–' || forecast === '–') {
    return 'Phân tích: Chỉ số chưa được công bố → chờ cập nhật sau.';
  }

  const a = parseFloat(actual.replace('%', '').replace(',', ''));
  const f = parseFloat(forecast.replace('%', '').replace(',', ''));

  if (isNaN(a) || isNaN(f)) return '';

  const diff = a - f;
  if (diff > 0) return 'Phân tích: Chỉ số cao hơn dự báo → khả năng tích cực đến đồng tiền.';
  if (diff < 0) return 'Phân tích: Chỉ số thấp hơn dự báo → khả năng tiêu cực đến đồng tiền.';
  return 'Phân tích: Đúng bằng dự báo → phản ứng thị trường có thể trung lập.';
}

// Định dạng tin gửi đi
function formatMarketNews(newsList, dateStr) {
  if (!newsList || newsList.length === 0) {
    return `🗓️ *${dateStr}*\nHôm nay không có sự kiện kinh tế quan trọng nào. Chúc bạn một ngày giao dịch hiệu quả!`;
  }

  let formattedNews = `🗓️ *${dateStr}*\n📊 *Thị trường hôm nay có các sự kiện kinh tế đáng chú ý:*\n\n`;

  newsList.forEach(news => {
    const cryptoTag = news.isCrypto ? '🔥 ' : '';
    formattedNews += `${cryptoTag}${news.countryFlag} **${news.time} – ${news.title}**\n`;
    formattedNews += `**💥 Tác động: ${news.impact}**\n`;
    formattedNews += `Thực tế: ${news.actual || '–'} | Dự báo: ${news.forecast || '–'} | Trước đó: ${news.previous || '–'}\n`;
    formattedNews += `${analyzeImpact(news.actual, news.forecast)}\n`;
    formattedNews += `──────────────\n`;
  });

  formattedNews += `\n*Bot gửi lúc 07:00 – Cập nhật tự động.*`;
  return formattedNews.trim();
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
    console.log(`[MarketNews] ✅ Đã gửi tin nhắn đến ${sender_psid}`);
  } catch (err) {
    console.error('[MarketNews] ❌ Gửi tin nhắn thất bại:', err.response?.data || err.message);
  }
}

// Hàm gọi chính
async function fetchMarketNews() {
  try {
    const response = await axios.get('https://investing-data-source.com/api/today-news'); // Cần thay bằng API thật hoặc crawler của bạn
    const data = response.data;

    const news = [];

    for (const item of data) {
      const impact = item.impact || '';
      const country = item.country || '';
      const nameRaw = item.title || '';
      const name = translateIndicator(nameRaw);
      const actual = item.actual || '–';
      const forecast = item.forecast || '–';
      const previous = item.previous || '–';
      const time = item.time || '';

      if (!impact.toLowerCase().includes('cao') && !isCryptoRelated(nameRaw)) continue;

      news.push({
        country,
        time,
        title: name,
        impact,
        actual,
        forecast,
        previous,
        rawTitle: nameRaw,
        countryFlag: getFlag(country),
        isCrypto: isCryptoRelated(nameRaw),
      });
    }

    const dateStr = `${dayjs().format('dddd')}, ${dayjs().format('DD/MM/YYYY')}`;
    const message = formatMarketNews(news, dateStr);

    for (const uid of Object.keys(users)) {
      await callSendAPI(uid, { text: message });
    }
  } catch (err) {
    console.error('[MarketNews] Lỗi khi lấy dữ liệu:', err.message);
  }
}

module.exports = { fetchMarketNews };
