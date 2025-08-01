const axios = require('axios');
const config = require('../config.json');

const sendMessage = async (userId, message) => {
  try {
    await axios.post(`https://graph.facebook.com/v17.0/me/messages?access_token=${config.PAGE_ACCESS_TOKEN}`, {
      recipient: { id: userId },
      messaging_type: 'MESSAGE_TAG',
      tag: 'ACCOUNT_UPDATE',
      message: { text: message }
    });
  } catch (error) {
    console.error('❌ Gửi tin nhắn lỗi:', error.response?.data || error.message);
  }
};

module.exports = sendMessage;
