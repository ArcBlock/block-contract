const path = require('path');
const DataStore = require('nedb-promise');

const { dataDir } = require('../libs/auth');

module.exports = new DataStore({
  filename: path.join(dataDir, 'contracts.db'),
  autoload: true,
  timestampData: true,
  onload: err => {
    if (err) {
      // eslint-disable-next-line
      console.error(`failed to load disk database ${this.filename}`, err);
    }
  },
});
