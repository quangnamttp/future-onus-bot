const axios = require('axios');
const cheerio = require('cheerio');
const dayjs = require('dayjs');
require('dayjs/locale/vi');
dayjs.locale('vi');

const { users } = require('../config.json');

// Dịch sự kiện sang tiếng Việt
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

// Phân tích chênh lệch
function analyzeImpact(actual, forecast) {
  if (actual === '–' || forecast === '–') return 'Phân tích: Chỉ số chưa được công bố → chờ cập nhật sau.';
  const a = parseFloat(actual.replace('%', '').replace(',', ''));
  const f = parseFloat(forecast.replace('%', '').replace(',', ''));
  if (isNaN(a) || isNaN(f)) return '';
  const diff = a - f;
  if (diff > 0) return 'Phân tích: Chỉ số cao hơn dự báo → khả năng tác động tích cực đến đồng tiền.';
  if (diff < 0) return 'Phân tích: Chỉ số thấp hơn dự báo → khả năng gây áp lực giảm giá.';
  return 'Phân tích: Đúng bằng dự báo → phản ứng thị trường có thể trung lập.';
}

// Cờ quốc gia
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

// Xác định tin ảnh hưởng crypto
function isCryptoRelated(nameRaw) {
  return /(crypto|Bitcoin|Ethereum|blockchain|ETF|Fed|Interest Rate|CPI|Lạm phát|Tỷ lệ thất nghiệp|GDP)/i.test(nameRaw);
}

async function fetchMarketNews() {
  try {
    const response = await axios.get('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
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

      const isImportant =
        impact.toLowerCase().includes('cao') ||
        /(CPI|Fed|Interest Rate|Lãi suất|Nonfarm|Unemployment|GDP|Retail Sales)/i.test(nameRaw);

      const key = `${country}-${time}-${name}`;
      if (isImportant && !seen.has(key)) {
        seen.add(key);
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
    });

    const dateStr = `${dayjs().format('dddd')}, ${dayjs().format('DD/MM/YYYY')}`;
    const message = formatMarketNews(news, dateStr);

    for (const uid of Object.keys(users)) {
      await callSendAPI(uid, { text: message });
    }
  } catch (err) {
    console.error('[MarketNews] Lỗi khi lấy lịch tin kinh tế:', err.message);
  }
}

function formatMarketNews(newsList, dateStr) {
  if (!newsList || newsList.length === 0) {
    return `🗓️ *${dateStr}*\nHôm nay không có sự kiện kinh tế quan trọng nào. Chúc bạn một ngày giao dịch hiệu quả!`;
  }

  let formattedNews = `🗓️ *${dateStr}*\n📊 *Thị trường hôm nay có các sự kiện kinh tế đáng chú ý:*\n\n`;

  newsList.forEach(news => {
    const cryptoTag = news.isCrypto ? '🔥 ' : '';
    formattedNews += `${cryptoTag}${news.countryFlag} **${news.time} – ${news.title}**\n`;
    formattedNews += `**💥 Tác động: ${news.impact}**\n`;
    formattedNews += `Thực tế: ${news.actual} | Dự báo: ${news.forecast} | Trước đó: ${news.previous}\n`;
    formattedNews += `${analyzeImpact(news.actual, news.forecast)}\n`;
    formattedNews += `──────────────\n`;
  });

  formattedNews += `\n*Bot gửi lúc 07:00 – Cập nhật tự động.*`;
  return formattedNews.trim();
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
