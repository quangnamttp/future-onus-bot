const axios = require('axios');
const axiosRetry = require('axios-retry');
axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

const API_KEY = '9e8e2539-b207-4c92-8210-cc5868a2c1c0';

let cachedData = null;

function processData(data) {
  const symbols = ['BTC', 'ETH', 'SOL'];
  const result = symbols.map(symbol => {
    const coin = data[symbol];
    return {
      name: symbol,
      usd: coin.price_usd.toLocaleString(),
      vnd: (coin.price_usd * 24000).toLocaleString(), // Ước tính VND từ USD
      change: coin.percent_change_24h.toFixed(2)
    };
  });

  const funding = {
    BTC: "+0.0120%",
    ETH: "-0.0054%",
    SOL: "+0.0198%"
  };
  const volume = "Tăng nhẹ trong 24h qua";
  const trend = "Thị trường có xu hướng hồi phục";

  return {
    greeting: "☀️ Chào buổi sáng!\nDưới đây là bản tin thị trường đầu ngày:",
    prices: result,
    funding,
    volume,
    trend
  };
}

async function fetchMarketData() {
  const symbols = ['BTC', 'ETH', 'SOL'];
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols.join(',')}`;

  try {
    const res = await axios.get(url, {
      headers: {
        'X-CMC_PRO_API_KEY': API_KEY
      }
    });

    const raw = res.data.data;
    const data = {};

    symbols.forEach(symbol => {
      const info = raw[symbol].quote.USD;
      data[symbol] = {
        price_usd: info.price,
        percent_change_24h: info.percent_change_24h
      };
    });

    cachedData = data;
    return processData(data);

  } catch (error) {
    console.error("Lỗi fetchMarketData:", error.message);

    if (cachedData) {
      console.log("🕓 Gửi lại dữ liệu cũ do lỗi API");
      return processData(cachedData);
    }

    return null;
  }
}

module.exports = { fetchMarketData };
