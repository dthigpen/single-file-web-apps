// Universal App Identity Metadata
const APP_CONFIG = {
    appId: "example-tasks",
    version: "1.0.0",
    encrypted: true
};

// Volatile Runtime Memory (Purged cleanly on tab close or page loss)
let runtimeState = {
    masterKey: null, 
    todoData: { items: [] }
};

// Default layout configuration used for fresh system footprints
const DEFAULT_STATE = {
    items: [
        { id: 1, text: "Verify preprocessor script compilation" },
        { id: 2, text: "Test Blob execution on target handset" }
    ]
};

// UI Rendering Engine Loop (Plain function approach for app-specific tasks)
function renderTasks() {
    const container = document.getElementById('taskList');
    container.innerHTML = '';

    if (!runtimeState.todoData.items || runtimeState.todoData.items.length === 0) {
        container.innerHTML = '<p style="font-style: italic; color: #888;">No tasks listed.</p>';
        return;
    }

    runtimeState.todoData.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'todo-item';
        
        const label = document.createElement('span');
        label.className = 'todo-text';
        label.innerText = item.text;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-secondary';
        deleteBtn.innerText = 'Remove';
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.onclick = () => removeTask(item.id);

        row.appendChild(label);
        row.appendChild(deleteBtn);
        container.appendChild(row);
    });
}

function addNewTask() {
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    if (!text) return;

    const newItem = {
        id: Date.now(),
        text: text
    };

    runtimeState.todoData.items.push(newItem);
    input.value = '';
    saveAndSyncStorage();
    renderTasks();
}

function removeTask(id) {
    runtimeState.todoData.items = runtimeState.todoData.items.filter(item => item.id !== id);
    saveAndSyncStorage();
    renderTasks();
}

async function saveAndSyncStorage() {
    const envelope = {
        appId: APP_CONFIG.appId,
        version: APP_CONFIG.version,
        encrypted: APP_CONFIG.encrypted,
        cryptoMetadata: {},
        payload: ""
    };

    if (APP_CONFIG.encrypted && runtimeState.masterKey) {
        // Run data through the real AES-GCM pipeline
        const rawString = JSON.stringify(runtimeState.todoData);
        const result = await encryptPayload(rawString, runtimeState.masterKey);
        
        envelope.cryptoMetadata = {
            salt: result.salt,
            iv: result.iv
        };
        envelope.payload = result.ciphertext;
    } else {
        envelope.payload = runtimeState.todoData;
    }

    localStorage.setItem(APP_CONFIG.appId, JSON.stringify(envelope));
    return envelope;
}

// Component Ingestion & State Bootloader
function triggerLockscreenUI(isFresh = false) {
    const lockscreen = document.createElement('app-lockscreen');
    lockscreen.setAttribute('title', isFresh ? 'Create Master Passphrase' : 'Database Locked');
    lockscreen.setAttribute('desc', isFresh ? 'Set a password to encrypt your local app database.' : 'Enter your password to decrypt your data.');
    if (isFresh) lockscreen.setAttribute('fresh-run', '');

    lockscreen.addEventListener('app-unlock', async (e) => {
        const password = e.detail.password;
        
        try {
            if (isFresh) {
                runtimeState.masterKey = password;
                runtimeState.todoData = DEFAULT_STATE;
                await saveAndSyncStorage(); // Await storage sync completion
                lockscreen.remove();
                document.getElementById('appWorkspace').style.display = 'block';
                renderTasks();
            } else {
                const rawStored = localStorage.getItem(APP_CONFIG.appId);
                const envelope = JSON.parse(rawStored);

                // Execute actual Web Crypto AES-GCM translation pass
                const decryptedString = await decryptPayload(
                    envelope.payload,
                    password,
                    envelope.cryptoMetadata.salt,
                    envelope.cryptoMetadata.iv
                );

                // If string decrypts into correct syntax, assign keys to runtime tracking state
                runtimeState.masterKey = password;
                runtimeState.todoData = JSON.parse(decryptedString);
                
                lockscreen.remove();
                document.getElementById('appWorkspace').style.display = 'block';
                renderTasks();
            }
        } catch (err) {
            console.error(err);
            lockscreen.showError(); // Handles wrong passwords flawlessly because decryption crashes natively
        }
    });
    lockscreen.addEventListener('app-reset', () => {
        localStorage.removeItem(APP_CONFIG.appId);
        location.reload();
    });

    document.body.appendChild(lockscreen);
}

// Application Lifecycle Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const storedData = localStorage.getItem(APP_CONFIG.appId);
    const ioComponent = document.getElementById('dataManager');
    

    // 1. Initialize and Mount the Lockscreen Loader
    const lock = document.createElement('app-lockscreen');
    lock.setAttribute('app-id', APP_CONFIG.appId);
    if (APP_CONFIG.encrypted) lock.setAttribute('encrypted', '');

    // 2. Simply receive verified cleartext data on a successful unlock
    lock.addEventListener('app-unlocked-success', (e) => {
        const { password, data, isFreshRun } = e.detail;
        
        runtimeState.masterKey = password;
        runtimeState.todoData = isFreshRun ? DEFAULT_STATE : data;
        
        if (isFreshRun) saveAndSyncStorage(); // Initial seed commit to storage disk
        
        document.getElementById('appWorkspace').style.display = 'block';
        renderTasks();
    });

    document.body.appendChild(lock);

    // ----------------------

    // 1. Hand over raw data and the hidden RAM password when component requests export
    ioComponent.addEventListener('app-export-request', (e) => {
        e.detail.rawData = runtimeState.todoData;
        e.detail.masterKey = runtimeState.masterKey;
    });

    // 2. Hand over active session key for verification checks during imports
    ioComponent.addEventListener('app-key-request', (e) => {
        e.detail.masterKey = runtimeState.masterKey;
    });

    // 3. Catch clean, processed data packages seamlessly
    ioComponent.addEventListener('app-import-success', (e) => {
        runtimeState.todoData = e.detail.data;
        saveAndSyncStorage(); // Syncs down to local storage snapshot
        renderTasks();        // Redraws the view list
    });
});