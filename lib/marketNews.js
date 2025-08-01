// lib/marketNews.js

const axios = require('axios');
const cheerio = require('cheerio');

// Hàm lấy lịch tin từ Investing.com
async function fetchMacroNews() {
  try {
    const response = await axios.get('https://vn.investing.com/economic-calendar/', {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const $ = cheerio.load(response.data);
    const today = new Date();
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayYear = today.getFullYear();

    const todayString = `${todayYear}-${todayMonth}-${todayDay}`;

    let news = [];

    $('tr.js-event-item').each((i, elem) => {
      const time = $(elem).attr('data-event-datetime')?.split(' ')[1];
      const impact = $(elem).find('.sentiment').attr('data-img_key') || '';
      const country = $(elem).find('.flagCur img').attr('title');
      const title = $(elem).find('.event').text().trim();

      const impactLevel = impact.includes('bull3') ? '🌋 Cao' :
                          impact.includes('bull2') ? '⚠️ Trung bình' :
                          '';

      if (impactLevel) {
        news.push({
          time, country, title, impact: impactLevel
        });
      }
    });

    if (news.length === 0) {
      return "📭 Hôm nay không có tin vĩ mô đáng chú ý.";
    }

    let message = "🕖 *Lịch tin vĩ mô hôm nay*:\n\n";
    news.forEach(item => {
      message += `⏰ ${item.time} — ${item.title} (${item.country})\n`;
      message += `• Mức ảnh hưởng: ${item.impact}\n\n`;
    });

    return message.trim();
  } catch (err) {
    console.error("❌ Lỗi lấy lịch kinh tế:", err.message);
    return null;
  }
}

module.exports = { fetchMacroNews };
