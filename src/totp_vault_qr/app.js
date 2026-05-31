import { h, render } from 'preact';
import { useEffect } from 'preact/hooks';
import { useSignal, useComputed } from '@preact/signals';
import htm from 'htm';

// Import core logic foundations out of our original controller blueprint
import { 
    isUnlocked, globalVault, addCredential, updateCredential, deleteCredential, 
    timeStepTicker, exportVaultFile, importVaultFile, rotateMasterPassphrase, factoryResetDatabase
} from '../totp_vault/vaultController.js';

import { Lockscreen } from '../shared/components/Lockscreen.js';
import { generateTOTP, getSecondsRemaining } from '../totp_vault/totpEngine.js';

// 🧪 Bring in our newly forged shared QR and Text ingestion pipeline mechanics
import { decodeQrFromFile, parseUniversalTextImport } from '../shared/qrEngine.js';

const html = htm.bind(h);

// ... Reuse the same lean TokenRow component matching your core mobile interface structure ...
function TokenRow({ item }) {
    const isEditing = useSignal(false);
    const editLabel = useSignal(item.label);
    const editSecret = useSignal(item.secret);
    const activeToken = useSignal('------');
    const secondsLeft = useComputed(() => { timeStepTicker.value; return getSecondsRemaining(); });

    useEffect(() => {
        generateTOTP(item.secret).then(code => { activeToken.value = code; }).catch(() => { activeToken.value = 'ERROR'; });
    }, [secondsLeft.value, item.secret]);

    const formattedToken = useComputed(() => activeToken.value.length === 6 ? `${activeToken.value.slice(0, 3)} ${activeToken.value.slice(3)}` : activeToken.value);

    if (isEditing.value) {
        return html`
            <div class="card" style="border-left: 3px solid #0066cc;">
                <form onSubmit=${(e) => { e.preventDefault(); updateCredential(item.id, editLabel.value, editSecret.value); isEditing.value = false; }}>
                    <input type="text" value=${editLabel} onInput=${e => editLabel.value = e.target.value} />
                    <input type="text" value=${editSecret} onInput=${e => editSecret.value = e.target.value} />
                    <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button type="button" class="btn-secondary" onClick=${() => isEditing.value = false} style="height: 28px; font-size: 0.8rem; padding: 0 8px; width:auto;">Cancel</button>
                        <button type="submit" style="height: 28px; font-size: 0.8rem; padding: 0 8px; width:auto;">Save</button>
                    </div>
                </form>
            </div>
        `;
    }

    return html`
        <div class="card" style="padding: 6px 8px; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="font-size: 0.85rem; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px;">${item.label}</span>
                <span style="font-size: 0.75rem; font-weight: bold; color: ${secondsLeft.value <= 5 ? '#cc0000' : '#666'};">${secondsLeft}s</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-family: monospace; font-size: 1.4rem; font-weight: bold; color: #0066cc;">${formattedToken}</div>
                <div style="display: flex; gap: 4px;">
                    <button onClick=${() => isEditing.value = true} class="btn-secondary" style="height: 24px; padding: 0 6px; font-size: 0.75rem; width: auto;">Edit</button>
                    <button onClick=${() => deleteCredential(item.id)} class="btn-secondary" style="height: 24px; padding: 0 6px; font-size: 0.75rem; width: auto; color: #cc0000; border-color: #ffd1d1;">Del</button>
                </div>
            </div>
        </div>
    `;
}

function TotpAppRoot() {
    if (!isUnlocked.value) return html`<${Lockscreen} appId="totp-vault" appName="TOTP Credentials Vault" />`;

    const newLabel = useSignal('');
    const newSecret = useSignal('');
    const formError = useSignal('');
    const advancePanelError = useSignal('');
    const advancePanelSuccess = useSignal('');
    const isSettingsOpen = useSignal(false);
    const rawImportTextArea = useSignal('');

    useEffect(() => {
        const timer = setInterval(() => { timeStepTicker.value = Math.floor(Date.now() / 1000); }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 📸 Execution Loop handler for native device snap configuration
    const handleCameraPhotoCapture = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        advancePanelError.value = '';
        advancePanelSuccess.value = '';
        
        try {
            const rawTextPayload = await decodeQrFromFile(file);
            processTextTokens(rawTextPayload);
        } catch (err) {
            advancePanelError.value = err.message;
        }
        e.target.value = '';
    };

    // 📝 Execution Loop handler for direct copy-paste string streams
    const handleTextStreamSubmit = (e) => {
        e.preventDefault();
        advancePanelError.value = '';
        advancePanelSuccess.value = '';

        try {
            processTextTokens(rawImportTextArea.value);
            rawImportTextArea.value = ''; // Flush input container
        } catch (err) {
            advancePanelError.value = err.message;
        }
    };

    // Helper utility method to commit parsed structural components straight into memory
    const processTextTokens = (textDataString) => {
        const structuralItems = parseUniversalTextImport(textDataString);
        if (structuralItems.length === 0) return;

        if (confirm(`Parsed ${structuralItems.length} secret tokens successfully. Append them into your current active profile database storage context?`)) {
            // Unroll arrays into local reactive working memory context
            const workingCluster = [...globalVault.value];
            structuralItems.forEach(target => {
                workingCluster.push({
                    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
                    label: target.label,
                    secret: target.secret
                });
            });
            globalVault.value = workingCluster;
            advancePanelSuccess.value = `Successfully merged ${structuralItems.length} accounts!`;
        }
    };

    return html`
        <div class="app-workspace">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <h1 style="font-size: 1.1rem; margin: 0;">🔐 Vault QR-Plus</h1>
                <button onClick=${() => { isSettingsOpen.value = !isSettingsOpen.value; advancePanelError.value=''; advancePanelSuccess.value=''; }} class="btn-secondary" style="font-size: 0.75rem; padding: 0 6px; height: 26px; width: auto;">
                    ${isSettingsOpen.value ? "Close" : "Ingest Menu"}
                </button>
            </div>

            ${isSettingsOpen.value ? html`
                <div class="card" style="background: #fdfdfd; border: 1px solid #0066cc; padding: 8px; display: flex; flex-direction: column; gap: 8px;">
                    
                    <div>
                        <span style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 2px;">Ingest via Photo QR:</span>
                        <label class="btn-secondary" style="display: block; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; text-align: center; font-size:0.8rem; height: auto;">
                            📷 Snap Account Code
                            <input type="file" accept="image/*" capture="environment" onChange=${handleCameraPhotoCapture} style="display: none;" />
                        </label>
                    </div>

                    <hr style="border: 0; border-top: 1px dashed #ddd; margin: 4px 0;" />

                    <div>
                        <span style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 2px;">Bulk Paste (Aegis JSON or otpauth://):</span>
                        <form onSubmit=${handleTextStreamSubmit} style="gap: 4px;">
                            <textarea 
                                value=${rawImportTextArea} 
                                onInput=${e => rawImportTextArea.value = e.target.value} 
                                placeholder="Paste text data streams here..." 
                                style="width: 100%; height: 60px; font-family: monospace; font-size: 0.75rem; padding: 4px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"
                            ></textarea>
                            <button type="submit" style="font-size: 0.8rem; height: 28px;">Parse & Merge Stream</button>
                        </form>
                    </div>

                    <hr style="border: 0; border-top: 1px dashed #ddd; margin: 4px 0;" />

                    <div>
                        <span style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 2px;">Native Actions:</span>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                            <button onClick=${exportVaultFile} style="font-size:0.75rem; height: 26px; padding:0;">Backup File</button>
                            <label class="btn-secondary" style="display: block; padding: 4px; border-radius: 4px; font-weight: bold; cursor: pointer; text-align: center; font-size:0.75rem; height: 26px; border: 1px solid #ced4da;">
                                Import Backup
                                <input type="file" accept=".json" onChange=${async (e) => { const file = e.target.files[0]; if(file){const text = await file.text(); importVaultFile(text); isSettingsOpen.value=false;} }} style="display: none;" />
                            </label>
                        </div>
                    </div>

                    ${advancePanelError.value ? html`<div style="color: #cc0000; font-size: 0.75rem; background: #fff5f5; padding: 4px; border-radius:3px;">❌ ${advancePanelError.value}</div>` : null}
                    ${advancePanelSuccess.value ? html`<div style="color: #2b8a3e; font-size: 0.75rem; background: #ebfbee; padding: 4px; border-radius:3px;">💎 ${advancePanelSuccess.value}</div>` : null}
                </div>
            ` : null}

            <div style="margin-top: 4px;">
                ${globalVault.value.length === 0 
                    ? html`<div class="card" style="text-align: center; color: #777; padding: 16px; border-style: dashed; font-size: 0.85rem;">No credentials saved yet. Enter or ingest keys below.</div>`
                    : globalVault.value.map(item => html`<${TokenRow} key=${item.id} item=${item} />`)
                }
            </div>

            <div class="card" style="margin-top: 4px;">
                <h2 style="font-size: 0.9rem; margin-bottom: 4px;">Add Single Token</h2>
                <form onSubmit=${(e) => { e.preventDefault(); if(!newLabel.value.trim()||!newSecret.value.trim()){formError.value="Fields required."; return;} addCredential(newLabel.value,newSecret.value); newLabel.value=''; newSecret.value=''; formError.value=''; }} style="gap: 4px;">
                    <input type="text" placeholder="Label" value=${newLabel} onInput=${e => newLabel.value = e.target.value} style="height: 28px; font-size: 0.8rem;" />
                    <input type="text" placeholder="Base32 Key" value=${newSecret} onInput=${e => newSecret.value = e.target.value} autocomplete="off" style="height: 28px; font-size: 0.8rem;" />
                    ${formError.value ? html`<p style="color: #cc0000; font-size: 0.75rem; margin: 0;">${formError.value}</p>` : null}
                    <button type="submit" style="margin-top: 2px; height: 30px; font-size: 0.85rem;">Store Single Key</button>
                </form>
            </div>
            
            <div style="text-align: center; margin-top: 12px; padding-top: 6px; border-top: 1px dashed #ddd;">
                <button onClick=${factoryResetDatabase} style="background: none; color: #cc0000; font-size: 0.7rem; text-decoration: underline; padding: 2px; width:auto; height:auto; font-weight:normal;">Wipe Database Store</button>
            </div>
        </div>
    `;
}

render(html`<${TotpAppRoot} />`, document.getElementById('app'));