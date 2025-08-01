const axios = require('axios');
const { PAGE_RECIPIENT_ID } = require('../config.json');
const sendMessage = require('../utils/sendMessage');
require('dotenv').config();

async function fetchEconomicCalendar() {
  try {
    const response = await axios.get('https://tradingeconomics.com/calendar', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const html = response.data;
    const today = new Date().toISOString().split('T')[0];

    const regex = new RegExp(
      `<tr[^>]*data-event-datetime="${today}[^"]*"[^>]*>(.*?)</tr>`,
      'gs'
    );

    const events = [...html.matchAll(regex)];

    let result = `🗓️ *Lịch tin vĩ mô ngày ${today}*\n`;

    for (const event of events) {
      const row = event[1];

      const impactMatch = row.match(/<td class="impact.*?title="(.*?)"/);
      const impact = impactMatch ? impactMatch[1].trim() : '';

      if (!impact.includes('High') && !impact.includes('Very High')) continue;

      const timeMatch = row.match(/<td class="calendar__time">(.*?)<\/td>/);
      const countryMatch = row.match(/title="(.*?) Flag"/);
      const nameMatch = row.match(/<td class="calendar__event">(.*?)<\/td>/);
      const actualMatch = row.match(/<td class="calendar__actual">(.*?)<\/td>/);
      const forecastMatch = row.match(/<td class="calendar__forecast">(.*?)<\/td>/);
      const previousMatch = row.match(/<td class="calendar__previous">(.*?)<\/td>/);

      const time = timeMatch ? timeMatch[1].trim() : '';
      const country = countryMatch ? countryMatch[1].trim() : '';
      const name = nameMatch ? nameMatch[1].trim().replace(/<.*?>/g, '') : '';
      const actual = actualMatch ? actualMatch[1].trim() : '-';
      const forecast = forecastMatch ? forecastMatch[1].trim() : '-';
      const previous = previousMatch ? previousMatch[1].trim() : '-';

      result += `\n📌 *${country}* – ${time}\n`;
      result += `• ${name} (${impact})\n`;
      result += `• Actual: ${actual} | Forecast: ${forecast} | Previous: ${previous}\n`;
      result += `• Tác động đến thị trường crypto: ${generateImpactComment(name, actual, forecast)}\n`;
    }

    if (result.trim() === `🗓️ *Lịch tin vĩ mô ngày ${today}*`) {
      result += '\nKhông có tin nào ảnh hưởng cao hoặc rất cao hôm nay.';
    }

    await splitAndSend(result);
  } catch (error) {
    console.error('Lỗi khi lấy lịch tin vĩ mô:', error);
  }
}

function generateImpactComment(name, actual, forecast) {
  if (actual === '-' || forecast === '-') return 'Không xác định.';

  const actualNum = parseFloat(actual.replace(/[^0-9.\-]/g, ''));
  const forecastNum = parseFloat(forecast.replace(/[^0-9.\-]/g, ''));

  if (isNaN(actualNum) || isNaN(forecastNum)) return 'Không xác định.';

  if (name.toLowerCase().includes('interest rate')) {
    return actualNum > forecastNum
      ? 'Lãi suất tăng → tiêu cực với crypto 📉'
      : 'Lãi suất giảm → tích cực với crypto 📈';
  }

  if (name.toLowerCase().includes('cpi') || name.toLowerCase().includes('inflation')) {
    return actualNum > forecastNum
      ? 'Lạm phát cao hơn dự báo → tiêu cực với crypto 📉'
      : 'Lạm phát thấp hơn dự báo → tích cực với crypto 📈';
  }

  if (name.toLowerCase().includes('gdp')) {
    return actualNum > forecastNum
      ? 'Tăng trưởng tốt hơn dự báo → tích cực với crypto 📈'
      : 'Tăng trưởng kém hơn dự báo → tiêu cực với crypto 📉';
  }

  return actualNum > forecastNum
    ? 'Số liệu cao hơn dự báo → có thể tác động tiêu cực 📉'
    : 'Số liệu thấp hơn dự báo → có thể tích cực với crypto 📈';
}

// Tự động chia nhỏ nếu tin nhắn dài quá 2000 ký tự
async function splitAndSend(fullText) {
  const maxLength = 1990;
  let parts = [];

  for (let i = 0; i < fullText.length; i += maxLength) {
    parts.push(fullText.substring(i, i + maxLength));
  }

  for (const part of parts) {
    await sendMessage(PAGE_RECIPIENT_ID, { text: part });
  }
}

module.exports = fetchEconomicCalendar;
