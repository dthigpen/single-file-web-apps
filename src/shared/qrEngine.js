import jsQR from 'jsqr';

/**
 * Parses a static Image File/Blob and extracts raw text data from a QR code matrix.
 * @param {File|Blob} fileItem - The file object captured from a native file/camera input tag.
 * @returns {Promise<string>} The decoded text payload inside the QR code.
 */
export function decodeQrFromFile(fileItem) {
    return new Promise((resolve, reject) => {
        if (!fileItem) {
            return reject(new Error('No valid image file provided.'));
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
                        inversionAttempts: 'dontInvert'
                    });

                    if (code && code.data) {
                        resolve(code.data);
                    } else {
                        reject(
                            new Error(
                                'Could not detect a sharp, readable QR code. Try moving closer or adjusting lightning.'
                            )
                        );
                    }
                } catch (err) {
                    reject(new Error('Image processing matrix failure: ' + err.message));
                }
            };
            img.onerror = () =>
                reject(new Error('Failed to parse uploaded image asset container.'));
            img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read binary stream from storage disk.'));
        reader.readAsDataURL(fileItem);
    });
}

/**
 * Clean Parser to extract standard OTP parameters out of a raw scanned string URI
 * Handles standard structures like: otpauth://totp/Issuer:Account?secret=BASE32SECRET
 */
export function parseOtpAuthUri(uriString) {
    if (!uriString || !uriString.toLowerCase().startsWith('otpauth://')) {
        throw new Error('Scanned link is not a valid standard otpauth:// token configuration.');
    }

    const url = new URL(uriString);
    const secret = url.searchParams.get('secret');
    if (!secret)
        throw new Error('Missing Base32 secret structural key inside payload query strings.');

    // Clean up label formatting strings out of URL paths
    let label = decodeURIComponent(url.pathname.replace(/^\/\/totp\//i, ''));

    return {
        label: label || 'Imported Account',
        secret: secret.trim()
    };
}

/**
 * 🗺️ Universal Text Stream Import Parser
 * Identifies and processes either a single otpauth:// URI or a raw plaintext Aegis JSON string.
 * @param {string} rawTextStream - The loose clipboard or file text payload entered by the user.
 * @returns {Array<{label: string, secret: string}>} Array of normalized credential items ready for structural insertion.
 */
export function parseUniversalTextImport(rawTextStream) {
    const trimmed = rawTextStream.trim();
    if (!trimmed) throw new Error('Input string stream is empty.');

    // Case 1: Detect a bulk JSON vault backup file structure (e.g., Aegis Plaintext Export)
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
            const parsedJson = JSON.parse(trimmed);

            // Map structural compatibility format for Aegis JSON exports
            if (parsedJson.entries && Array.isArray(parsedJson.entries)) {
                return parsedJson.entries
                    .filter((entry) => entry.type === 'totp' && entry.info && entry.info.secret)
                    .map((entry) => ({
                        label: entry.name || entry.issuer || 'Aegis Import',
                        secret: entry.info.secret.replace(/\s+/g, '').toUpperCase()
                    }));
            }

            // Map fallback format if the user pastes a raw array block instead
            if (Array.isArray(parsedJson)) {
                return parsedJson
                    .filter((item) => item.secret)
                    .map((item) => ({
                        label: item.label || 'JSON Import',
                        secret: item.secret.replace(/\s+/g, '').toUpperCase()
                    }));
            }

            throw new Error(
                'JSON structure parsed correctly, but found no matching TOTP data arrays.'
            );
        } catch (jsonErr) {
            throw new Error('Malformed JSON format string block: ' + jsonErr.message);
        }
    }

    // Case 2: Detect a single standard account otpauth link profile
    if (trimmed.toLowerCase().startsWith('otpauth://')) {
        try {
            const url = new URL(trimmed);
            const secret = url.searchParams.get('secret');
            if (!secret)
                throw new Error(
                    'Target link contains no valid Base32 secret data query parameter.'
                );

            let label = decodeURIComponent(url.pathname.replace(/^\/\/totp\//i, ''));
            return [
                {
                    label: label || 'Link Import',
                    secret: secret.replace(/\s+/g, '').toUpperCase()
                }
            ];
        } catch (urlErr) {
            throw new Error('Invalid otpauth specification URL template: ' + urlErr.message);
        }
    }

    throw new Error(
        'Unrecognized raw format. Supply a valid otpauth:// link or a plaintext Aegis vault JSON array dump.'
    );
}
