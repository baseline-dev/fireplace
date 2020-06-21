import crypto from 'crypto';

const algorithm = 'aes-192-cbc';

let key;
function getKey() {
  if (key) return key;
  key = crypto.scryptSync(process.env.DYNAMODB_PAGINATION_SECRET, 'salt', 24);
  return key;
}

function encrypt(string){
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  return cipher.update(string, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(string){
  const iv = Buffer.alloc(16, 0);
  const decipher = crypto.createDecipheriv(algorithm, getKey(), iv);
  return decipher.update(string, 'hex', 'utf8') + decipher.final('utf8'); //deciphered text
}

function encryptCursor(cursor) {
  return encrypt(Buffer.from(JSON.stringify(cursor)).toString('base64'));
}

function decryptCursor(cursor) {
  return JSON.parse(Buffer.from(decrypt(cursor), 'base64').toString());
}

export {
  encryptCursor,
  decryptCursor
}
