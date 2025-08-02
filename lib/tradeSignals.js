const axios = require('axios');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Danh sách UID cần gửi tín hiệu
const USER_IDS = [
  '24110537551888914' // Anh Trương
];

// Hàm gửi message qua Facebook Messenger
async function sendMessage(recipientId, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        messaging_type: 'UPDATE',
        recipient: { id: recipientId },
        message: { text: message }
      }
    );
  } catch (error) {
    console.error('Lỗi gửi message:', error.response?.data || error.message);
  }
}

// Chuyển số sang định dạng VND có dấu chấm
function formatNumberVND(number) {
  return Number(number).toLocaleString('vi-VN');
}

// Lấy thời gian Việt Nam
function getVietnamTime() {
  const date = new Date();
  date.setHours(date.getHours() + 7); // UTC+7
  const d = date.toISOString().slice(0, 16).replace('T', ' ').replace('-', '/').replace('-', '/');
  return d;
}

// Format tín hiệu theo mẫu
function formatSignal(signal) {
  const {
    token,
    type,        // BUY / SELL
    entry,
    tp,
    sl,
    strength,    // 0 - 100
    reason,
    orderType,   // Scalping / Swing
    priceType    // Market / Limit
  } = signal;

  let strengthLabel = '';
  if (strength >= 70) strengthLabel = `Mạnh (${strength}%)`;
  else if (strength >= 60) strengthLabel = `Tham khảo (${strength}%)`;
  else strengthLabel = `Yếu (${strength}%)`;

  const now = getVietnamTime();

  const action = type === 'BUY' ? 'MUA' : 'BÁN';
  const entryVND = formatNumberVND(entry);
  const tpVND = formatNumberVND(tp);
  const slVND = formatNumberVND(sl);

  return `**${token} – ${action} (${entryVND} VND)**\n` +
         `🔹 ${orderType} | ${priceType}\n` +
         `💰 Entry: ${entryVND} VND\n` +
         `🎯 TP: ${tpVND} | 🛡️ SL: ${slVND}\n` +
         `📊 Độ mạnh: ${strengthLabel}\n` +
         `📌 Lý do: ${reason}\n` +
         `🕒 ${now}\n`;
}

// Lọc và gửi tín hiệu
async function sendTradeSignals() {
  try {
    const res = await axios.get('https://api.goonus.io/signal');
    const allSignals = res.data?.data || [];

    // Loại bỏ tín hiệu không có entry hoặc thị trường sideway
    const validSignals = allSignals.filter(s =>
      s.entry > 0 && s.strength >= 60 && !s.reason.toLowerCase().includes('sideway')
    );

    // Ưu tiên tín hiệu mạnh trước
    const strongSignals = validSignals.filter(s => s.strength >= 70);
    const referenceSignals = validSignals
      .filter(s => s.strength >= 60 && s.strength < 70)
      .slice(0, 2); // giới hạn 1-2 lệnh tham khảo

    // Kết hợp tín hiệu cần gửi
    const selectedSignals = [...strongSignals, ...referenceSignals].slice(0, 5); // Tối đa 5 lệnh

    if (selectedSignals.length === 0) {
      console.log('Không có tín hiệu phù hợp.');
      return;
    }

    const messages = selectedSignals.map(formatSignal);
    const fullMessage = messages.join('\n');

    for (const uid of USER_IDS) {
      await sendMessage(uid, fullMessage);
    }

    console.log(`Đã gửi ${selectedSignals.length} tín hiệu lúc ${getVietnamTime()}`);
  } catch (error) {
    console.error('Lỗi lấy hoặc gửi tín hiệu:', error.message);
  }
}

module.exports = { sendTradeSignals };
