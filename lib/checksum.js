const fs = require('node:fs/promises');
const crypto = require('node:crypto');

async function sha256File(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

module.exports = {
  sha256File
};
