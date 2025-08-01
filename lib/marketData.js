const axios = require('axios');
const COINMARKETCAP_API_KEY = '9e8e2539-b207-4c92-8210-cc5868a2c1c0';

const COIN_SYMBOLS = ['BTC', 'ETH', 'SOL'];

function formatNumber(num) {
  return Number(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

async function fetchMarketData() {
  try {
    const res = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY
        },
        params: {
          symbol: COIN_SYMBOLS.join(',')
        }
      }
    );

    const data = res.data.data;

    const prices = COIN_SYMBOLS.map(symbol => {
      const coin = data[symbol];
      return {
        name: symbol,
        usd: formatNumber(coin.quote.USD.price),
        change: coin.quote.USD.percent_change_24h.toFixed(2),
        marketCap: formatNumber(coin.quote.USD.market_cap),
        volume: formatNumber(coin.quote.USD.volume_24h),
        supply: formatNumber(coin.circulating_supply)
      };
    });

    return {
      greeting: "🌅 Chào buổi sáng!\nDưới đây là bản tin thị trường crypto đầu ngày:",
      prices
    };
  } catch (error) {
    console.error("❌ Lỗi fetchMarketData:", error.message);
    return null;
  }
}

module.exports = { fetchMarketData };
