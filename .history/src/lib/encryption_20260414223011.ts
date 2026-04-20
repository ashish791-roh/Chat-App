import CryptoJS from "crypto-js";

const SECRET = "your-secret-key"; // later: per-user key

export const encryptMessage = (text: string) => {
  return CryptoJS.AES.encrypt(text, SECRET).toString();
};

export const decryptMessage = (cipher: string) => {
  const bytes = CryptoJS.AES.decrypt(cipher, SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
};