/**
 * ─── encryption.js ─────────────────────────────────────
 * Client-side encryption helpers using Web Crypto API.
 * Used for encrypting messages before sending over WS.
 */

/** Generate a random AES key */
export const generateKey = async () => {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

/** Encrypt a plaintext string */
export const encrypt = async (plaintext, key) => {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(ciphertext)),
  };
};

/** Decrypt an encrypted payload */
export const decrypt = async (encrypted, key) => {
  const decoder = new TextDecoder();
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(encrypted.iv) },
    key,
    new Uint8Array(encrypted.data)
  );
  return decoder.decode(plaintext);
};
