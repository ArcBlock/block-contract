/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-console */
require('dotenv').config();
require('@abtnode/util/lib/error-handler');

const ForgeSDK = require('@arcblock/forge-sdk');
const { verifyAccountAsync } = require('@arcblock/tx-util');

const { wallet } = require('../libs/auth');
const env = require('../libs/env');

const address = wallet.toAddress();

// Check for application account
const ensureAccountDeclared = async chainId => {
  const { state } = await ForgeSDK.getAccountState({ address }, { conn: chainId });
  if (!state) {
    console.error('Application account not declared on chain');

    const hash = await ForgeSDK.declare(
      {
        moniker: 'crypto_2048',
        wallet,
      },
      { conn: chainId }
    );

    console.log(`Application declared on chain ${chainId}`, hash);
    return { balance: 0, address };
  }

  return state;
};

(async () => {
  try {
    if (env.chainId) {
      await ensureAccountDeclared(env.chainId);
      await verifyAccountAsync({ chainId: env.chainId, chainHost: env.chainHost, address });
    }

    if (env.assetChainId) {
      await ensureAccountDeclared(env.assetChainId);
      await verifyAccountAsync({ chainId: env.assetChainId, chainHost: env.assetChainHost, address });
    }
    process.exit(0);
  } catch (err) {
    console.error('crypto-2048 pre-start error', err);
    process.exit(1);
  }
})();
