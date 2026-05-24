// totp_app/app.js

const STORAGE_KEY = "vault_encrypted_data";

const DEMO_DATA = [
    { label: "DEMO: GitHub Sandbox", secret: "JBSWY3DPEHPK3PXP", period: 30 },
    { label: "DEMO: Nextcloud Admin", secret: "ORXW233SMVZA4===", period: 30 }
];

let activeKeys = [];
let isDemoMode = false;

// Dynamic rendering
function buildUI() {
    const listContainer = document.getElementById("vault-list");
    listContainer.innerHTML = "";

    const onboarding = document.getElementById("onboarding-container");
    onboarding.style.display = isDemoMode ? "block" : "none";

    if (!window.crypto || !window.crypto.subtle) {
        listContainer.innerHTML = "<div style='color:red; font-size:12px; padding:8px;'>ERR: Insecure context! Open via local file system or HTTPS.</div>";
        return;
    }

    activeKeys.forEach((item, index) => {
        const card = document.createElement("div");
        card.className = "code-card";
        card.tabIndex = 0; 

        const label = document.createElement("div");
        label.className = "account-label";
        
        if (isDemoMode) {
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
    tickEngine();
}

function populateProvisionerTextarea() {
    const textarea = document.getElementById("setup-raw");
    if (!textarea || isDemoMode) return;

    const rawLines = activeKeys.map(item => {
        const period = item.period || 30;
        return item.label + "," + item.secret + "," + period;
    });
    textarea.value = rawLines.join("\n");
}

async function tickEngine() {
    if (!window.crypto || !window.crypto.subtle) return;
    
    const epoch = Math.floor(Date.now() / 1000);
    let minGlobalTime = 999;

    activeKeys.forEach((item, index) => {
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

    document.getElementById("global-timer").textContent = minGlobalTime + "s";
}

async function initVault() {
    const localData = localStorage.getItem(STORAGE_KEY);

    if (!localData || localData.trim() === "") {
        isDemoMode = true;
        activeKeys = DEMO_DATA;
        buildUI();
        setInterval(tickEngine, 1000);
        return;
    }

    isDemoMode = false;
    let decryptedStr = null;
    
    while (decryptedStr === null) {
        let pass = prompt("Enter Master Password to open secure vault:");
        if (pass === null) {
            isDemoMode = true;
            activeKeys = DEMO_DATA;
            break;
        }
        try {
            decryptedStr = await decryptPayload(localData, pass);
            activeKeys = JSON.parse(decryptedStr);
        } catch (err) {
            alert("Invalid Password. Decryption failed.");
            decryptedStr = null;
        }
    }

    buildUI();
    setInterval(tickEngine, 1000);
}

// Interactive Subscriptions
document.getElementById("toggle-setup-btn").addEventListener("click", () => {
    const pane = document.getElementById("setup-pane");
    pane.style.display = (pane.style.display === "block") ? "none" : "block";
    if (pane.style.display === "block") {
        pane.scrollIntoView({ behavior: 'smooth' });
    }
});

// File Import Handler with strict Passphrase Validation Gate
document.getElementById("file-load-btn").addEventListener("click", () => {
    const fileInput = document.getElementById("import-file-input");
    const passwordInput = document.getElementById("import-file-pass").value;

    if (!fileInput.files.length) {
        alert("Please select a vault payload file first.");
        return;
    }
    if (!passwordInput) {
        alert("You must supply the validation passphrase to test the file container.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(e) {
        const rawContentString = e.target.result.trim();
        
        try {
            // Attempt decryption check *before* writing anything to localStorage
            await decryptPayload(rawContentString, passwordInput);
            
            // Verification passed safely
            localStorage.setItem(STORAGE_KEY, rawContentString);
            alert("Success! File verified and loaded to storage. Restarting application context...");
            window.location.reload();
        } catch (err) {
            alert("Lockout Prevention Block: The passphrase provided could not unlock the selected file structure. Storage was not updated.");
        }
    };

    reader.readAsText(file);
});

// New Account Collection Creation with Confirmation matching checks
document.getElementById("encrypt-trigger-btn").addEventListener("click", async () => {
    const rawText = document.getElementById("setup-raw").value.trim();
    const passphrase = document.getElementById("setup-pass").value;
    const confirmPassphrase = document.getElementById("setup-pass-confirm").value;

    if (!rawText || !passphrase) {
        alert("Both credentials data arrays and passphrase values are required elements.");
        return;
    }

    // Double-check block comparison
    if (passphrase !== confirmPassphrase) {
        alert("Input Mismatch: The passphrase and confirmation pass blocks do not match.");
        return;
    }

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

    try {
        const cipherText = await encryptPayload(JSON.stringify(parsedEntries), passphrase);
        
        localStorage.setItem(STORAGE_KEY, cipherText);
        
        document.getElementById("setup-output").textContent = cipherText;
        document.getElementById("setup-output-container").style.display = "block";
        
        alert("Vault written and saved successfully!");
    } catch (err) {
        alert("Compilation failed: " + err.message);
    }
});

window.addEventListener("DOMContentLoaded", initVault);