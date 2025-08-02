const axios = require('axios');
const config = require('../config.json');
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Hàm định dạng số VND
function formatNumberVND(number) {
  return Number(number).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

// Hàm lấy thời gian Việt Nam
function getVietnamTime() {
  const date = new Date();
  const vnTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  return vnTime.toLocaleString('vi-VN');
}

// Gửi tin nhắn Messenger trực tiếp
async function sendMessengerMessage(recipientId, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: { text: message }
      }
    );
  } catch (err) {
    console.error('❌ Lỗi gửi tin nhắn:', err.response?.data || err.message);
  }
}

// Lấy tín hiệu từ Goonus
async function fetchSignalsFromGoonus() {
  try {
    const res = await axios.get('https://goonus.io/api/signal');
    return res.data || [];
  } catch (err) {
    console.error('❌ Lỗi lấy tín hiệu:', err.message);
    return [];
  }
}

// Tách tin nhắn nếu dài quá 2000 ký tự
function splitMessageByLength(message, maxLength = 2000) {
  const parts = [];
  let current = '';

  message.split('\n\n').forEach(block => {
    if ((current + '\n\n' + block).length > maxLength) {
      parts.push(current.trim());
      current = block;
    } else {
      current += '\n\n' + block;
    }
  });

  if (current) parts.push(current.trim());
  return parts;
}

// Gửi tín hiệu
async function sendTradeSignals(signals) {
  const strongSignals = signals.filter(s => s.strength >= 70).slice(0, 5);
  const referenceSignals = signals.filter(s => s.strength >= 60 && s.strength < 70).slice(0, 2);

  const selectedSignals = [...strongSignals, ...referenceSignals].slice(0, 5);

  if (selectedSignals.length === 0) {
    for (const userId of Object.keys(config.users)) {
      await sendMessengerMessage(userId, '⛔ Hiện tại không có tín hiệu nào đáng chú ý. Bot sẽ theo dõi tiếp và báo lại khi có cơ hội tốt.');
    }
    return;
  }

  const messageChunks = [];
  let currentMessage = '';

  for (const signal of selectedSignals) {
    const msg =
`📈 ${signal.token} – ${signal.side.toUpperCase()} (${formatNumberVND(signal.entry)})

🔹 ${signal.type} | ${signal.orderType}
💰 Entry: ${formatNumberVND(signal.entry)}
🎯 TP: ${formatNumberVND(signal.tp)} | 🛡️ SL: ${formatNumberVND(signal.sl)}
📊 Độ mạnh: ${signal.strength}%
📌 Lý do: ${signal.reason}
🕒 ${getVietnamTime()}`;

    if ((currentMessage + '\n\n' + msg).length > 2000) {
      messageChunks.push(currentMessage.trim());
      currentMessage = msg;
    } else {
      currentMessage += '\n\n' + msg;
    }
  }

  if (currentMessage) {
    messageChunks.push(currentMessage.trim());
  }

  for (const userId of Object.keys(config.users)) {
    for (const chunk of messageChunks) {
      await sendMessengerMessage(userId, chunk);
    }
  }
}

module.exports = { fetchTradeSignals };
