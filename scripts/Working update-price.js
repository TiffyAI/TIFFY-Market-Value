const fs = require('fs');
const fetch = require('node-fetch');

async function getBNBPriceUSD() {
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
  const data = await res.json();
  return data.binancecoin.usd;
}

async function updatePrice() {
  try {
    // Manually calculated based on your latest liquidity info
    const priceInWBNB = 0.01648;
    const bnbUsd = await getBNBPriceUSD();
    const priceInUSD = priceInWBNB * bnbUsd;

    const priceData = {
      tiffyToWBNB: priceInWBNB.toFixed(10),
      tiffyToUSD: priceInUSD.toFixed(6),
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync('price.json', JSON.stringify(priceData, null, 2));
    console.log("✅ price.json updated with manual data:", priceData);
  } catch (err) {
    console.error("❌ Error updating price.json:", err);
    process.exit(1);
  }
}

updatePrice();
