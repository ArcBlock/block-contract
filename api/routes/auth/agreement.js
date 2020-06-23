/* eslint-disable no-console */
const ForgeSDK = require('@arcblock/forge-sdk');
const { toAddress } = require('@arcblock/did');
const { toAssetAddress } = require('@arcblock/did-util');
const { fromJSON } = require('@arcblock/forge-wallet');

const { wallet } = require('../../libs/auth');
const { User, Contract } = require('../../models');

module.exports = {
  action: 'agreement',
  claims: {
    signature: async ({ extraParams }) => {
      console.log('agreement.start', extraParams);
      const { contractId } = extraParams || {};
      if (!contractId) {
        throw new Error('Cannot proceed with invalid contractId');
      }

      const contract = await Contract.findById(contractId);
      if (!contract) {
        throw new Error('Cannot sign on invalid contract');
      }

      return {
        description: 'Please read the contract content carefully and agree to its terms',
        data: JSON.stringify(
          { hash: contract.hash, content: Buffer.from(contract.content, 'base64').toString() },
          null,
          2
        ),
        type: 'mime::text/plain',
      };
    },
  },

  onAuth: async ({ claims, userDid, userPk, extraParams }) => {
    console.log('sign.onAuth', { claims, userDid, userPk });
    const { contractId } = extraParams || {};
    if (!contractId) {
      throw new Error('Cannot proceed with invalid contractId');
    }

    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new Error('Cannot sign on invalid contract');
    }

    const user = await User.findOne({ did: userDid });
    if (!user) {
      throw new Error('Cannot sign with unauthorized user');
    }

    const claim = claims.find(x => x.type === 'signature');
    if (!claim.sig) {
      throw new Error('You must agree with the terms to sign the contract');
    }

    console.log('contract.onAuth.payload', {
      contractId,
      contract: contract.toJSON(),
      user: user.toJSON(),
      claim,
      userDid,
    });

    contract.signatures = contract.signatures.map(x => {
      if (x.email !== user.email) {
        return x;
      }

      x.name = user.name;
      x.signer = toAddress(userDid);
      x.signedAt = new Date();
      x.signature = claim.sig;

      return x;
    });

    contract.finished = contract.signatures.every(x => !!x.signature);
    console.log('agreement.onAuth.updateSignature', {
      newSignatures: contract.signatures,
      finished: contract.finished,
    });

    if (contract.finished) {
      try {
        contract.completedAt = new Date();

        // Assemble asset
        const asset = {
          moniker: `block_contract_${contractId}`,
          readonly: true,
          transferrable: false,
          data: {
            typeUrl: 'json',
            value: {
              model: 'BlockContract',
              hash: contract.hash,
              contractId,
              requester: toAddress(contract.requester),
              signatures: contract.signatures,
            },
          },
        };
        contract.assetDid = toAssetAddress(asset);
        asset.address = contract.assetDid;
        console.log('agreement.onAuth.makeAsset', asset);

        // Create asset
        const tx = await ForgeSDK.sendCreateAssetTx({
          tx: {
            itx: asset,
          },
          wallet: fromJSON(wallet),
        });
        console.log('agreement.onAuth.createAsset', tx);
      } catch (err) {
        console.error('contract finish error', err);
        console.log(err.errors);
      }
    }

    await contract.save();
    console.log('agreement.onAuth.success', { contractId, userDid });
  },
  onComplete: ({ userDid, extraParams }) => {
    console.log('agreement.onComplete', { userDid, extraParams });
  },
};
