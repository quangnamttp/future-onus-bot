const axios = require('axios');

const COINMARKETCAP_API_KEY = '9e8e2539-b207-4c92-8210-cc5868a2c1c0';

function formatNumber(num) {
  return Number(num).toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

async function fetchMarketData() {
  try {
    const res = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
        },
        params: {
          start: 1,
          limit: 100,
          convert: 'USD',
        },
      }
    );

    const coins = res.data.data;
    const topGainers = coins
      .filter((coin) => coin.quote.USD.percent_change_24h !== null)
      .sort((a, b) => b.quote.USD.percent_change_24h - a.quote.USD.percent_change_24h)
      .slice(0, 3)
      .map((coin) => ({
        name: coin.name,
        symbol: coin.symbol,
        price: formatNumber(coin.quote.USD.price),
        change: coin.quote.USD.percent_change_24h.toFixed(2),
        marketCap: formatNumber(coin.quote.USD.market_cap),
      }));

    return {
      greeting: "☀️ Chào buổi sáng!\nDưới đây là 3 đồng coin tăng mạnh nhất 24h qua:",
      topGainers,
      trend: "Thị trường đang có tín hiệu tích cực!",
    };
  } catch (error) {
    console.error("❌ Lỗi fetchMarketData:", error.message);
    return null;
  }
}

module.exports = { fetchMarketData };
