const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const config = require('./config.json');
const { fetchMarketData } = require('./lib/marketData');
const { fetchMacroNews, sendMarketNews } = require('./lib/marketNews');
require('dotenv').config();
const cron = require('node-cron');

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
let botStatus = "ON";

// GỬI TIN NHẮN — GỘP TRỰC TIẾP VÀO ĐÂY
async function sendMessage(recipientId, messageText) {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message: { text: messageText },
      }
    );
    console.log(`✅ Đã gửi tin nhắn đến ${recipientId}`);
  } catch (error) {
    console.error("❌ Lỗi khi gửi tin nhắn:", error.response?.data || error.message);
  }
}

// Lấy tên người dùng từ config
function getDisplayName(uid) {
  return config.users[uid] || "bạn";
}

// Webhook xác minh
app.get('/webhook', (req, res) => {
  if (
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === VERIFY_TOKEN
  ) {
    console.log("✅ Webhook xác minh thành công.");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("❌ Xác minh thất bại.");
    res.sendStatus(403);
  }
});

// Xử lý tin nhắn người dùng
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry) {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;
      const message = webhook_event.message?.text?.toLowerCase();

      if (!message) continue;

      if (message.includes("bật") || message.includes("on")) {
        if (botStatus === "ON") {
          sendMessage(sender_psid, "✅ Bot đang BẬT sẵn rồi.");
        } else {
          botStatus = "ON";
          sendMessage(sender_psid, "🔛 Bot đã được BẬT.");
        }
      } else if (message.includes("tắt") || message.includes("off")) {
        if (botStatus === "OFF") {
          sendMessage(sender_psid, "🛑 Bot đang TẮT sẵn rồi.");
        } else {
          botStatus = "OFF";
          sendMessage(sender_psid, "🔴 Bot đã được TẮT.");
        }
      } else if (message.includes("trạng thái")) {
        sendMessage(sender_psid, `📍 Trạng thái hiện tại: ${botStatus}`);
      } else if (message.includes("lịch hôm nay")) {
        sendMessage(sender_psid, "📅 Đây là lịch hôm nay... (đang cập nhật)");
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Ping từ UptimeRobot
app.get("/", (req, res) => {
  res.status(200).send("Bot is running.");
});

// Bản tin 06:00 sáng — Thị trường crypto từ CoinMarketCap
cron.schedule('0 6 * * *', async () => {
  if (botStatus !== "ON") return;

  console.log("🕕 Bắt đầu gửi bản tin 06:00 sáng");

  const data = await fetchMarketData();
  if (!data) return;

  let message = `${data.greeting}\n\n`;
  data.topGainers.forEach((coin, index) => {
    message += `🔥 Top ${index + 1}: ${coin.name} (${coin.symbol})\n`;
    message += `• Giá: ${coin.price} USD\n`;
    message += `• Tăng: ${coin.change}%\n`;
    message += `• Vốn hóa: ${coin.marketCap} USD\n\n`;
  });

  message += `📈 Xu hướng: ${data.trend}`;

  await sendMessage("24110537551888914", message);
}, {
  timezone: "Asia/Ho_Chi_Minh"
});

// Gửi lịch tin vĩ mô lúc 07:00 sáng mỗi ngày (theo giờ Việt Nam)
cron.schedule('* * * * *', async () => {
  console.log('[Cron] Gửi lịch tin vĩ mô 07:00');
  await sendMarketNews();
}, {
  timezone: 'Asia/Ho_Chi_Minh'
});

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bot khởi chạy tại port ${PORT}`);
});