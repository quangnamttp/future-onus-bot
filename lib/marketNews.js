const axios = require('axios');
const cheerio = require('cheerio');

// Chuyển đổi tiêu đề sang tiếng Việt đơn giản
function translateImpact(impact) {
  if (impact.includes('Low')) return 'Thấp';
  if (impact.includes('Medium')) return 'Trung bình';
  if (impact.includes('High')) return 'Cao';
  return impact;
}

// Dịch tiêu đề cơ bản sang tiếng Việt (nếu cần cải thiện có thể dùng API dịch)
function translateTitle(title) {
  return title.replace('Consumer Price Index', 'Chỉ số giá tiêu dùng')
              .replace('Initial Jobless Claims', 'Đơn xin trợ cấp thất nghiệp')
              .replace('Fed Chair Powell', 'Chủ tịch Fed Powell')
              .replace('Interest Rate Decision', 'Quyết định lãi suất')
              .replace('FOMC', 'Ủy ban thị trường mở FOMC');
}

// Lấy dữ liệu lịch tin từ Investing.com
async function fetchMacroNews() {
  try {
    const res = await axios.get('https://www.investing.com/economic-calendar/', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const $ = cheerio.load(res.data);
    const rows = $('tr.js-event-item');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // yyyy-mm-dd

    const news = [];

    rows.each((_, row) => {
      const time = $(row).find('.first.left.time').text().trim();
      const country = $(row).find('.left.flagCur span').attr('title') || '';
      const title = $(row).find('.left.event').text().trim();
      const impact = $(row).find('.sentiment > i').length;
      const impactStr = impact === 3 ? 'Cao' : impact === 2 ? 'Trung bình' : 'Thấp';

      const dateAttr = $(row).attr('data-event-datetime');
      if (dateAttr && dateAttr.startsWith(todayStr)) {
        if (impact >= 2) {
          news.push({
            time,
            country,
            title: translateTitle(title),
            impact: impactStr
          });
        }
      }
    });

    return news;
  } catch (err) {
    console.error("Lỗi khi crawl lịch tin:", err.message);
    return [];
  }
}

module.exports = { fetchMacroNews };
