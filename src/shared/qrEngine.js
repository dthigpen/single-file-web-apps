import jsQR from 'jsqr';

/**
 * Parses a static Image File/Blob and extracts raw text data from a QR code matrix.
 * @param {File|Blob} fileItem - The file object captured from a native file/camera input tag.
 * @returns {Promise<string>} The decoded text payload inside the QR code.
 */
export function decodeQrFromFile(fileItem) {
    return new Promise((resolve, reject) => {
        if (!fileItem) {
            return reject(new Error("No valid image file provided."));
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                try {
                    // Create an ultra-performant, unrendered canvas context pipeline
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // Pull raw pixel streams out of the graphics matrix bounds
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    
                    // Fire the core engine parser logic loop
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: "dontInvert",
                    });

                    if (code && code.data) {
                        resolve(code.data);
                    } else {
                        reject(new Error("Could not detect a sharp, readable QR code. Try moving closer or adjusting lightning."));
                    }
                } catch (err) {
                    reject(new Error("Image processing matrix failure: " + err.message));
                }
            };
            img.onerror = () => reject(new Error("Failed to parse uploaded image asset container."));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to read binary stream from storage disk."));
        reader.readAsDataURL(fileItem);
    });
}

/**
 * Clean Parser to extract standard OTP parameters out of a raw scanned string URI
 * Handles standard structures like: otpauth://totp/Issuer:Account?secret=BASE32SECRET
 */
export function parseOtpAuthUri(uriString) {
    if (!uriString || !uriString.toLowerCase().startsWith('otpauth://')) {
        throw new Error("Scanned link is not a valid standard otpauth:// token configuration.");
    }

    const url = new URL(uriString);
    const secret = url.searchParams.get('secret');
    if (!secret) throw new Error("Missing Base32 secret structural key inside payload query strings.");

    // Clean up label formatting strings out of URL paths
    let label = decodeURIComponent(url.pathname.replace(/^\/\/totp\//i, ''));
    
    return {
        label: label || "Imported Account",
        secret: secret.trim()
    };
}