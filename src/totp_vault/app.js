import { h, render } from 'preact';
import { useEffect } from 'preact/hooks';
import { useSignal, useComputed } from '@preact/signals';
import htm from 'htm';

import { 
    isUnlocked, 
    globalVault, 
    addCredential, 
    updateCredential,
    deleteCredential, 
    timeStepTicker,
    exportVaultFile,
    importVaultFile,
    rotateMasterPassphrase,
    factoryResetDatabase
} from './vaultController.js';

import { Lockscreen } from '../shared/components/Lockscreen.js';
import { generateTOTP, getSecondsRemaining } from './totpEngine.js';

const html = htm.bind(h);

/**
 * Compact Token Row component optimized for 240px wide viewport boundaries
 */
function TokenRow({ item }) {
    const isEditing = useSignal(false);
    const editLabel = useSignal(item.label);
    const editSecret = useSignal(item.secret);

    const activeToken = useSignal('------');
    const errState = useSignal(false);

    const secondsLeft = useComputed(() => {
        timeStepTicker.value;
        return getSecondsRemaining();
    });

    useEffect(() => {
        generateTOTP(item.secret)
            .then(code => {
                activeToken.value = code;
                errState.value = false;
            })
            .catch(() => {
                activeToken.value = 'ERROR';
                errState.value = true;
            });
    }, [secondsLeft.value, item.secret]);

    const formattedToken = useComputed(() => {
        if (activeToken.value.length !== 6) return activeToken.value;
        return `${activeToken.value.slice(0, 3)} ${activeToken.value.slice(3)}`;
    });

    const handleSaveEdit = (e) => {
        e.preventDefault();
        if (!editLabel.value.trim() || !editSecret.value.trim()) return;
        updateCredential(item.id, editLabel.value, editSecret.value);
        isEditing.value = false;
    };

    if (isEditing.value) {
        return html`
            <div class="card" style="border-left: 3px solid #0066cc;">
                <form onSubmit=${handleSaveEdit}>
                    <span style="font-size: 0.75rem; font-weight: bold; color: #666;">Edit Account</span>
                    <input type="text" value=${editLabel} onInput=${e => editLabel.value = e.target.value} placeholder="Label" />
                    <input type="text" value=${editSecret} onInput=${e => editSecret.value = e.target.value} placeholder="Secret" />
                    <div style="display: flex; gap: 4px; justify-content: flex-end;">
                        <button type="button" class="btn-secondary" onClick=${() => { isEditing.value = false; }} style="height: 28px; font-size: 0.8rem; padding: 0 8px;">Cancel</button>
                        <button type="submit" style="height: 28px; font-size: 0.8rem; padding: 0 8px;">Save</button>
                    </div>
                </form>
            </div>
        `;
    }

    return html`
        <div class="card" style="padding: 6px 8px; margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span style="font-size: 0.85rem; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px;">
                    ${item.label}
                </span>
                <span style="font-size: 0.75rem; font-weight: bold; color: ${secondsLeft.value <= 5 ? '#cc0000' : '#666'};">
                    ${secondsLeft}s
                </span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-family: monospace; font-size: 1.4rem; font-weight: bold; color: ${errState.value ? '#cc0000' : '#0066cc'}; letter-spacing: 0.5px;">
                    ${formattedToken}
                </div>
                <div style="display: flex; gap: 4px;">
                    <button onClick=${() => isEditing.value = true} class="btn-secondary" style="height: 24px; padding: 0 6px; font-size: 0.75rem; width: auto;">Edit</button>
                    <button onClick=${() => deleteCredential(item.id)} class="btn-secondary" style="height: 24px; padding: 0 6px; font-size: 0.75rem; width: auto; color: #cc0000; border-color: #ffd1d1;">Del</button>
                </div>
            </div>
        </div>
    `;
}

function TotpAppRoot() {
    if (!isUnlocked.value) {
        return html`<${Lockscreen} appId="totp-vault" appName="TOTP Credentials Vault" />`;
    }

    const newLabel = useSignal('');
    const newSecret = useSignal('');
    const formError = useSignal('');
    const importError = useSignal('');
    const isSettingsOpen = useSignal(false);

    const pendingFileText = useSignal(null);
    const showImportPasswordPrompt = useSignal(false);
    const importBackupPassword = useSignal('');

    const newMasterPassword = useSignal('');
    const confirmMasterPassword = useSignal('');
    const rotationSuccessMessage = useSignal('');

    useEffect(() => {
        const timer = setInterval(() => {
            timeStepTicker.value = Math.floor(Date.now() / 1000);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleFormSubmit = (e) => {
        e.preventDefault();
        formError.value = '';
        if (!newLabel.value.trim() || !newSecret.value.trim()) {
            formError.value = "Required fields blank.";
            return;
        }
        addCredential(newLabel.value, newSecret.value);
        newLabel.value = '';
        newSecret.value = '';
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        importError.value = '';
        showImportPasswordPrompt.value = false;
        pendingFileText.value = null;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const fileText = event.target.result;
            try {
                const result = await importVaultFile(fileText);
                if (result.requiresPasswordOverride) {
                    pendingFileText.value = fileText;
                    showImportPasswordPrompt.value = true;
                } else if (result.success) {
                    isSettingsOpen.value = false;
                }
            } catch (err) {
                importError.value = err.message;
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleImportPasswordSubmit = async (e) => {
        e.preventDefault();
        importError.value = '';
        try {
            const result = await importVaultFile(pendingFileText.value, importBackupPassword.value);
            if (result.success) {
                isSettingsOpen.value = false;
                pendingFileText.value = null;
                showImportPasswordPrompt.value = false;
                importBackupPassword.value = '';
            }
        } catch (err) {
            importError.value = err.message;
        }
    };

    const handleRotatePasswordSubmit = async (e) => {
        e.preventDefault();
        importError.value = '';
        rotationSuccessMessage.value = '';

        if (!newMasterPassword.value || newMasterPassword.value !== confirmMasterPassword.value) {
            importError.value = "Entries mismatch.";
            return;
        }

        try {
            await rotateMasterPassphrase(newMasterPassword.value);
            rotationSuccessMessage.value = "Passphrase rotated!";
            newMasterPassword.value = '';
            confirmMasterPassword.value = '';
        } catch (err) {
            importError.value = err.message;
        }
    };

    return html`
        <div class="app-workspace">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; padding: 0 2px;">
                <h1 style="font-size: 1.1rem; margin: 0;">Vault</h1>
                <div style="display: flex; gap: 4px;">
                    <button onClick=${() => { isSettingsOpen.value = !isSettingsOpen.value; importError.value=''; rotationSuccessMessage.value=''; showImportPasswordPrompt.value=false; }} class="btn-secondary" style="font-size: 0.75rem; padding: 0 6px; height: 26px; width: auto;">
                        ${isSettingsOpen.value ? "Close" : "Sync"}
                    </button>
                    <button onClick=${() => location.reload()} style="font-size: 0.75rem; padding: 0 6px; height: 26px; width: auto;">Lock</button>
                </div>
            </div>

            ${isSettingsOpen.value ? html`
                <div class="card" style="background: #fdfdfd; border: 1px solid #0066cc; padding: 8px; display: flex; flex-direction: column; gap: 10px;">
                    <div>
                        <h2 style="font-size: 0.9rem; margin-bottom: 4px;">Data Sync</h2>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 6px;">
                            <button onClick=${exportVaultFile} style="font-size:0.8rem; height: 30px;">Download Backup</button>
                            <div style="font-size: 0.75rem;">
                                <span style="display:block; margin-bottom:2px; font-weight:bold;">Import File:</span>
                                <input type="file" accept=".json" onChange=${handleFileUpload} style="font-size: 0.75rem; height: auto; padding: 2px;" />
                            </div>
                        </div>
                    </div>

                    ${showImportPasswordPrompt.value ? html`
                        <div style="background: #fff9db; padding: 6px; border-radius: 4px; border: 1px solid #f59f00;">
                            <span style="font-size: 0.75rem; font-weight:bold; color: #e67e22; display:block; margin-bottom:2px;">Passphrase Required:</span>
                            <form onSubmit=${handleImportPasswordSubmit} style="display: flex; flex-direction: row; gap: 4px;">
                                <input type="password" value=${importBackupPassword} onInput=${e => importBackupPassword.value = e.target.value} placeholder="Password" style="height:26px; font-size:0.8rem; flex-grow:1;" />
                                <button type="submit" style="font-size: 0.75rem; height:26px; width:auto; padding: 0 8px;">Verify</button>
                            </form>
                        </div>
                    ` : null}

                    <hr style="border: 0; border-top: 1px dashed #ddd; margin: 2px 0;" />

                    <div>
                        <h2 style="font-size: 0.9rem; margin-bottom: 4px;">Rotate Password</h2>
                        <form onSubmit=${handleRotatePasswordSubmit} style="gap: 4px;">
                            <input type="password" value=${newMasterPassword} onInput=${e => newMasterPassword.value = e.target.value} placeholder="New Password" style="height:28px; font-size:0.8rem;" />
                            <input type="password" value=${confirmMasterPassword} onInput=${e => confirmMasterPassword.value = e.target.value} placeholder="Confirm" style="height:28px; font-size:0.8rem;" />
                            <button type="submit" style="font-size: 0.8rem; height: 28px;">Update Key</button>
                        </form>
                    </div>

                    ${importError.value ? html`<div style="color: #cc0000; font-size: 0.75rem; background: #fff5f5; padding: 4px;">${importError.value}</div>` : null}
                    ${rotationSuccessMessage.value ? html`<div style="color: #2b8a3e; font-size: 0.75rem; background: #ebfbee; padding: 4px;">${rotationSuccessMessage.value}</div>` : null}
                </div>
            ` : null}

            <div>
                ${globalVault.value.length === 0 
                    ? html`<div class="card" style="text-align: center; color: #777; padding: 16px; border-style: dashed; font-size: 0.85rem;">No credentials saved yet. Add keys below.</div>`
                    : globalVault.value.map(item => html`<${TokenRow} key=${item.id} item=${item} />`)
                }
            </div>

            <div class="card" style="margin-top: 4px;">
                <h2 style="font-size: 0.9rem; margin-bottom: 4px;">Add New Account</h2>
                <form onSubmit=${handleFormSubmit} style="gap: 4px;">
                    <input type="text" placeholder="Label (e.g. GitHub)" value=${newLabel} onInput=${e => newLabel.value = e.target.value} style="height: 28px; font-size: 0.8rem;" />
                    <input type="text" placeholder="Base32 Secret" value=${newSecret} onInput=${e => newSecret.value = e.target.value} autocomplete="off" autocapitalize="none" style="height: 28px; font-size: 0.8rem;" />
                    
                    ${formError.value ? html`<p style="color: #cc0000; font-size: 0.75rem; margin: 0;">${formError.value}</p>` : null}
                    <button type="submit" style="margin-top: 2px; height: 30px; font-size: 0.85rem;">Store Token</button>
                </form>
            </div>

            <div style="text-align: center; margin-top: 16px; padding-top: 8px; border-top: 1px dashed #ddd;">
                <button onClick=${factoryResetDatabase} style="background: none; color: #cc0000; font-size: 0.7rem; text-decoration: underline; padding: 2px; width:auto; height:auto; font-weight:normal;">
                    Destroy Persistent Store Profile
                </button>
            </div>
        </div>
    `;
}

render(html`<${TotpAppRoot} />`, document.getElementById('app'));