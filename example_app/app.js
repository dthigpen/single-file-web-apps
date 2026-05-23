// App State Core
let todoState = {
    items: [
        { id: 1, text: "Verify preprocessor script compilation" },
        { id: 2, text: "Test Blob execution on target handset" }
    ]
};

// Render engine loop
function renderTasks() {
    const container = document.getElementById('taskList');
    container.innerHTML = '';

    if (todoState.items.length === 0) {
        container.innerHTML = '<p style="font-style: italic; color: #888;">No tasks listed.</p>';
        return;
    }

    todoState.items.forEach(item => {
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

    todoState.items.push(newItem);
    input.value = '';
    renderTasks();
}

function removeTask(id) {
    todoState.items = todoState.items.filter(item => item.id !== id);
    renderTasks();
}

// IO Integrations using shared/utils.js abstractions
function handleBackup() {
    exportAppState(todoState, "example_app_backup.json");
}

// Wire up the upload listener on application init
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    
    initializeAppImporter('importPicker', (parsedJSON) => {
        if (parsedJSON && Array.isArray(parsedJSON.items)) {
            todoState = parsedJSON;
            renderTasks();
        } else {
            alert("Invalid backup schema detected.");
        }
    });
});