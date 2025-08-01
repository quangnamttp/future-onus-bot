const axios = require('axios');
const moment = require('moment-timezone');
const { USER_ID } = require('../config');
const { callSendAPI } = require('../index');

const calendarURL = 'https://www.investing.com/economic-calendar/Service/getCalendarFilteredData';

function translateImpact(impact) {
  if (impact >= 3) return 'Rất cao';
  if (impact === 2) return 'Cao';
  return 'Trung bình';
}

function translateEventName(name) {
  const map = {
    'CPI': 'Chỉ số giá tiêu dùng (CPI)',
    'Fed Interest Rate Decision': 'Quyết định lãi suất của Fed',
    'ECB Interest Rate Decision': 'Lãi suất ECB',
    'GDP': 'Tăng trưởng GDP',
    'Unemployment Rate': 'Tỷ lệ thất nghiệp',
    'Retail Sales': 'Doanh số bán lẻ',
    'Interest Rate Decision': 'Quyết định lãi suất',
    'Initial Jobless Claims': 'Đơn xin trợ cấp thất nghiệp',
    'Core CPI': 'CPI lõi',
    'PPI': 'Chỉ số giá sản xuất (PPI)',
    'Nonfarm Payrolls': 'Bảng lương phi nông nghiệp',
  };

  for (const key in map) {
    if (name.includes(key)) return map[key];
  }
  return name;
}

function analyzeEvent(actual, forecast) {
  if (!actual || !forecast) return 'Không đủ dữ liệu để phân tích.';
  const a = parseFloat(actual);
  const f = parseFloat(forecast);
  if (isNaN(a) || isNaN(f)) return 'Không đủ dữ liệu để phân tích.';

  if (a < f) return '→ Dữ liệu tốt hơn dự báo, có thể hỗ trợ thị trường.';
  if (a > f) return '→ Dữ liệu xấu hơn dự báo, thị trường có thể điều chỉnh.';
  return '→ Dữ liệu đúng dự báo, phản ứng thị trường trung lập.';
}

function getWeekdayVietnamese(dateStr) {
  const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const day = moment(dateStr).tz('Asia/Ho_Chi_Minh').day();
  return weekdays[day];
}

async function fetchMarketNews() {
  const now = moment().tz('Asia/Ho_Chi_Minh');
  const dateStr = now.format('DD/MM/YYYY');
  const weekday = getWeekdayVietnamese(now);

  const form = new URLSearchParams();
  form.append('country[]', '25'); // Mỹ
  form.append('country[]', '72'); // EU
  form.append('country[]', '6');  // Trung Quốc
  form.append('country[]', '5');  // Nhật Bản
  form.append('country[]', '35'); // Anh
  form.append('dateFrom', dateStr);
  form.append('dateTo', dateStr);
  form.append('timezone', '55'); // GMT+7
  form.append('timeZone', '55');
  form.append('importance[]', '2'); // Cao
  form.append('importance[]', '3'); // Rất cao

  try {
    const res = await axios.post(calendarURL, form.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const eventsRaw = res.data?.data || '';
    const eventMatches = [...eventsRaw.matchAll(/data-event-datetime.*?>(.*?)<\/td>.*?flag.*?title="(.*?)".*?data-event-name.*?>(.*?)<\/a>.*?data-event-impact="(\d)".*?event-actual.*?>(.*?)<\/td>.*?event-forecast.*?>(.*?)<\/td>.*?event-previous.*?>(.*?)<\/td>/gs)];

    const events = [];

    for (const match of eventMatches) {
      const [, timeRaw, country, nameRaw, impact, actualRaw, forecastRaw, previousRaw] = match;

      const time = moment.tz(`${dateStr} ${timeRaw}`, 'DD/MM/YYYY HH:mm', 'Asia/Ho_Chi_Minh').format('HH:mm');
      const name = translateEventName(nameRaw.trim());
      const actual = actualRaw.trim() || '—';
      const forecast = forecastRaw.trim() || '—';
      const previous = previousRaw.trim() || '—';
      const analysis = analyzeEvent(actual, forecast);
      const impactLabel = translateImpact(parseInt(impact));

      events.push(
        `🇨🇭 *${country}* | 🕒 *${time}*\n` +
        `• *Chỉ số:* ${name}\n` +
        `• *Ảnh hưởng:* ${impactLabel}\n` +
        `• *Thực tế:* ${actual} | *Dự báo:* ${forecast} | *Trước đó:* ${previous}\n` +
        `${analysis}\n` +
        `────────────────────`
      );
    }

    if (events.length === 0) {
      await callSendAPI(USER_ID, `📅 *${weekday}, ngày ${now.format('DD/MM/YYYY')}*\nHôm nay không có sự kiện vĩ mô quan trọng.`);
      return;
    }

    const header = `📅 *${weekday}, ngày ${now.format('DD/MM/YYYY')}*\nThị trường hôm nay có các sự kiện kinh tế như sau:\n\n`;
    const fullMessage = header + events.join('\n');

    // Tách nếu dài
    const parts = fullMessage.match(/.{1,1900}(\n|$)/gs);
    for (const part of parts) {
      await callSendAPI(USER_ID, part.trim());
    }

  } catch (err) {
    console.error('[MarketNews Error]', err.message);
  }
}

module.exports = { fetchMarketNews };
