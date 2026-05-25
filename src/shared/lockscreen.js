class AppLockscreen extends HTMLElement {
    async connectedCallback() {
        const appId = this.getAttribute('app-id');
        const isEncrypted = this.hasAttribute('encrypted');
        
        const rawStored = localStorage.getItem(appId);
        const isFreshRun = !rawStored;

        // Automatically configure text instructions based on context
        const title = isFreshRun ? 'Create Master Passphrase' : 'Database Locked';
        const desc = isFreshRun 
            ? 'Set a local password to encrypt your storage profile.' 
            : 'Enter your passphrase to decrypt your workspace.';

        this.innerHTML = `
            <div class="lockscreen-overlay">
                <div class="card lockscreen-panel">
                    <h2>${title}</h2>
                    <p>${desc}</p>
                    <input type="password" id="sysPassInput" placeholder="Passphrase..." style="width: 100%; margin-bottom: 12px;">
                    <button id="sysUnlockBtn" style="width: 100%;">${isFreshRun ? 'Set Passphrase' : 'Unlock Database'}</button>
                    <div id="sysLockError" class="lockscreen-error">Incorrect passphrase. Try again.</div>
                    <hr style="margin: 20px 0; border: 0; border-top: 1px solid #333;">
                    <button id="sysResetBtn" style="width: 100%; background: #2a1414; color: #ff8888;">Reset App (Wipe Storage)</button>
                </div>
            </div>
        `;

        const input = this.querySelector('#sysPassInput');
        const unlockBtn = this.querySelector('#sysUnlockBtn');
        const resetBtn = this.querySelector('#sysResetBtn');
        const errorDiv = this.querySelector('#sysLockError');

        input.focus();
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') unlockBtn.click(); });

        unlockBtn.onclick = async () => {
            const password = input.value;
            if (!password) return;

            try {
                let decryptedPayload = null;

                if (isFreshRun) {
                    // Fresh run implies zero stored bytes, so payload starts blank
                    decryptedPayload = null; 
                } else {
                    if (isEncrypted) {
                        const envelope = JSON.parse(rawStored);
                        // Execute true cryptographic processing pipeline pass internally
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

                // Fire off single source of truth success event up to app
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

        resetBtn.onclick = () => {
            if (confirm("Wipe storage? All unexported changes will be lost.")) {
                localStorage.removeItem(appId);
                location.reload();
            }
        };
    }
}
customElements.define('app-lockscreen', AppLockscreen);