// scripts/update-price.js
const Web3 = require('web3');
const fs = require('fs');
const fetch = require('node-fetch');

// — your provider & pair
const web3 = new Web3('https://bsc-dataseed.binance.org/');
const pairAddress = '0x8D7ab303074e912c18cDAA037092faE9E2DF1E72';

// — define Tiffy’s address, lowercased
const TIFFY_TOKEN = '0xE488253DD6B4D31431142F1b7601C96f24Fb7dd5'.toLowerCase();

const pairABI = [
  // slot0 to get sqrtPriceX96
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
  },
  // token0 & token1 to detect orientation
  {
    constant: true,
    inputs: [],
    name: 'token0',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    constant: true,
    inputs: [],
    name: 'token1',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];

const contract = new web3.eth.Contract(pairABI, pairAddress);

async function getBNBPriceUSD() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd'
    );
    const data = await res.json();
    return data.binancecoin.usd;
  } catch (err) {
    console.error('❌ Failed to fetch TUSD price:', err);
    return 0;
  }
}

async function main() {
  try {
    // fetch slot0, token0, token1 in parallel
    const [slot0, token0, token1] = await Promise.all([
      contract.methods.slot0().call(),
      contract.methods.token0().call(),
      contract.methods.token1().call()
    ]);

    const sqrtPriceX96 = BigInt(slot0.sqrtPriceX96);
    const numerator = sqrtPriceX96 * sqrtPriceX96;
    const denominator = BigInt(2) ** BigInt(192);

    // determine if TIFFY is token0 or token1
    const isTiffyToken0 = token0.toLowerCase() === TIFFY_TOKEN;

    // compute priceInWBNB, flipping if TIFFY is token1
    let priceInWBNB;
    if (isTiffyToken0) {
      // price = ( (sqrtPriceX96)^2 / 2^192 ) * 1e18 / 1e18
      priceInWBNB = Number((numerator * BigInt(1e18)) / denominator) / 1e18;
    } else {
      // invert: price = ( 2^192 * 1e18 / (sqrtPriceX96)^2 ) / 1e18
      priceInWBNB = Number((denominator * BigInt(1e18)) / numerator) / 1e18;
    }

    const bnbUsd = await getBNBPriceUSD();
    const priceInUSD = priceInWBNB * bnbUsd;

    const output = {
      tiffyToWBNB: priceInWBNB.toFixed(10),
      tiffyToUSD: priceInUSD.toFixed(6),
      lastUpdated: new Date().toISOString()
    };

    fs.writeFileSync('price.json', JSON.stringify(output, null, 2));
    console.log('✅ price.json updated with:', output);
  } catch (err) {
    console.error('❌ Error updating price.json:', err);
    process.exit(1);
  }
}

main();
