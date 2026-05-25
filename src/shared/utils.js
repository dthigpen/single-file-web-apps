
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