// Universal App Identity Metadata
const APP_CONFIG = {
    appId: "totp-vault",
    version: "1.0.0",
    encrypted: true
};

const DEMO_DATA = [
    { label: "DEMO: GitHub Sandbox", secret: "JBSWY3DPEHPK3PXP", period: 30 },
    { label: "DEMO: Nextcloud Admin", secret: "ORXW233SMVZA4===", period: 30 }
];

// Volatile Runtime Memory (Purged cleanly on tab close or page loss)
let runtimeState = {
    masterKey: null,
    activeKeys: [],
    isDemoMode: false
};

// Storage Packing & Crypto Pipelines
async function saveAndSyncStorage() {
    const envelope = {
        appId: APP_CONFIG.appId,
        version: APP_CONFIG.version,
        encrypted: APP_CONFIG.encrypted,
        cryptoMetadata: {},
        payload: ""
    };

    if (APP_CONFIG.encrypted && runtimeState.masterKey) {
        const rawString = JSON.stringify(runtimeState.activeKeys);
        const result = await encryptPayload(rawString, runtimeState.masterKey);
        
        envelope.cryptoMetadata = {
            salt: result.salt,
            iv: result.iv
        };
        envelope.payload = result.ciphertext;
    } else {
        envelope.payload = runtimeState.activeKeys;
    }

    localStorage.setItem(APP_CONFIG.appId, JSON.stringify(envelope));
    return envelope;
}

// Dynamic UI Rendering Engine Loop
function buildUI() {
    const listContainer = document.getElementById("vault-list");
    listContainer.innerHTML = "";

    const onboarding = document.getElementById("onboarding-container");
    onboarding.style.display = runtimeState.isDemoMode ? "block" : "none";

    runtimeState.activeKeys.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "code-card";
        card.tabIndex = 0; 

        const label = document.createElement("div");
        label.className = "account-label";
        
        if (runtimeState.isDemoMode) {
            const badge = document.createElement("span");
            badge.className = "demo-badge";
            badge.textContent = "Demo";
            badge.style.marginRight = "4px";
            label.appendChild(badge);
        }
        
        label.appendChild(document.createTextNode(item.label));

        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";

        const token = document.createElement("div");
        token.className = "token-display";
        token.id = "token-" + index;
        token.textContent = "... ...";

        const badge = document.createElement("div");
        badge.className = "timer-text";
        badge.id = "timer-" + index;
        badge.textContent = "--s";

        row.appendChild(token);
        row.appendChild(badge);
        card.appendChild(label);
        card.appendChild(row);
        listContainer.appendChild(card);
    });

    populateProvisionerTextarea();
}

function populateProvisionerTextarea() {
    const textarea = document.getElementById("setup-raw");
    if (!textarea || runtimeState.isDemoMode) return;

    const rawLines = runtimeState.activeKeys.map(item => {
        return `${item.label},${item.secret},${item.period || 30}`;
    });
    textarea.value = rawLines.join("\n");
}

async function tickEngine() {
    const epoch = Math.floor(Date.now() / 1000);
    let minGlobalTime = 999;

    runtimeState.activeKeys.forEach((item, index) => {
        const period = item.period || 30;
        const remaining = period - (epoch % period);
        
        const badge = document.getElementById("timer-" + index);
        if (badge) badge.textContent = remaining + "s";

        if (remaining < minGlobalTime) {
            minGlobalTime = remaining;
        }

        const token = document.getElementById("token-" + index);
        if (token && (remaining === period || token.textContent === "... ...")) {
            calculateTOTP(item.secret, period).then(str => { 
                token.textContent = str; 
            });
        }
    });

    // const globalTimer = document.getElementById("global-timer");
    // if (globalTimer) globalTimer.textContent = minGlobalTime + "s";
}

// State Bootloader System
// State Bootloader System
document.addEventListener('DOMContentLoaded', () => {
    const ioComponent = document.getElementById('dataManager');
    const storedData = localStorage.getItem(APP_CONFIG.appId);

    // 1. Initial Storage Assessment
    if (!storedData) {
        // No storage data: Load standard demo profile automatically
        runtimeState.isDemoMode = true;
        runtimeState.activeKeys = DEMO_DATA;
        
        // ✨ Reveal workspace immediately since there's no password yet
        document.getElementById('appWorkspace').style.display = 'block'; 
        buildUI();
        setInterval(tickEngine, 1000);
    } else {
        // Active data found: Initialize the Component Loader
        const lock = document.createElement('app-lockscreen');
        lock.setAttribute('app-id', APP_CONFIG.appId);
        lock.setAttribute('app-name', 'TOTP Vault');
        lock.setAttribute('custom-desc', 'Access tokens will remain hidden until decrypted.');
        if (APP_CONFIG.encrypted) lock.setAttribute('encrypted', '');

        lock.addEventListener('app-unlocked-success', (e) => {
            const { password, data } = e.detail;
            
            runtimeState.isDemoMode = false;
            runtimeState.masterKey = password;
            runtimeState.activeKeys = data;
            
            // ✨ Reveal workspace ONLY after successful passphrase entry
            document.getElementById('appWorkspace').style.display = 'block'; 
            buildUI();
            setInterval(tickEngine, 1000);
        });

        document.body.appendChild(lock);
    }

    // 2. Data Management Subscriptions (Keep these exactly the same)
    ioComponent.addEventListener('app-export-request', (e) => {
        e.detail.rawData = runtimeState.activeKeys;
        e.detail.masterKey = runtimeState.masterKey;
    });

    ioComponent.addEventListener('app-key-request', (e) => {
        e.detail.masterKey = runtimeState.masterKey;
    });

    ioComponent.addEventListener('app-import-success', async (e) => {
        runtimeState.isDemoMode = false;
        runtimeState.activeKeys = e.detail.data;
        await saveAndSyncStorage();
        buildUI();
        tickEngine();
    });
});

// Interactive Workspace Controls
document.getElementById("toggle-setup-btn").addEventListener("click", () => {
    const pane = document.getElementById("setup-pane");
    pane.style.display = (pane.style.display === "block") ? "none" : "block";
    if (pane.style.display === "block") {
        pane.scrollIntoView({ behavior: 'smooth' });
    }
});

// Manual Text Compilation Parser Button
// Manual Text Compilation Parser Button
document.getElementById("encrypt-trigger-btn").addEventListener("click", async () => {
    const rawText = document.getElementById("setup-raw").value.trim();

    if (!rawText) {
        alert("Credentials field cannot be left blank.");
        return;
    }

    // 1. Parse the text fields into a clean array first
    const parsedEntries = [];
    const lines = rawText.split("\n");
    for (let line of lines) {
        let parts = line.split(",");
        if (parts.length < 2) continue;
        
        let label = parts[0].trim();
        let secret = parts[1].replace(/\s+/g, "").trim();
        let period = (parts.length >= 3) ? parseInt(parts[2].trim(), 10) : 30;
        if (isNaN(period)) period = 30;

        parsedEntries.push({ label, secret, period });
    }

    // handle setting up keys for first time, from demo mode
    if (runtimeState.isDemoMode && !runtimeState.masterKey) {
        // Intercept execution and spin up the initialization lockscreen wrapper!
        const lock = document.createElement('app-lockscreen');
        lock.setAttribute('app-id', APP_CONFIG.appId);
        // Force the lockscreen into "Create Passphrase" mode
        lock.setAttribute('fresh-run', ''); 

        lock.addEventListener('app-unlocked-success', async (e) => {
            // Capture the password they just created
            runtimeState.masterKey = e.detail.password;
            runtimeState.isDemoMode = false;
            runtimeState.activeKeys = parsedEntries;

            // Commit the freshly encrypted payload to storage disk safely
            await saveAndSyncStorage();
            
            // Clean up the display panels
            document.getElementById("setup-pane").style.display = "none";
            buildUI();
            tickEngine();
            alert("Vault created and secured successfully!");
        });

        document.body.appendChild(lock);
        return; // Halt main thread until the component callback fires successfully
    }

    // 3. Normal Flow: User is already unlocked/logged in, just overwrite and save
    try {
        runtimeState.activeKeys = parsedEntries;
        await saveAndSyncStorage();
        buildUI();
        tickEngine();
        alert("Vault successfully updated in storage!");
    } catch (err) {
        alert("Save failure: " + err.message);
    }
});