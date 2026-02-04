const crypto = require('crypto');
const fs = require('fs');

const salt = crypto.randomBytes(32).toString('hex');
const key = crypto.randomBytes(32).toString('hex');

fs.writeFileSync('keys.txt', `SALT=${salt}\nKEY=${key}`);
console.log('Keys written to keys.txt');
