const axios = require("axios");

async function fetchMarketData() {
  try {
    const symbols = ['bitcoin', 'ethereum', 'solana'];
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${symbols.join(',')}&vs_currencies=usd,vnd&include_24hr_change=true`;

    const res = await axios.get(url);
    const data = res.data;

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
  } catch (error) {
    console.error("Lỗi fetchMarketData:", error.message);
    return null;
  }
}

module.exports = { fetchMarketData };
