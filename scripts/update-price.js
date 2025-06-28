const fs = require('fs');
const fetch = require('node-fetch');
const Web3 = require('web3');

const web3 = new Web3('https://bsc-dataseed.binance.org/');
const pairAddress = '0x1305302Ef3929DD9252b051077e4ca182107F00D';

const pairABI = [
  {
    constant: true,
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

const contract = new web3.eth.Contract(pairABI, pairAddress);

async function getBNBPriceUSD() {
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd');
  const data = await res.json();
  return data.binancecoin.usd;
}

async function updatePrice() {
  try {
    const slot0 = await contract.methods.slot0().call();
    const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96);
    const priceInWBNB = Number((sqrtPriceX96 * sqrtPriceX96 * BigInt(1e18)) / (BigInt(2) ** BigInt(192))) / 1e18;

    const bnbUsd = await getBNBPriceUSD();
    const priceUSD = priceInWBNB * bnbUsd;

    const result = {
      symbol: "TIFFY",
      priceUSD: Number(priceUSD.toFixed(6)),
      priceWBNB: Number(priceInWBNB.toFixed(10)),
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync("price.json", JSON.stringify(result, null, 2));
    console.log("✅ price.json updated:", result);
  } catch (err) {
    console.error("❌ Failed to fetch price:", err);
    process.exit(1);
  }
}

updatePrice();
