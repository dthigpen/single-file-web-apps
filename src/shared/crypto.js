/**
 * Safely derives an AES-GCM crypto key from a raw text passphrase using PBKDF2.
 */
async function deriveKey(passphrase, salt) {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(passphrase),
        "PBKDF2",
        false,
        ["deriveKey"]
    );
    
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a cleartext string using a plain text passphrase.
 * Returns an envelope containing the ciphertext and crypto metadata as hex strings.
 */
export async function encryptPayload(cleartext, passphrase) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const aesKey = await deriveKey(passphrase, salt);
    const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        encoder.encode(cleartext)
    );

    // Convert binary buffers into easily storable hex strings
    return {
        payload: Array.from(new Uint8Array(ciphertextBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''),
        cryptoMetadata: {
            salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
            iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
        }
    };
}

/**
 * Decrypts a hex ciphertext string back into cleartext using the passphrase and metadata.
 */
export async function decryptPayload(ciphertextHex, passphrase, saltHex, ivHex) {
    const decoder = new TextDecoder();
    
    // Convert hex strings back into binary arrays
    const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const ciphertext = new Uint8Array(ciphertextHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    
    const aesKey = await deriveKey(passphrase, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        ciphertext
    );
    
    return decoder.decode(decryptedBuffer);
}