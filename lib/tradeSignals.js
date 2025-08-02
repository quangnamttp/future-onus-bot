const axios = require('axios');
const config = require('../config.json');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Hàm gửi tin nhắn trực tiếp qua Messenger
async function sendMessage(recipientId, messageText) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        messaging_type: 'RESPONSE',
        recipient: { id: recipientId },
        message: { text: messageText }
      }
    );
  } catch (error) {
    console.error(`❌ Lỗi gửi tin nhắn đến ${recipientId}:`, error.response?.data || error.message);
  }
}

// Hàm định dạng VND
function formatNumberVND(number) {
  return Number(number).toLocaleString('vi-VN') + ' VND';
}

// Giờ Việt Nam
function getVietnamTime() {
  const date = new Date();
  date.setHours(date.getHours() + 7);
  return date.toLocaleString('vi-VN', { hour12: false });
}

// Phân loại độ mạnh
function classifyStrength(score) {
  if (score >= 80) return 'Rất mạnh';
  if (score >= 70) return 'Mạnh';
  if (score >= 60) return 'Tiêu chuẩn';
  return 'Yếu';
}

// Định dạng loại lệnh
function formatOrderType(signal) {
  const type = signal.type.toLowerCase() === 'scalp' ? 'Scalping' : 'Swing';
  const method = signal.orderType.toLowerCase() === 'market' ? 'Market' : 'Limit';
  return `${type} | ${method}`;
}

// Hàm chính: lấy & gửi tín hiệu
async function fetchAndSendTradeSignals() {
  try {
    const res = await axios.get('https://goonus.io/api/signal/v1/futures/signal');
    const allSignals = res.data.data;

    const strongSignals = allSignals.filter(sig => sig.confidence >= 70);
    const referenceSignals = allSignals
      .filter(sig => sig.confidence >= 60 && sig.confidence < 70)
      .slice(0, 2);

    const selectedSignals = [...strongSignals, ...referenceSignals].slice(0, 5);

    for (const signal of selectedSignals) {
      const strength = classifyStrength(signal.confidence);
      const typeLabel = signal.side.toLowerCase() === 'buy' ? 'MUA' : 'BÁN';
      const title = `${signal.symbol} – ${typeLabel} (${formatNumberVND(signal.entry)})`;

      const message = `${title}\n\n🔹 ${formatOrderType(signal)}\n💰 Entry: ${formatNumberVND(signal.entry)}\n🎯 TP: ${formatNumberVND(signal.tp)} | 🛡️ SL: ${formatNumberVND(signal.sl)}\n📊 Độ mạnh: ${strength} (${signal.confidence}%)\n📌 Lý do: ${signal.reason}\n🕒 ${getVietnamTime()}`;

      for (const uid of Object.keys(config.users)) {
        await sendMessage(uid, message);
      }
    }
  } catch (err) {
    console.error('❌ Lỗi khi xử lý tín hiệu:', err.message);
  }
}

module.exports = { fetchAndSendTradeSignals };
