const axios = require('axios');
const config = require('../config.json');

// Đặt tên rõ ràng để tránh trùng với index.js
const sendMessageToUser = async (recipientId, messageText) => {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${config.PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
      }
    );
    console.log(`✅ Đã gửi tin nhắn đến UID ${recipientId}`);
  } catch (error) {
    console.error('❌ Lỗi khi gửi tin nhắn:', error.response?.data || error.message);
  }
};

module.exports = { sendMessageToUser };