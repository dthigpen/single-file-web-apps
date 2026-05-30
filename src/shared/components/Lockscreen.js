import { h } from 'preact';
import { useSignal } from '@preact/signals';
import htm from 'htm';
import { tryUnlockVault, factoryResetDatabase } from '../../totp_vault/vaultController.js';

const html = htm.bind(h);

export function Lockscreen({ appId, appName }) {
    const passwordAttempt = useSignal('');
    const errorMessage = useSignal('');
    const isProcessing = useSignal(false);

    const handleUnlockSubmit = async (e) => {
        e.preventDefault();
        if (isProcessing.value) return;

        errorMessage.value = '';
        isProcessing.value = true;

        try {
            const success = await tryUnlockVault(passwordAttempt.value);
            if (success) {
                passwordAttempt.value = '';
            }
        } catch (err) {
            errorMessage.value = err.message || "Invalid master passphrase.";
        } finally {
            isProcessing.value = false;
        }
    };

    return html`
        <div class="app-workspace flex-container">
            <div class="card center-text">
                <div style="font-size: 1.5rem; margin-bottom: 4px;"></div>
                <h1>${appName || "Secure Vault"}</h1>
                <p>Enter your master passphrase to decrypt records.</p>

                <form onSubmit=${handleUnlockSubmit}>
                    <input 
                        type="password" 
                        placeholder="Master Passphrase" 
                        value=${passwordAttempt} 
                        onInput=${e => passwordAttempt.value = e.target.value}
                        disabled=${isProcessing.value}
                        style="text-align: center;"
                    />
                    <button type="submit" disabled=${isProcessing.value}>
                        ${isProcessing.value ? "Decrypting..." : "Unlock Application"}
                    </button>
                </form>

                ${errorMessage.value ? html`
                    <div style="margin-top: 8px; color: #cc0000; font-size: 0.8rem; background: #fff5f5; padding: 6px; border-radius: 4px; border: 1px solid #ffd1d1;">
                        ${errorMessage.value}
                    </div>
                ` : null}

                <div style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #eee;">
                    <button onClick=${factoryResetDatabase} style="background: none; color: #cc0000; font-size: 0.75rem; text-decoration: underline; padding: 4px; width: auto; height: auto; font-weight: normal;">
                        Forgot passphrase? Wipe data
                    </button>
                </div>
            </div>
        </div>
    `;
}