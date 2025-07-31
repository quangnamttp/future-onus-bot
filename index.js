const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const config = require('./config.json');
require('dotenv').config();

const { fetchMarketData } = require('./lib/marketData');
const { fetchMarketData } = require('./lib/marketData');
const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

let botStatus = "ON";

// Gửi tin nhắn
async function sendMessage(uid, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: uid },
        message: { text: message }
      }
    );
  } catch (err) {
    console.error('Gửi tin nhắn lỗi:', err.response?.data || err.message);
  }
}

// Công cụ lấy tên xưng hô
function getDisplayName(uid) {
  return config.users[uid] || "bạn";
}

// Webhook xác minh
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VERIFY_TOKEN) {
    console.log("Webhook xác minh thành công.");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Xác minh thất bại.");
    res.sendStatus(403);
  }
});

// Xử lý tin nhắn đến
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
        // Sau này bạn thêm logic crawl lịch vào đây
        sendMessage(sender_psid, "📅 Đây là lịch hôm nay...");
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

// Bản tin 06:00 sáng
cron.schedule('0 6 * * *', async () => {
  if (botStatus !== "ON") return;

  const data = await fetchMarketData();
  if (!data) return;

  let message = `${data.greeting}\n\n`;

  data.prices.forEach(p => {
    message += `💰 ${p.name}: ${p.usd} USD | ${p.vnd} VND (${p.change}% 24h)\n`;
  });

  message += `\n🔁 Funding:\n`;
  Object.entries(data.funding).forEach(([coin, val]) => {
    message += `• ${coin}: ${val}\n`;
  });

  message += `\n📊 Volume: ${data.volume}\n📈 Xu hướng: ${data.trend}`;

  sendMessage("24110537551888914", message);
}, { timezone: "Asia/Ho_Chi_Minh" });

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Bot khởi chạy tại port ${PORT}`);
});
