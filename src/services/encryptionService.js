import CryptoJS from 'crypto-js';

function safeStringify(data) {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.error('Failed to stringify data for encryption:', error);
    return null;
  }
}

export function generateKey() {
  try {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('Failed to generate encryption key:', error);
    return null;
  }
}

export function deriveEncryptionKey(phoneNumber = '') {
  try {
    const base = import.meta.env.VITE_GEMINI_API_KEY || 'demo_neighbor_aid_seed';
    return CryptoJS.SHA256(`${base}:${phoneNumber}`).toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('Failed to derive encryption key:', error);
    return null;
  }
}

export function encryptData(data, key) {
  try {
    const payload = safeStringify(data);
    if (!payload || !key) {
      return null;
    }

    return CryptoJS.AES.encrypt(payload, key).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    return null;
  }
}

export function decryptData(encryptedData, key) {
  try {
    if (!encryptedData || !key) {
      return null;
    }

    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    let decrypted;
    try {
      decrypted = bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      // Silencing malformed data warnings to clean up console in dev/demo environments
      return null;
    }

    if (!decrypted) {
      return null;
    }

    try {
      return JSON.parse(decrypted);
    } catch (e) {
      return null;
    }
  } catch (error) {
    return null;
  }
}
