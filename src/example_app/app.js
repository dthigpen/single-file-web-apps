// Universal App Identity Metadata
const APP_CONFIG = {
    appId: "example-tasks",
    version: "1.0.0",
    encrypted: true
};

// Volatile Runtime Memory Data Layers
let runtimeState = {
    masterKey: null, 
    todoData: { items: [] }
};

const DEFAULT_STATE = {
    items: [
        { id: 1, text: "Verify preprocessor script compilation" },
        { id: 2, text: "Test Blob execution on target handset" }
    ]
};

// ==========================================
// The Ultimate Immediate-Mode UI Engine
// ==========================================
function render() {
    const workspace = document.getElementById('appWorkspace');

    // Build the tasks inner list array using template mapping strings
    const taskRowsHtml = runtimeState.todoData.items.length === 0
        ? `<p style="font-style: italic; color: #888; text-align: center; padding: 12px;">No tasks listed. Add one below!</p>`
        : runtimeState.todoData.items.map(item => `
            <div class="todo-item" data-id="${item.id}" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; padding: 4px; border-bottom: 1px dashed #ccc;">
                <span class="todo-text" style="font-size: 13px;">${item.text}</span> <button class="btn-secondary" data-action="delete" style="padding: 2px 8px; font-size: 11px;">Remove</button>
            </div>
          `).join('');

    // Generate the complete unified layout structure directly in memory
    const templateUI = html`
        <div id="appWorkspace">
            <div class="card">
                <h1>Example Task Utility</h1>
                <p>Demonstrates single-file compilation and shared asset modules.</p>
            </div>

            <div class="card">
                <h2>Add Task</h2>
                <form id="task-form" style="display: flex; gap: 8px;">
                    <input type="text" id="taskInput" placeholder="Enter task name..." style="flex: 1; padding: 6px;">
                    <button type="submit" class="btn">Add Entry</button>
                </form>
            </div>

            <div class="card">
                <h2>Active Tasks</h2>
                <div id="taskList">
                    ${taskRowsHtml} </div>
            </div>

            <app-data-io id="dataManager" app-id="example-tasks"></app-data-io>
        </div>
    `;

    // Run the differential morph engine step to sync layout changes seamlessly
    morphDOM(workspace, templateUI);
}

// ==========================================
// Centralized Event Delegation Portal
// ==========================================
function setupGlobalEventHandlers() {
    const workspace = document.getElementById('appWorkspace');

    // Portal Click Capturer for Task Actions
    workspace.addEventListener('click', async (e) => {
        const target = e.target;
        const action = target.getAttribute('data-action');
        if (action !== 'delete') return;

        const row = target.closest('.todo-item');
        const itemId = parseInt(row.getAttribute('data-id'), 10);

        // Mutate Raw Data State
        runtimeState.todoData.items = runtimeState.todoData.items.filter(item => item.id !== itemId);
        
        await saveAndSyncStorage();
        render(); // Re-render updates everything cleanly
    });

    // Portal Form Submit Capturer for Add Action
    workspace.addEventListener('submit', async (e) => {
        if (e.target.id !== 'task-form') return;
        e.preventDefault(); // Block full page reload trigger

        const input = document.getElementById('taskInput');
        const text = input.value.trim();
        if (!text) return;

        runtimeState.todoData.items.push({
            id: Date.now(),
            text: text
        });

        await saveAndSyncStorage();
        render(); // Morph changes across layout tree
        
        // Refocus the input box immediately for clean sequential entries
        document.getElementById('taskInput').focus(); 
    });
}

// ==========================================
// Secure Encryption Data Sync Loop
// ==========================================
async function saveAndSyncStorage() {
    const envelope = {
        appId: APP_CONFIG.appId,
        version: APP_CONFIG.version,
        encrypted: APP_CONFIG.encrypted,
        cryptoMetadata: {},
        payload: ""
    };

    if (APP_CONFIG.encrypted && runtimeState.masterKey) {
        const rawString = JSON.stringify(runtimeState.todoData);
        const result = await encryptPayload(rawString, runtimeState.masterKey);
        envelope.cryptoMetadata = { salt: result.salt, iv: result.iv };
        envelope.payload = result.ciphertext;
    } else {
        envelope.payload = runtimeState.todoData;
    }

    localStorage.setItem(APP_CONFIG.appId, JSON.stringify(envelope));
    return envelope;
}

// ==========================================
// Lifecycle Application Bootloader
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const storedData = localStorage.getItem(APP_CONFIG.appId);
    const ioComponent = document.getElementById('dataManager');
    
    // Mount persistent delegation hubs early on the top shell
    setupGlobalEventHandlers();

    const lock = document.createElement('app-lockscreen');
    lock.setAttribute('app-id', APP_CONFIG.appId);
    lock.setAttribute('app-name', 'Task List');
    if (APP_CONFIG.encrypted) lock.setAttribute('encrypted', '');

    lock.addEventListener('app-unlocked-success', async (e) => {
        const { password, data, isFreshRun } = e.detail;
        
        runtimeState.masterKey = password;
        runtimeState.todoData = isFreshRun ? DEFAULT_STATE : data;
        
        if (isFreshRun) await saveAndSyncStorage();
        
        document.getElementById('appWorkspace').style.display = 'block';
        render(); // Launch the first complete application visualization build
    });

    document.body.appendChild(lock);

    // Bind clean data management interface events cleanly
    ioComponent.addEventListener('app-export-request', (e) => {
        e.detail.rawData = runtimeState.todoData;
        e.detail.masterKey = runtimeState.masterKey;
    });

    ioComponent.addEventListener('app-key-request', (e) => {
        e.detail.masterKey = runtimeState.masterKey;
    });

    ioComponent.addEventListener('app-import-success', async (e) => {
        runtimeState.todoData = e.detail.data;
        await saveAndSyncStorage();
        render();
    });
});