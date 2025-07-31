const axios = require('axios');
const axiosRetry = require('axios-retry');

// Tự động retry nếu lỗi tạm thời (403, 500, timeout...)
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return error.response?.status === 403 || error.response?.status === 500 || axiosRetry.isNetworkError(error);
  }
});

let cachedData = null;

function processData(data) {
  const symbols = ['bitcoin', 'ethereum', 'solana'];

  const result = symbols.map(sym => {
    const coin = data[sym];
    return {
      name: sym.toUpperCase(),
      usd: coin.usd.toLocaleString(),
      vnd: coin.vnd.toLocaleString(),
      change: coin.usd_24h_change.toFixed(2)
    };
  });

  // Giả lập funding rate & volume cho đến khi crawl ONUS thật
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
  const symbols = ['bitcoin', 'ethereum', 'solana'];
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbols.join(',')}&vs_currencies=usd,vnd&include_24hr_change=true`;

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/117.0.0.0 Safari/537.36'
      }
    });

    const data = res.data;
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
