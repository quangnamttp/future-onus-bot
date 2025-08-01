const axios = require('axios');
const cheerio = require('cheerio');

// Hàm lấy lịch tin từ Investing.com, trả về mảng tin đã lọc
async function fetchMacroNews() {
  try {
    const response = await axios.get('https://vn.investing.com/economic-calendar/', {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const $ = cheerio.load(response.data);

    let news = [];

    $('tr.js-event-item').each((i, elem) => {
      const datetime = $(elem).attr('data-event-datetime');
      if (!datetime) return;

      const time = datetime.split(' ')[1];
      const impact = $(elem).find('.sentiment').attr('data-img_key') || '';
      const country = $(elem).find('.flagCur img').attr('title');
      const title = $(elem).find('.event').text().trim();

      const impactLevel = impact.includes('bull3') ? '🌋 Cao' :
                          impact.includes('bull2') ? '⚠️ Trung bình' :
                          '';

      if (impactLevel) {
        news.push({ time, country, title, impact: impactLevel });
      }
    });

    return news; // Trả về danh sách chưa định dạng
  } catch (err) {
    console.error("❌ Lỗi lấy lịch kinh tế:", err.message);
    return [];
  }
}

module.exports = { fetchMacroNews };
