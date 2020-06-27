/* eslint-disable camelcase */
const mcrypto = require('@arcblock/mcrypto');
const did = require('@arcblock/did');
const { send: sendEmail } = require('../libs/email');
const { Contract } = require('../models');

const sha3 = mcrypto.getHasher(mcrypto.types.HashType.SHA3);

function genContractId(requester, content_hash, signatures) {
  const info = JSON.stringify(signatures.map((sig) => ({ name: sig.name, email: sig.email })));
  const hash = content_hash.replace('0x', '').toLowerCase();
  const data = sha3(`${requester}${hash}${info}`);
  const did_type = {
    role: mcrypto.types.RoleType.ROLE_ASSET, // temp type
    pk: mcrypto.types.KeyType.ED25519,
    hash: mcrypto.types.HashType.SHA3,
  };
  return did.fromPublicKey(data, did_type);
}

const get_url = (contractId) =>
  `${process.env.REACT_APP_BASE_URL.replace('3030', '3000')}/contracts/detail?contractId=${contractId}`;

module.exports = {
  init(app) {
    app.put('/api/contracts', async (req, res) => {
      const requester = req.user;
      if (!requester || !requester.did) return res.status(403).json({ error: 'Login required to create contract' });

      // need some basic param verification

      const params = req.body;
      // in the form when it post the content it shall use Buffer.from(content).toString('base64'). This will
      // work for both text and later on pdf.
      const content_bin = Buffer.from(params.content);
      const hash = sha3(content_bin).replace(/^0x/, '').toUpperCase();
      const contractId = genContractId(requester.did, hash, params.signatures);

      const c = await Contract.findOne({ did: contractId });
      console.log('create contract', req.body, contractId, hash);

      if (c) {
        console.log('duplicate contract', contractId);
        return res.status(422).json({ error: 'Same contract exists' });
      }

      const { signatures, synopsis } = params;

      const now = new Date();
      const result = await Contract.insert({
        did: contractId,
        requester: requester.did,
        synopsis,
        content: params.content,
        hash,
        signatures,
        createdAt: now,
        updatedAt: now,
      });
      console.log('creating contract', result);

      if (Number(process.env.EMAIL_ENABLED)) {
        console.log('sent email');
        // eslint-disable-next-line no-underscore-dangle
        const url = get_url(result.did);
        const recipients = signatures.map((v) => v.email);
        await sendEmail({
          to: recipients.join(','),
          subject: `${requester.name} requests you to sign a contract: ${synopsis}`,
          link: url,
        });
      }

      res.json(result);
    });

    app.get('/api/contracts', async (req, res) => {
      if (!req.user) {
        res.status(403).json({ error: 'Login required' });
        return;
      }

      try {
        const contracts = await Contract.find({
          $or: [{ 'signatures.email': req.user.email }, { requester: req.user.did }],
        });
        res.json(contracts || []);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/api/contracts/:contractId', async (req, res) => {
      if (!req.user) {
        res.status(403).json({ error: 'Login required' });
        return;
      }

      try {
        const contract = await Contract.findOne({ did: req.params.contractId });
        // only signer and requester can view this contract
        if (contract) {
          const isRequester = contract.requester === req.user.did;
          const isSigner = contract.signatures.find((x) => x.email === req.user.email);
          if (isRequester || isSigner) {
            res.json(contract);
          } else {
            res.status(403).json({ error: 'Forbidden' });
          }
        } else {
          res.status(404).json({ error: 'Contract not found' });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
  },
};
