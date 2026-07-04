const crypto = require('crypto');
const fs = require('fs');

/**
 * Compute SHA-256 hash of a file using streaming
 * Works correctly for files of any size (including multi-GB evidence files)
 * @param {string} filePath - absolute path to the file
 * @returns {Promise<string>} - hex-encoded SHA-256 hash
 */
const hashFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(new Error(`Hash computation failed: ${err.message}`)));
  });
};

/**
 * Compute SHA-256 hash of a string or buffer (for small data)
 * @param {string|Buffer} data
 * @returns {string} hex hash
 */
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Verify a file matches a stored hash
 * @param {string} filePath
 * @param {string} storedHash
 * @returns {Promise<{match: boolean, calculatedHash: string}>}
 */
const verifyFileHash = async (filePath, storedHash) => {
  const calculatedHash = await hashFile(filePath);
  return {
    match: calculatedHash === storedHash,
    calculatedHash,
    storedHash,
  };
};

module.exports = { hashFile, hashData, verifyFileHash };
