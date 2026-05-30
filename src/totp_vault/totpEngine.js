/**
 * Decodes a standard Base32 string into a raw Uint8Array.
 * Required because browser APIs do not natively support Base32 parsing.
 */
function decodeBase32(base32Str) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    // Clean up spaces, dashes, and padding common in copy-pasted keys
    const cleanStr = base32Str.toUpperCase().replace(/[\s-]/g, "").replace(/=/g, "");
    
    const length = cleanStr.length;
    const buffer = new Uint8Array(Math.floor((length * 5) / 8));
    
    let bits = 0;
    let value = 0;
    let index = 0;

    for (let i = 0; i < length; i++) {
        const idx = alphabet.indexOf(cleanStr[i]);
        if (idx === -1) throw new Error("Invalid character found in Base32 secret key.");
        
        value = (value << 5) | idx;
        bits += 5;

        if (bits >= 8) {
            bits -= 8;
            buffer[index++] = (value >>> bits) & 0xFF;
        }
    }
    return buffer;
}

/**
 * Computes a standard 6-digit TOTP token for a given Base32 secret.
 * Uses hardcoded standard defaults: SHA-1, 30s period, 6 digits.
 * @param {string} secret - The Base32 encoded token secret string.
 * @returns {Promise<string>} The active 6-digit string code (padded with leading zeros).
 */
export async function generateTOTP(secret) {
    // 1. Convert the Base32 string to a binary byte stream array
    const secretBytes = decodeBase32(secret);

    // 2. Calculate the current 30-second epoch counter step interval
    const epochSeconds = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epochSeconds / 30);

    // 3. Serialize the 64-bit integer counter into an 8-byte buffer (Big-Endian style)
    const counterBuffer = new ArrayBuffer(8);
    const counterView = new DataView(counterBuffer);
    // Write lower 32-bits to the end, upper bits remain 0 for common Unix epoch ranges
    counterView.setUint32(4, counter, false); 

    // 4. Import the raw secret array into the Web Crypto API framework
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        secretBytes,
        { name: "HMAC", hash: { name: "SHA-1" } },
        false,
        ["sign"]
    );

    // 5. Compute the HMAC-SHA1 hash signature value envelope
    const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        counterBuffer
    );
    const hmacResult = new Uint8Array(signatureBuffer);

    // 6. Dynamic Truncation: Use the lower 4 bits of the last byte as an array index offset
    const offset = hmacResult[hmacResult.length - 1] & 0x0F;

    // Extract a 4-byte slice starting at that exact index offset
    const binaryCode = 
        ((hmacResult[offset] & 0x7F) << 24) |
        ((hmacResult[offset + 1] & 0xFF) << 16) |
        ((hmacResult[offset + 2] & 0xFF) << 8) |
        (hmacResult[offset + 3] & 0xFF);

    // 7. Reduce the value down to a 6-digit integer and pad with leading zeros if necessary
    const otp = binaryCode % 1000000;
    return otp.toString().padStart(6, '0');
}

/**
 * Utility to calculate remaining seconds left in the active 30-second window interval.
 * Vital for feeding the circular UI visual ticking loaders.
 */
export function getSecondsRemaining() {
    return 30 - (Math.floor(Date.now() / 1000) % 30);
}