const Web3 = require('web3');
const fetch = require('node-fetch').default;
const fs = require('fs');
const path = require('path');

// --- Set up Web3 and PancakeSwap Pair
const web3 = new Web3('https://bsc-dataseed.binance.org/');
const pairAddress = '0x1305302Ef3929DD9252b051077e4ca182107F00D';

const pairABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "slot0",
    "outputs": [
      { "name": "sqrtPriceX96", "type": "uint160" },
      { "name": "tick", "type": "int24" },
      { "name": "observationIndex", "type": "uint16" },
      { "name": "observationCardinality", "type": "uint16" },
      { "name": "observationCardinalityNext", "type": "uint16" },
      { "name": "feeProtocol", "type": "uint8" },
      { "name": "unlocked", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const contract = new web3.eth.Contract(pairABI, pairAddress);

// --- Get BNB price in USD
async function getBNBPriceUSD() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
    const data = await res.json();
    return data.binancecoin.usd;
  } catch (error) {
    console.error('Error fetching BNB price:', error);
    return 0;
  }
}

// --- Main price calculation
async function updatePriceJSON() {
  try {
    const slot0 = await contract.methods.slot0().call();
    const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96);

    const priceX96 = sqrtPriceX96;
    const numerator = priceX96 * priceX96;
    const denominator = BigInt(2) ** BigInt(192);
    const priceInWBNB = Number((numerator * BigInt(1e18)) / denominator) / 1e18;

    const bnbUsd = await getBNBPriceUSD();
    const priceInUSD = priceInWBNB * bnbUsd;

    const output = {
      updated: new Date().toISOString(),
      priceUSD: parseFloat(priceInUSD.toFixed(6)),
      priceWBNB: parseFloat(priceInWBNB.toFixed(10))
    };

    const filePath = path.join(__dirname, '..', 'price.json');
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    console.log('✅ price.json updated:', output);
  } catch (error) {
    console.error('❌ Failed to update price.json:', error);
    process.exit(1);
  }
}

updatePriceJSON();
