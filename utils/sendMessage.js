// utils/sendMessage.js

const axios = require('axios');
const config = require('../config.json');

const sendMessage = async (recipientId, message) => {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${config.PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: { text: message },
      }
    );
  } catch (error) {
    console.error('Lỗi khi gửi tin nhắn:', error.response?.data || error.message);
  }
};

module.exports = sendMessage;
