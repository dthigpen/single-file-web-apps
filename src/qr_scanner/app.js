import { useSignal } from '@preact/signals';
import htm from 'htm';
import { h, render } from 'preact';
import { decodeQrFromFile } from '../shared/qrEngine.js';

const html = htm.bind(h);

function QrScannerApp() {
    const scanResult = useSignal('');
    const errLog = useSignal('');
    const statusText = useSignal('Ready');

    const triggerFileCapture = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        errLog.value = '';
        scanResult.value = '';
        statusText.value = 'Analyzing photo bits...';

        try {
            const rawText = await decodeQrFromFile(file);
            scanResult.value = rawText;
            statusText.value = 'Successfully decoded code!';
        } catch (err) {
            errLog.value = err.message;
            statusText.value = 'Scan failed.';
        }
    };

    return html`
        <div class="app-workspace flex-container">
            <div class="card center-text">
                <div style="font-size: 2rem; margin-bottom: 4px;">📷</div>
                <h1>Quick Link Scanner</h1>
                <p>Snap a photo of a poster or timetable QR code to instantly extract the target web links.</p>

                <div style="margin: 12px 0;">
                    <label class="btn-secondary" style="display: block; padding: 10px; border-radius: 4px; font-weight: bold; cursor: pointer; border: 1px solid #ccc; text-align: center; background: #e9ecef; font-size:0.9rem;">
                        📷 Launch System Camera
                        <input type="file" accept="image/*" capture="environment" onChange=${triggerFileCapture} style="display: none;" />
                    </label>
                </div>

                <div style="font-size: 0.8rem; color: #666; margin-bottom: 8px;">Status: ${statusText}</div>

                ${
                    scanResult.value
                        ? html`
                    <div style="background: #ebfbee; border: 1px solid #2b8a3e; padding: 8px; border-radius: 4px; text-align: left; margin-top: 8px;">
                        <span style="font-size: 0.75rem; font-weight: bold; color: #2b8a3e; display: block; margin-bottom: 2px;">Decoded Payload Content:</span>
                        
                        ${
                            scanResult.value.startsWith('http')
                                ? html`<a href="${scanResult.value}" target="_blank" style="font-size: 0.85rem; font-weight: bold; word-break: break-all; color: #0066cc;">${scanResult.value}</a>`
                                : html`<div style="font-family: monospace; font-size: 0.85rem; word-break: break-all;">${scanResult.value}</div>`
                        }
                    </div>
                `
                        : null
                }

                ${
                    errLog.value
                        ? html`
                    <div style="background: #fff5f5; border: 1px solid #ffd1d1; color: #cc0000; padding: 6px; border-radius: 4px; font-size: 0.8rem; margin-top: 8px; text-align: left;">
                        ❌ ${errLog.value}
                    </div>
                `
                        : null
                }
            </div>
        </div>
    `;
}

render(html`<${QrScannerApp} />`, document.getElementById('app'));
