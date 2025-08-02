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

// Chuyển mức độ ảnh hưởng sang tiếng Việt
function mapImpactLevel(impactRaw) {
  const map = {
    'high': 'Cao',
    'very high': 'Rất cao',
    'medium': 'Trung bình',
    'low': 'Thấp'
  };
  return map[impactRaw.toLowerCase()] || impactRaw;
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
  return /(crypto|bitcoin|ethereum|blockchain|etf|fed|interest rate|cpi|inflation|gdp|unemployment)/i.test(nameRaw);
}

// Phân tích
function analyzeImpact(actual, forecast) {
  if (!actual || !forecast || actual === '–' || forecast === '–') {
    return 'Phân tích: Chỉ số chưa được công bố → chờ cập nhật sau.';
  }

  const a = parseFloat(actual.replace('%', '').replace(',', ''));
  const f = parseFloat(forecast.replace('%', '').replace(',', ''));

  if (isNaN(a) || isNaN(f)) return '';

  const diff = a - f;
  if (diff > 0) return 'Phân tích: Chỉ số cao hơn dự báo → khả năng tích cực đến thị trường.';
  if (diff < 0) return 'Phân tích: Chỉ số thấp hơn dự báo → khả năng tiêu cực đến thị trường.';
  return 'Phân tích: Đúng bằng dự báo → phản ứng thị trường có thể trung lập.';
}

// Định dạng tin nhắn
function formatMarketNews(newsList, dateStr) {
  if (!newsList || newsList.length === 0) {
    return [`🗓️ *${dateStr}*\nHôm nay không có sự kiện kinh tế quan trọng nào. Chúc bạn một ngày giao dịch hiệu quả!`];
  }

  let messages = [];
  let currentMessage = `🗓️ *${dateStr}*\n📊 *Thị trường hôm nay có các sự kiện kinh tế đáng chú ý:*\n\n`;

  newsList.forEach(news => {
    const cryptoTag = news.isCrypto ? '🔥 ' : '';
    let block = `${cryptoTag}${news.countryFlag} **${news.time} – ${news.title}**\n`;
    block += `**💥 Tác động: ${news.impact}**\n`;
    block += `Thực tế: ${news.actual || '–'} | Dự báo: ${news.forecast || '–'} | Trước đó: ${news.previous || '–'}\n`;
    block += `${analyzeImpact(news.actual, news.forecast)}\n──────────────\n`;

    if ((currentMessage + block).length > 1800) {
      messages.push(currentMessage);
      currentMessage = block;
    } else {
      currentMessage += block;
    }
  });

  if (currentMessage) {
    currentMessage += `\n*Bot gửi lúc 07:00 – Cập nhật tự động.*`;
    messages.push(currentMessage.trim());
  }

  return messages;
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

// Gọi chính
async function fetchMarketNews() {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const response = await axios.get(`https://financialmodelingprep.com/api/v3/economic_calendar?from=${today}&to=${today}`);
    const data = response.data;

    const news = [];

    for (const item of data) {
      const impact = mapImpactLevel(item.impact || '');
      const country = item.country || '';
      const nameRaw = item.event || '';
      const name = translateIndicator(nameRaw);
      const actual = item.actual || '–';
      const forecast = item.forecast || '–';
      const previous = item.previous || '–';
      const time = item.date.slice(11, 16); // format HH:mm

      if (!['Cao', 'Rất cao'].includes(impact) && !isCryptoRelated(nameRaw)) continue;

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
    const messages = formatMarketNews(news, dateStr);

    for (const uid of Object.keys(users)) {
      for (const msg of messages) {
        await callSendAPI(uid, { text: msg });
      }
    }
  } catch (err) {
    console.error('[MarketNews] Lỗi khi lấy dữ liệu:', err.message);
  }
}

module.exports = { fetchMarketNews };
