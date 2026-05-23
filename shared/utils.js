/**
 * Generates a dynamic file download directly in the browser environment.
 * @param {Object} dataObject - The state or configuration object to save.
 * @param {string} filename - The desired target name for the downloaded file.
 */
function exportAppState(dataObject, filename) {
    const jsonString = JSON.stringify(dataObject, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const link = document.createElement("a");
    
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

/**
 * Binds an event listener to a file input element to read raw text content.
 * @param {string} inputId - The HTML id string of the target input[type="file"].
 * @param {function} callback - Execution block passing the successfully parsed object.
 */
function initializeAppImporter(inputId, callback) {
    const filePicker = document.getElementById(inputId);
    if (!filePicker) return;

    filePicker.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const parsedData = JSON.parse(event.target.result);
                callback(parsedData);
            } catch (err) {
                alert("Failed to parse file data: " + err.message);
            }
        };
        reader.readAsText(file);
    });
}

/**
 * Normalizes a Base32 string into a standard byte buffer.
 */
function base32ToBuf(str) {
    const b32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let cleanStr = str.replace(/=+$/, "").toUpperCase();
    let len = cleanStr.length;
    let buffer = new Uint8Array(((len * 5) / 8) | 0);
    let bits = 0;
    let value = 0;
    let index = 0;

    for (let i = 0; i < len; i++) {
        let val = b32chars.indexOf(cleanStr[i]);
        if (val === -1) continue;
        value = (value << 5) | val;
        bits += 5;
        if (bits >= 8) {
            buffer[index++] = (value >> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return buffer;
}

/**
 * Derives a deterministic cryptographic key from a pass string via PBKDF2.
 */
async function deriveCryptoKey(password, salt) {
    const encoder = new TextEncoder();
    const baseKey = await window.crypto.subtle.importKey(
        "raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts a plaintext string with AES-GCM 256.
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

    const combined = new Uint8Array(salt.length + iv.length + cipherBuf.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(cipherBuf), salt.length + iv.length);

    return btoa(String.fromCharCode.apply(null, combined));
}

/**
 * Decrypts a base64 encrypted payload with AES-GCM 256.
 */
async function decryptPayload(cipherTextB64, password) {
    const binary = atob(cipherTextB64);
    const combined = new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i));
    
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const cipherBuf = combined.slice(28);

    const key = await deriveCryptoKey(password, salt);
    const plainBuf = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        cipherBuf
    );

    return new TextDecoder().decode(plainBuf);
}

/**
 * Calculates a standard 6-digit TOTP token value.
 */
async function calculateTOTP(secretB32, period = 30) {
    try {
        if (!window.crypto || !window.crypto.subtle) return "NO CRYPTO"; 
        const keyData = base32ToBuf(secretB32);
        if (keyData.byteLength === 0) return "ERR-32";

        const epoch = Math.floor(Date.now() / 1000);
        const timeStep = Math.floor(epoch / period);

        const timeBuf = new ArrayBuffer(8);
        const view = new DataView(timeBuf);
        view.setUint32(4, timeStep, false); 
        view.setUint32(0, 0, false); 

        const cryptoKey = await window.crypto.subtle.importKey(
            "raw", keyData, { name: "HMAC", hash: { name: "SHA-1" } }, false, ["sign"]
        );

        const hmacBuf = await window.crypto.subtle.sign("HMAC", cryptoKey, timeBuf);
        const hmac = new Uint8Array(hmacBuf);

        const offset = hmac[hmac.length - 1] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24) |
                     ((hmac[offset + 1] & 0xff) << 16) |
                     ((hmac[offset + 2] & 0xff) << 8) |
                     (hmac[offset + 3] & 0xff);

        const digits = 6;
        let totp = (code % Math.pow(10, digits)).toString();
        while (totp.length < digits) totp = "0" + totp;

        return totp.substring(0, 3) + " " + totp.substring(3);
    } catch (e) {
        return "ERR GEN";
    }
}