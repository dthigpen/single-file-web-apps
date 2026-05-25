class AppDataIO extends HTMLElement {
    connectedCallback() {
        this.appId = this.getAttribute('app-id');
        this.version = this.getAttribute('version') || '1.0.0';
        this.isEncrypted = this.hasAttribute('encrypted');

        this.innerHTML = `
            <div class="card">
                <h2>Data Management</h2>
                <p>Save state payload down to device file storage, or import an active backup string.</p>
                <button id="ioExportBtn" style="width: 100%; margin-bottom: 12px;">Export Backup File</button>
                <div style="margin-top: 12px;">
                    <label style="display: block; margin-bottom: 6px; font-weight: bold;">Import Backup File:</label>
                    <input type="file" id="ioImportPicker" accept=".json" style="width: 100%;">
                </div>
            </div>
        `;

        const exportBtn = this.querySelector('#ioExportBtn');
        const importPicker = this.querySelector('#ioImportPicker');

        // --- EXPORT PIPELINE ---
        exportBtn.onclick = async () => {
            // 1. Ask the app for its raw state data AND the session key (Safe in memory!)
            const exportEvent = new CustomEvent('app-export-request', {
                detail: { rawData: null, masterKey: null },
                cancelable: true
            });
            this.dispatchEvent(exportEvent);

            const { rawData, masterKey } = exportEvent.detail;
            if (!rawData) return;

            const envelope = {
                appId: this.appId,
                version: this.version,
                encrypted: this.isEncrypted,
                cryptoMetadata: {},
                payload: ""
            };

            // 2. Component encapsulates ALL crypto heavy lifting quietly
            if (this.isEncrypted && masterKey) {
                const rawString = JSON.stringify(rawData);
                const cryptoResult = await encryptPayload(rawString, masterKey);
                envelope.cryptoMetadata = { salt: cryptoResult.salt, iv: cryptoResult.iv };
                envelope.payload = cryptoResult.ciphertext;
            } else {
                envelope.payload = rawData;
            }

            // 3. Handle file system saving natively
            const timestamp = new Date().toISOString().split('T')[0];
            const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.appId}_backup_${timestamp}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };

        // --- IMPORT PIPELINE ---
        importPicker.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const envelope = JSON.parse(event.target.result);
                    
                    if (!envelope || envelope.appId !== this.appId) {
                        alert("Incompatible backup file: App ID mismatch.");
                        return;
                    }

                    // Request the current session password to try decrypting seamlessly
                    const keyEvent = new CustomEvent('app-key-request', {
                        detail: { masterKey: null },
                        cancelable: true
                    });
                    this.dispatchEvent(keyEvent);
                    let activeKey = keyEvent.detail.masterKey;

                    let clearData = null;

                    if (envelope.encrypted) {
                        if (!activeKey) {
                            // Fallback if the file requires a password but the app is open blank
                            activeKey = prompt("Enter the passphrase to decrypt this backup file:");
                            if (!activeKey) return;
                        }

                        // Run decryption locally inside the component block
                        const decryptedString = await decryptPayload(
                            envelope.payload,
                            activeKey,
                            envelope.cryptoMetadata.salt,
                            envelope.cryptoMetadata.iv
                        );
                        clearData = JSON.parse(decryptedString);
                    } else {
                        clearData = envelope.payload;
                    }

                    // Hand clean data right to the app
                    this.dispatchEvent(new CustomEvent('app-import-success', {
                        detail: { data: clearData }
                    }));

                } catch (err) {
                    alert("Import failed. The file passphrase does not match your active session.");
                }
                importPicker.value = '';
            };
            reader.readAsText(file);
        };
    }
}
customElements.define('app-data-io', AppDataIO);