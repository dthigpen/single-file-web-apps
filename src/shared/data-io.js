class AppDataIO extends HTMLElement {
    connectedCallback() {
        this.appId = this.getAttribute('app-id');
        this.version = this.getAttribute('version') || '1.0.0';
        this.isEncrypted = this.hasAttribute('encrypted');

        this.innerHTML = `
            <div class="card" style="border: 1px solid #b0b0b0; padding: 8px; background: #fafafa; border-radius: 3px;">
                <h2 style="font-size: 13px; text-transform: uppercase; margin-top: 0; margin-bottom: 6px;">Data Management</h2>
                <p style="font-size: 11px; color: #555; margin-top: 0; margin-bottom: 10px; line-height: 1.4;">Save state payload down to device file storage, or import an active backup string.</p>
                <button id="ioExportBtn" class="btn" style="width: 100%; margin-bottom: 8px; padding: 4px; font-size: 11px;">Export Backup File</button>
                
                <div style="margin-top: 8px; border-top: 1px dashed #ccc; padding-top: 8px;">
                    <label style="display: block; font-size: 11px; font-weight: bold; margin-bottom: 4px;">Import Backup File:</label>
                    <input type="file" id="ioImportPicker" accept=".json" style="width: 100%; font-size: 11px;">
                </div>

                <div style="margin-top: 12px; border-top: 1px solid #000; padding-top: 8px;">
                    <button id="ioResetBtn" class="btn" style="width: 100%; padding: 4px; font-size: 11px; background: #fff5f5; color: #cc0000; border-color: #cc0000;">Reset Application (Wipe Everything)</button>
                </div>
            </div>
        `;

        const exportBtn = this.querySelector('#ioExportBtn');
        const importPicker = this.querySelector('#ioImportPicker');
        const resetBtn = this.querySelector('#ioResetBtn');

        // --- EXPORT PIPELINE (Remains unchanged) ---
        exportBtn.onclick = async () => {
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

            if (this.isEncrypted && masterKey) {
                const rawString = JSON.stringify(rawData);
                const cryptoResult = await encryptPayload(rawString, masterKey);
                envelope.cryptoMetadata = { salt: cryptoResult.salt, iv: cryptoResult.iv };
                envelope.payload = cryptoResult.ciphertext;
            } else {
                envelope.payload = rawData;
            }

            const timestamp = new Date().toISOString().split('T')[0];
            const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.appId}_backup_${timestamp}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };

        // --- IMPORT PIPELINE (Remains unchanged) ---
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

                    const keyEvent = new CustomEvent('app-key-request', {
                        detail: { masterKey: null },
                        cancelable: true
                    });
                    this.dispatchEvent(keyEvent);
                    let activeKey = keyEvent.detail.masterKey;
                    let clearData = null;

                    if (envelope.encrypted) {
                        if (!activeKey) {
                            activeKey = prompt("Enter the passphrase to decrypt this backup file:");
                            if (!activeKey) return;
                        }
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

        // --- NUCLEAR WIPE PIPELINE ---
        resetBtn.onclick = () => {
            const confirmWipe = confirm("Are you completely sure you want to wipe this application? This will permanently delete all local keys, database entries, and settings configurations.");
            if (confirmWipe) {
                localStorage.removeItem(this.appId);
                // Force a page refresh to throw the user back to a clean sandbox slate
                location.reload();
            }
        };
    }
}
customElements.define('app-data-io', AppDataIO);