const axios = require('axios');
const { sendMessage } = require('../utils/sendMessage'); ✅
const moment = require('moment-timezone');

const fetchEconomicCalendar = async () => {
  try {
    const response = await axios.get('https://economic-calendar-api.vercel.app/api/today?impact=high');
    return response.data || [];
  } catch (error) {
    console.error('Lỗi khi fetch lịch kinh tế:', error.message);
    return [];
  }
};

const formatEventMessage = (event) => {
  const countryFlag = getCountryFlag(event.country);
  const time = event.time || '??:??';
  const impactSymbol = event.impact === 'Rất cao' ? '🔥 Rất cao' : '⚠️ Cao';

  let message = `━━━━━━━━━━━━━━\n`;
  message += `${countryFlag} ${time} – ${event.eventName}\n`;
  message += `💥 Mức ảnh hưởng: ${impactSymbol}\n`;

  if (event.actual || event.forecast || event.previous) {
    if (event.actual) message += `📉 Actual: ${event.actual}\n`;
    if (event.forecast) message += `📈 Forecast: ${event.forecast}\n`;
    if (event.previous) message += `📊 Previous: ${event.previous}\n`;
  }

  if (event.analysis) {
    message += `📌 ${event.analysis}`;
  }

  return message;
};

const getCountryFlag = (country) => {
  const map = {
    'Mỹ': '🇺🇸',
    'Anh': '🇬🇧',
    'Đức': '🇩🇪',
    'Pháp': '🇫🇷',
    'Canada': '🇨🇦',
    'Trung Quốc': '🇨🇳',
    'Nhật Bản': '🇯🇵',
    'Úc': '🇦🇺',
    'New Zealand': '🇳🇿',
    'Ý': '🇮🇹',
    'EU': '🇪🇺',
    'Hàn Quốc': '🇰🇷',
  };
  return map[country] || '🌐';
};

const sendEconomicNews = async () => {
  const events = await fetchEconomicCalendar();
  if (!events.length) return;

  const today = moment().tz('Asia/Ho_Chi_Minh');
  const dateStr = today.format('dddd, DD/MM/YYYY');
  let message = `📅 ${dateStr}\n📊 Lịch tin vĩ mô có ảnh hưởng đến thị trường crypto:\n`;

  const formattedEvents = events.map(formatEventMessage).join('\n');
  message += `\n${formattedEvents}`;

  // Gửi đến UID được phép
  await sendMessage('24110537551888914', message);
};

module.exports = { fetchMacroNews: sendEconomicNews };
