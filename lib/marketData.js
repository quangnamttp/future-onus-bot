const axios = require('axios');

const BINANCE_BASE_URL = 'https://api.binance.com';
const BINANCE_FAPI_URL = 'https://fapi.binance.com';
const COINMARKETCAP_API_KEY = '9e8e2539-b207-4c92-8210-cc5868a2c1c0';

const COIN_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

async function fetchBinancePrices() {
  const result = {};
  for (const symbol of COIN_SYMBOLS) {
    const res = await axios.get(`${BINANCE_BASE_URL}/api/v3/ticker/price?symbol=${symbol}`);
    result[symbol] = parseFloat(res.data.price);
  }
  return result;
}

async function fetchBinanceFundingRates() {
  const result = {};
  for (const symbol of COIN_SYMBOLS) {
    const res = await axios.get(`${BINANCE_FAPI_URL}/fapi/v1/fundingRate`, {
      params: {
        symbol: symbol,
        limit: 1
      }
    });
    result[symbol] = `${(parseFloat(res.data[0].fundingRate) * 100).toFixed(4)}%`;
  }
  return result;
}

async function fetchMarketCaps() {
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=BTC,ETH,SOL`;
  const res = await axios.get(url, {
    headers: {
      'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY
    }
  });

  const data = res.data.data;
  return {
    BTCUSDT: data.BTC.quote.USD.market_cap.toLocaleString(),
    ETHUSDT: data.ETH.quote.USD.market_cap.toLocaleString(),
    SOLUSDT: data.SOL.quote.USD.market_cap.toLocaleString()
  };
}

function formatNumber(num) {
  return Number(num).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function fetchMarketData() {
  try {
    const [prices, fundings, marketCaps] = await Promise.all([
      fetchBinancePrices(),
      fetchBinanceFundingRates(),
      fetchMarketCaps()
    ]);

    console.log("✅ Giá:", prices);
    console.log("✅ Funding:", fundings);
    console.log("✅ MarketCap:", marketCaps);

    return {
      greeting: "☀️ Chào buổi sáng!\nDưới đây là bản tin thị trường đầu ngày:",
      prices: [
        {
          name: 'BTC',
          usd: formatNumber(prices.BTCUSDT),
          funding: fundings.BTCUSDT,
          marketCap: marketCaps.BTCUSDT
        },
        {
          name: 'ETH',
          usd: formatNumber(prices.ETHUSDT),
          funding: fundings.ETHUSDT,
          marketCap: marketCaps.ETHUSDT
        },
        {
          name: 'SOL',
          usd: formatNumber(prices.SOLUSDT),
          funding: fundings.SOLUSDT,
          marketCap: marketCaps.SOLUSDT
        }
      ],
      volume: "Tăng nhẹ trong 24h qua",
      trend: "Thị trường có xu hướng hồi phục"
    };
  } catch (error) {
    console.error("❌ Lỗi fetchMarketData:", error.response?.data || error.message);
    return null;
  }
}

module.exports = { fetchMarketData };
