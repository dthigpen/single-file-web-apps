/**
 * Derives a deterministic cryptographic key from a password string via PBKDF2.
 */
async function deriveCryptoKey(password, saltBuffer) {
    const encoder = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
        "raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a plaintext string with AES-GCM 256.
 * Returns an object matching the schema cryptoMetadata setup.
 */
async function encryptPayload(plainText, password) {
    const encoder = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveCryptoKey(password, salt);
    
    const cipherBuf = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoder.encode(plainText)
    );

    // Convert separate buffers to simple Base64 strings for the JSON envelope
    return {
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherBuf)))
    };
}

/**
 * Decrypts individual Base64 parts with AES-GCM 256.
 */
async function decryptPayload(ciphertextB64, password, saltB64, ivB64) {
    const toBuf = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    
    const salt = toBuf(saltB64);
    const iv = toBuf(ivB64);
    const cipherBuf = toBuf(ciphertextB64);

    const key = await deriveCryptoKey(password, salt);
    const plainBuf = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        cipherBuf
    );

    return new TextDecoder().decode(plainBuf);
}