import CryptoJS from "crypto-js";

const SECRET = "your-secret-key"; // later: per-user key

export const encryptMessage = (text: string) => {
  return CryptoJS.AES.encrypt(text, SECRET).toString();
};

export const decryptMessage = (cipher: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    // ✅ If decryption fails, return original text
    if (!decrypted) return cipher;

    return decrypted;
  } catch (err) {
    return cipher; // fallback for old messages
  }
};