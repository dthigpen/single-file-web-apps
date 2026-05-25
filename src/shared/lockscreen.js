class AppLockscreen extends HTMLElement {
    async connectedCallback() {
        const appId = this.getAttribute('app-id');
        const isEncrypted = this.hasAttribute('encrypted');
        const appName = this.getAttribute('app-name') || 'Application';
        const customDesc = this.getAttribute('custom-desc');
        
        const rawStored = localStorage.getItem(appId);
        const isFreshRun = !rawStored;

        const title = isFreshRun ? `Create ${appName} Passphrase` : `Unlock ${appName}`;
        const defaultDesc = isFreshRun 
            ? `Set a local password to encrypt your storage profile.` 
            : `Enter your passphrase to decrypt your secure workspace.`;
        
        const desc = customDesc || defaultDesc;

        this.innerHTML = `
            <div class="lockscreen-overlay" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #ffffff; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
                <div class="card lockscreen-panel" style="width: 100%; max-width: 400px; border: 2px solid #000; padding: 16px; background: #fff; box-sizing: border-box;">
                    <h2 style="font-size: 16px; font-weight: bold; text-transform: uppercase; margin-top: 0; margin-bottom: 4px;">${title}</h2>
                    <p style="font-size: 11px; color: #555; margin-top: 0; margin-bottom: 12px; line-height: 1.4;">${desc}</p>
                    <input type="password" id="sysPassInput" placeholder="Passphrase..." style="width: 100%; padding: 6px; font-size: 12px; border: 1px solid #000; box-sizing: border-box; margin-bottom: 12px;">
                    <button id="sysUnlockBtn" class="btn" style="width: 100%; padding: 8px; font-size: 12px;">${isFreshRun ? 'Set Passphrase' : 'Unlock Database'}</button>
                    <div id="sysLockError" class="lockscreen-error" style="display: none; color: #ff3b30; font-size: 11px; font-weight: bold; margin-top: 8px; text-align: center;">Incorrect passphrase. Try again.</div>
                    
                    <!-- 🚨 Emergency Data Reset Layer (Visible only when a locked database exists) -->
                    ${!isFreshRun ? `
                        <div style="margin-top: 16px; border-top: 1px dashed #b0b0b0; padding-top: 12px; text-align: center;">
                            <button id="sysResetBtn" style="background: transparent; border: none; color: #cc0000; font-size: 10px; font-weight: bold; text-transform: uppercase; cursor: pointer; text-decoration: underline; padding: 4px;">
                                Forgot Passphrase? Reset App
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        const input = this.querySelector('#sysPassInput');
        const unlockBtn = this.querySelector('#sysUnlockBtn');
        const errorDiv = this.querySelector('#sysLockError');

        input.focus();
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') unlockBtn.click(); });

        // --- UNLOCK ROUTINE ---
        unlockBtn.onclick = async () => {
            const password = input.value;
            if (!password) return;

            try {
                let decryptedPayload = null;

                if (isFreshRun) {
                    decryptedPayload = null; 
                } else {
                    if (isEncrypted) {
                        const envelope = JSON.parse(rawStored);
                        const decryptedString = await decryptPayload(
                            envelope.payload,
                            password,
                            envelope.cryptoMetadata.salt,
                            envelope.cryptoMetadata.iv
                        );
                        decryptedPayload = JSON.parse(decryptedString);
                    } else {
                        const envelope = JSON.parse(rawStored);
                        decryptedPayload = envelope.payload;
                    }
                }

                this.dispatchEvent(new CustomEvent('app-unlocked-success', {
                    detail: { password, data: decryptedPayload, isFreshRun }
                }));
                
                this.remove();
            } catch (err) {
                errorDiv.style.display = 'block';
                input.value = '';
                input.focus();
            }
        };

        // --- EMERGENCY RESET ROUTINE ---
        if (!isFreshRun) {
            const resetBtn = this.querySelector('#sysResetBtn');
            resetBtn.onclick = () => {
                const step1 = confirm(`Are you completely sure you want to reset ${appName}? This will completely purge your encrypted data file from local storage.`);
                if (step1) {
                    const step2 = confirm("⚠️ FINAL WARNING: This action is permanent and unrecoverable. Your existing local security keys and tokens will be wiped out completely. Proceed?");
                    if (step2) {
                        localStorage.removeItem(appId);
                        // Reloading drops the user back to a clean state boot cycle
                        location.reload();
                    }
                }
            };
        }
    }
}
customElements.define('app-lockscreen', AppLockscreen);