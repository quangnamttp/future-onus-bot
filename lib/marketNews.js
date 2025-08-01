const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment-timezone');

const USER_ID = '24110537551888914';

async function fetchMacroNews(sendMessage) {
  try {
    const response = await axios.get('https://vn.investing.com/economic-calendar/', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const $ = cheerio.load(response.data);
    const today = moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY');
    const events = [];

    $('#economicCalendarData tr.js-event-item').each((_, el) => {
      const timestamp = $(el).attr('event_timestamp');
      if (!timestamp) return;

      const eventTime = moment.unix(timestamp).tz('Asia/Ho_Chi_Minh');
      if (!eventTime.isSame(moment(), 'day')) return;

      const country = $(el).find('.flagCur').text().trim();
      const time = eventTime.format('HH:mm');
      const name = $(el).find('.event').text().trim();
      const impact = $(el).find('.sentiment > i').length;
      const actual = $(el).find('td[data-column=actual]').text().trim();
      const forecast = $(el).find('td[data-column=forecast]').text().trim();
      const previous = $(el).find('td[data-column=previous]').text().trim();

      let impactLabel = '';
      if (impact === 3) impactLabel = '💥 Rất cao';
      else if (impact === 2) impactLabel = '🔥 Cao';
      else return;

      const analysis = generateAnalysis(name, actual, forecast, previous);

      events.push(
        `📌 ${country} | ${time}\n` +
        `• Chỉ số: ${name}\n` +
        `• Ảnh hưởng: ${impactLabel}\n` +
        `• Actual: ${actual} | Forecast: ${forecast} | Previous: ${previous}\n` +
        `📊 ${analysis}\n`
      );
    });

    const header = `📅 *Lịch tin vĩ mô hôm nay* (${today})\n⚠️ Chỉ hiển thị tin có ảnh hưởng *Cao* và *Rất cao*\n\n`;
    const message = events.length > 0 ? header + events.join('\n') : header + 'Không có tin tức quan trọng hôm nay.';

    await sendMessage(USER_ID, message);
  } catch (err) {
    console.error('Lỗi lấy lịch tin:', err.message);
  }
}

function generateAnalysis(name, actual, forecast, previous) {
  if (!actual || !forecast || isNaN(actual) || isNaN(forecast)) return 'Chưa đủ dữ liệu để phân tích.';
  const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ''));
  const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ''));
  if (actualNum > forecastNum) return 'Dữ liệu tốt hơn dự báo → Tích cực cho crypto 📈';
  if (actualNum < forecastNum) return 'Dữ liệu xấu hơn dự báo → Tiêu cực cho crypto 📉';
  return 'Dữ liệu đúng như dự báo → Thị trường ít biến động 📊';
}

module.exports = fetchMacroNews;
