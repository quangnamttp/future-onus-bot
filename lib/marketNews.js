const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const { sendMessage } = require('../index'); // Lưu ý: index.js phải export { sendMessage }

const USER_ID = '24110537551888914';

async function fetchMacroNews() {
  try {
    const response = await axios.get('https://vn.investing.com/economic-calendar/', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      },
    });

    const $ = cheerio.load(response.data);
    const today = moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY');
    const events = [];

    $('#economicCalendarData tr.js-event-item').each((_, el) => {
      const date = $(el).attr('event_timestamp');
      if (!date) return;

      const eventTime = moment.unix(date).tz('Asia/Ho_Chi_Minh');
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
      else return; // Bỏ qua nếu ảnh hưởng trung bình trở xuống

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
  } catch (error) {
    console.error('Lỗi khi lấy lịch tin:', error.message);
  }
}

function generateAnalysis(name, actual, forecast, previous) {
  if (!actual || !forecast || isNaN(actual) || isNaN(forecast)) return 'Chưa đủ dữ liệu để phân tích.';

  const actualNum = parseFloat(actual.replace(/[^0-9.-]/g, ''));
  const forecastNum = parseFloat(forecast.replace(/[^0-9.-]/g, ''));

  if (actualNum > forecastNum) {
    return `Dữ liệu tốt hơn dự báo → Có thể tích cực cho thị trường crypto 📈`;
  } else if (actualNum < forecastNum) {
    return `Dữ liệu xấu hơn dự báo → Có thể tiêu cực cho crypto 📉`;
  } else {
    return `Dữ liệu đúng như dự báo → Thị trường có thể ít biến động 📊`;
  }
}

module.exports = fetchMacroNews;
