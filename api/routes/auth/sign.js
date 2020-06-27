/* eslint-disable object-curly-newline */
/* eslint-disable no-console */
const ForgeSDK = require('@arcblock/forge-sdk');
const { toAddress } = require('@arcblock/did');
const { toAssetAddress } = require('@arcblock/did-util');

const { wallet } = require('../../libs/auth');
const { User, Contract } = require('../../models');

module.exports = {
  action: 'sign',
  claims: {
    signature: async ({ extraParams }) => {
      const { contractId } = extraParams || {};
      if (!contractId) {
        throw new Error('Cannot proceed with invalid contractId');
      }

      const contract = await Contract.findOne({ did: contractId });
      if (!contract) {
        throw new Error('Cannot sign on invalid contract');
      }

      console.log('agreement.start', contract);

      return {
        description: 'Please read the contract content carefully and agree to its terms',
        data: contract.hash,
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

    const contract = await Contract.findOne({ did: contractId });
    if (!contract) {
      throw new Error('Cannot sign on invalid contract');
    }

    const user = await User.findOne({ did: userDid });
    if (!user) {
      throw new Error('Cannot sign with unauthorized user');
    }

    const claim = claims.find((x) => x.type === 'signature');
    if (!claim.sig) {
      throw new Error('You must agree with the terms to sign the contract');
    }

    console.log('contract.onAuth.payload', { contractId, contract, user, claim, userDid });

    const signatures = contract.signatures.map((x) => {
      if (x.email !== user.email) {
        return x;
      }

      x.name = user.name;
      x.signer = toAddress(userDid);
      x.signedAt = new Date();
      x.signature = claim.sig;

      return x;
    });

    const finished = signatures.every((x) => !!x.signature);
    console.log('agreement.onAuth.updateSignature', {
      newSignatures: contract.signatures,
      finished: contract.finished,
    });

    if (finished) {
      try {
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
              signatures,
            },
          },
        };
        asset.address = toAssetAddress(asset);
        console.log('agreement.onAuth.makeAsset', asset);

        // Create asset
        const hash = await ForgeSDK.sendCreateAssetTx({
          tx: {
            itx: asset,
          },
          wallet,
        });
        console.log('agreement.onAuth.createAsset', hash);

        const result = await Contract.update(
          { did: contractId },
          {
            $set: {
              finished,
              signatures,
              assetDid: asset.address,
              completedAt: new Date(),
            },
          },
          { multi: false, upsert: false }
        );

        console.log('agreement.onAuth.updateContract', result);
      } catch (err) {
        console.error('contract finish error', err);
        console.log(err.errors);
      }
    } else {
      const result = await Contract.update(
        { did: contractId },
        {
          $set: {
            signatures,
          },
        },
        { multi: false, upsert: false }
      );

      console.log('agreement.onAuth.updateContract.one', result);
    }

    console.log('agreement.onAuth.success', { contractId, userDid });
  },
  onComplete: ({ userDid, extraParams }) => {
    console.log('agreement.onComplete', { userDid, extraParams });
  },
};
