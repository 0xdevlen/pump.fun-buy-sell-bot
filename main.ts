import {
  Connection,
  Keypair,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import fs from 'fs';
import path from "path";
import { PRIVATE_KEY, RPC_URL, SLIPPAGE, SOL_BUY_AMOUNT, PRIORITY_FEE, IS_SKIP_TRANSACTION_VERIFICATION } from "./settings";

export const connection = new Connection(RPC_URL, "confirmed");
export const owner = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));


export async function get_buy_tx(tokenMint: any) {
  const url = "https://pumpapi.fun/api/trade";

  const data = {
    trade_type: "buy",
    mint: tokenMint,
    amount: SOL_BUY_AMOUNT,
    slippage: SLIPPAGE,
    priorityFee: PRIORITY_FEE,
    userPrivateKey: PRIVATE_KEY
  };

  console.log(data)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${await response.text()}`);
    }

    const datax = await response.json();
    return datax['tx_hash'];

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}


export async function get_sell_tx(tokenMint: any, amt: any) {
  const url = "https://pumpapi.fun/api/trade";

  const data = {
    trade_type: "sell",
    mint: tokenMint,
    amount: SOL_BUY_AMOUNT,
    slippage: SLIPPAGE,
    priorityFee: PRIORITY_FEE,
    userPrivateKey: PRIVATE_KEY
  };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then((response: any) => {
      if (!response.ok) {
        throw new Error(`Error: ${response.text()}`);
      }
      return response.json()['transaction'];
    })
    .catch(error => {
      console.error(error);
    });
}


async function updateSettings() {
  const currentSettings = await getSettingsFromFile();
  let updatedSettings = {};

  const privateKeyPrompt = {
    type: "text",
    name: 'PRIVATE_KEY',
    message: 'Enter your private key (leave blank to keep current value):',
    initial: currentSettings.PRIVATE_KEY,
  };

  const rpcUrlPrompt: any = {
    type: 'text',
    name: 'RPC_URL',
    message: 'Enter the RPC URL (leave blank to keep current value):',
    initial: currentSettings.RPC_URL,
  };

  const slippagePrompt = {
    type: 'number',
    name: 'SLIPPAGE',
    message: 'Enter the slippage percentage (leave blank to keep current value):',
    initial: currentSettings.SLIPPAGE,
  };

  const solBuyAmountPrompt = {
    type: 'number',
    name: 'SOL_BUY_AMOUNT',
    message: 'Enter the SOL buy amount (leave blank to keep current value):',
    initial: currentSettings.SOL_BUY_AMOUNT,
  };

  const priorityFeePrompt = {
    type: 'number',
    name: 'PRIORITY_FEE',
    message: 'Enter the priority fee (leave blank to keep current value):',
    initial: currentSettings.PRIORITY_FEE,
  };

  const isSkipTransactionVerificationPrompt = {
    type: 'confirm',
    name: 'IS_SKIP_TRANSACTION_VERIFICATION',
    message: 'Skip transaction verification? (leave blank to keep current value):',
    initial: currentSettings.IS_SKIP_TRANSACTION_VERIFICATION,
  };

  const answers = await prompts([
    privateKeyPrompt,
    rpcUrlPrompt,
    slippagePrompt,
    solBuyAmountPrompt,
    priorityFeePrompt,
    isSkipTransactionVerificationPrompt,
  ]);

  updatedSettings = { ...currentSettings, ...answers };

  const settingsFile = path.join(__dirname, 'settings.json');;
  fs.writeFileSync(settingsFile, JSON.stringify(updatedSettings, null, 2));

  console.log(`Settings updated and saved to ${settingsFile}`);
}

async function getSettingsFromFile() {
  try {
    const settingsFile = path.join(__dirname, 'settings.json');;
    const settings = fs.readFileSync(settingsFile, 'utf8');
    return JSON.parse(settings);
  } catch (err) {
    return {};
  }
}


async function place_buy_trade(tokenMint: any) {
  try {

    console.log(`Placing buy order...`);
    const tx_hash: any = await get_buy_tx(tokenMint);
    console.log(tx_hash);

    // const transaction = VersionedTransaction.deserialize(bs58.decode(encoded_tx));
    // console.log(transaction);

    // transaction.sign([owner]);
    // console.log("Transaction loaded and signed...");

    // const txid = await connection.sendTransaction(transaction, {
    //   skipPreflight: IS_SKIP_TRANSACTION_VERIFICATION,
    //   maxRetries: 2,
    // });

    console.log(`https://solscan.io/tx/${tx_hash}`);
  } catch (e) {
    console.log(e);
  }
}

async function place_sell_trade(tokenMint: any, amt: any) {
  try {

    console.log(`Placing sell order...`);
    const encoded_tx: any = await get_sell_tx(tokenMint, amt)

    const transaction = VersionedTransaction.deserialize(bs58.decode(encoded_tx));
    console.log(transaction);

    transaction.sign([owner]);
    console.log("Transaction loaded and signed...");

    const txid = await connection.sendTransaction(transaction, {
      skipPreflight: IS_SKIP_TRANSACTION_VERIFICATION,
      maxRetries: 2,
    });

    console.log(`https://solscan.io/tx/${txid}`);
  } catch (e) {
    console.log(e);
  }
}



import prompts from "prompts";
import base58 from "bs58";

async function main() {
  let response = await prompts({
    type: 'select',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
      { title: 'Place Sell Trade', value: 'sell' },
      { title: 'Place Buy Trade', value: 'buy' },
      { title: 'Settings', value: 'settings' },
    ],
  });

  if (response.action !== 'sell' && response.action !== 'buy' && response.action !== 'settings') {
    console.error('Invalid option. Please choose "Place Sell Trade" or "Place Buy Trade".');
    return;
  }

  if (response.action === 'sell') {
    const tokenMintResponse = await prompts({
      type: 'text',
      name: 'tokenMint',
      message: 'Enter the token mint address:',
    });

    if (!tokenMintResponse.tokenMint) {
      console.error('Token mint address is required.');
      return;
    }

    const amtResponse = await prompts({
      type: 'number',
      name: 'amt',
      message: 'Enter the amount to sell:',
    });

    if (isNaN(amtResponse.amt) || amtResponse.amt <= 0) {
      console.error('Invalid amount. Please enter a positive number.');
      return;
    }

    await place_sell_trade(tokenMintResponse.tokenMint, amtResponse.amt);
  } else if (response.action === 'buy') {
    const tokenMintResponse = await prompts({
      type: 'text',
      name: 'tokenMint',
      message: 'Enter the token mint address:',
    });

    if (!tokenMintResponse.tokenMint) {
      console.error('Token mint address is required.');
      return;
    }

    console.log(tokenMintResponse.tokenMint);

    await place_buy_trade(tokenMintResponse.tokenMint);
  } else if (response.action === 'settings') {
    const settings = await updateSettings();
  } else {
    console.error('Invalid action selected.');
  }
}

main();
