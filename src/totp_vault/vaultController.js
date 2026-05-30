import { signal, effect } from '@preact/signals';
import { encryptPayload, decryptPayload } from '../shared/crypto.js';

const STORAGE_KEY = 'totp-vault-db';

export const masterKey = signal(null);
export const globalVault = signal([]);
export const isUnlocked = signal(false);
export const timeStepTicker = signal(Math.floor(Date.now() / 1000));

// Background Auto-Saver Engine
effect(async () => {
    if (!isUnlocked.value || !masterKey.value) return;
    try {
        const rawString = JSON.stringify(globalVault.value);
        const envelope = await encryptPayload(rawString, masterKey.value);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch (err) {
        console.error("Storage Engine write failure:", err);
    }
});

export function addCredential(rawLabel, secret) {
    if (!rawLabel || !secret) return;
    const cleanLabel = rawLabel.trim();
    let issuer = "";
    let account = cleanLabel;

    if (cleanLabel.includes(':')) {
        const parts = cleanLabel.split(':');
        issuer = parts[0].trim();
        account = parts.slice(1).join(':').trim();
    }

    globalVault.value = [
        ...globalVault.value,
        {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            label: cleanLabel,
            issuer: issuer,
            account: account,
            secret: secret.trim().replace(/\s/g, ""),
            created: Date.now()
        }
    ];
}

// Update an existing item's layout matching our standard structure
export function updateCredential(id, updatedLabel, updatedSecret) {
    if (!updatedLabel || !updatedSecret) return;
    const cleanLabel = updatedLabel.trim();
    let issuer = "";
    let account = cleanLabel;

    if (cleanLabel.includes(':')) {
        const parts = cleanLabel.split(':');
        issuer = parts[0].trim();
        account = parts.slice(1).join(':').trim();
    }

    globalVault.value = globalVault.value.map(item => {
        if (item.id !== id) return item;
        return {
            ...item,
            label: cleanLabel,
            issuer: issuer,
            account: account,
            secret: updatedSecret.trim().replace(/\s/g, "")
        };
    });
}

export function deleteCredential(id) {
    if (confirm("Are you sure you want to delete this account configuration?")) {
        globalVault.value = globalVault.value.filter(item => item.id !== id);
    }
}

// Export Backup: Pulls raw encrypted ciphertext straight out of disk storage
export function exportVaultFile() {
    const encryptedData = localStorage.getItem(STORAGE_KEY);
    if (!encryptedData) {
        alert("No local data found to export yet. Add a token first!");
        return;
    }

    const blob = new Blob([encryptedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const timestamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `totp-vault-backup-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Smart Import: Attempts decryption with current session key first.
 * If an explicit overridePassword is provided, it uses that instead.
 */
export async function importVaultFile(fileText, overridePassword = null) {
    try {
        const envelope = JSON.parse(fileText);
        if (!envelope.payload || !envelope.cryptoMetadata) {
            throw new Error("Invalid file format.");
        }

        // Determine which passphrase key to test against the cryptographic engine
        const encryptionKey = overridePassword || masterKey.value;

        const cleartext = await decryptPayload(
            envelope.payload,
            encryptionKey,
            envelope.cryptoMetadata.salt,
            envelope.cryptoMetadata.iv
        );

        const importedItems = JSON.parse(cleartext);
        if (!Array.isArray(importedItems)) throw new Error("Internal payload error.");

        if (confirm(`Authenticated backup successfully! Found ${importedItems.length} accounts. Overwrite your current vault?`)) {
            // Hydrate working memory loop. The background effect() will instantly 
            // re-encrypt these imported records using the active session's master key!
            globalVault.value = importedItems;
            return { success: true };
        }
        return { success: false };
    } catch (err) {
        // If it failed and we haven't tried an explicit override password yet, signal to the UI to ask for one
        if (!overridePassword) {
            return { success: false, requiresPasswordOverride: true };
        }
        throw new Error("Authentication failed. Wrong passphrase for this backup file.");
    }
}

/**
 * Password Rotation: Re-encrypts the active database with a new passphrase
 */
export async function rotateMasterPassphrase(newPassword) {
    if (!newPassword || newPassword.trim() === "") {
        throw new Error("New passphrase cannot be blank.");
    }
    
    // 1. Update the volatile state pointer key
    masterKey.value = newPassword;
    
    // 2. Explicitly trigger a save loop sweep right now
    const rawString = JSON.stringify(globalVault.value);
    const envelope = await encryptPayload(rawString, masterKey.value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    
    console.log("Cryptography: Master passphrase rotated and local storage records re-encrypted smoothly.");
    return true;
}

export async function tryUnlockVault(password) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        masterKey.value = password;
        globalVault.value = [];
        isUnlocked.value = true;
        return true;
    }
    try {
        const envelope = JSON.parse(stored);
        const cleartext = await decryptPayload(envelope.payload, password, envelope.cryptoMetadata.salt, envelope.cryptoMetadata.iv);
        masterKey.value = password;
        globalVault.value = JSON.parse(cleartext);
        isUnlocked.value = true;
        return true;
    } catch (err) {
        throw new Error("Invalid master passphrase. Integrity token mismatch.");
    }
}

export function factoryResetDatabase() {
    if (confirm("CRITICAL WARNING: This will permanently delete your local encrypted vault. Proceed?")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}