import { useComputed, useSignal } from '@preact/signals';
import htm from 'htm';
import { h, render } from 'preact';
import { useEffect } from 'preact/hooks';
import { parseTodoText, serializeTodoList } from './todoParser.js';
import {
    currentFileName,
    isDirty,
    isFileSystemSupported,
    lastSavedTimestamp,
    openFileFromDisk,
    readFallbackStorage,
    saveTodoText,
    selectBackupDirectory,
    storageMode
} from './storageEngine.js';

const html = htm.bind(h);

function TodoAppRoot() {
    const rawText = useSignal('');
    const searchQuery = useSignal('');
    const selectedProject = useSignal(null);
    const selectedContext = useSignal(null);
    const newTaskInput = useSignal('');
    const backupDirSet = useSignal(false);

    // Initial load lifecycle
    useEffect(() => {
        readFallbackStorage().then((cached) => {
            if (cached) rawText.value = cached;
        });
    }, []);

    const todoItems = useComputed(() => parseTodoText(rawText.value));

    // Derive active project and context tags
    const allProjects = useComputed(() => {
        const set = new Set();
        todoItems.value.forEach((item) => item.projects?.forEach((p) => set.add(p)));
        return [...set].sort();
    });

    const allContexts = useComputed(() => {
        const set = new Set();
        todoItems.value.forEach((item) => item.contexts?.forEach((c) => set.add(c)));
        return [...set].sort();
    });

    // Filtered task items view
    const visibleTasks = useComputed(() => {
        return todoItems.value.filter((item) => {
            if (item.isEmpty) return false;
            if (selectedProject.value && !item.projects.includes(selectedProject.value)) return false;
            if (selectedContext.value && !item.contexts.includes(selectedContext.value)) return false;
            if (searchQuery.value.trim()) {
                const q = searchQuery.value.toLowerCase();
                return item.raw.toLowerCase().includes(q);
            }
            return true;
        });
    });

    const commitChanges = async (newText) => {
        rawText.value = newText;
        isDirty.value = true;
        await saveTodoText(newText);
    };

    const handleToggleComplete = async (targetItem) => {
        const today = new Date().toISOString().split('T')[0];
        const updatedItems = todoItems.value.map((item) => {
            if (item.id !== targetItem.id) return item;
            return {
                ...item,
                completed: !item.completed,
                completionDate: !item.completed ? today : null
            };
        });
        await commitChanges(serializeTodoList(updatedItems));
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTaskInput.value.trim()) return;
        const dateStr = new Date().toISOString().split('T')[0];
        const newRaw = `${dateStr} ${newTaskInput.value.trim()}`;
        const updated = rawText.value ? `${rawText.value}\n${newRaw}` : newRaw;
        newTaskInput.value = '';
        await commitChanges(updated);
    };

    const handleOpenFile = async () => {
        const text = await openFileFromDisk();
        if (text !== null) rawText.value = text;
    };

    const handleSelectBackupFolder = async () => {
        const success = await selectBackupDirectory();
        backupDirSet.value = success;
    };

    return html`
        <div class="app-workspace">
            <!-- Header bar -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                    <h1 style="font-size: 1.1rem; margin: 0;">${currentFileName}</h1>
                    <span style="font-size: 0.7rem; color: #666;">
                        ${storageMode.value === 'native-fs' ? 'Disk Sync' : 'Browser Storage'} 
                        ${isDirty.value ? ' • (Unsaved)' : ''}
                    </span>
                </div>
                <div style="display: flex; gap: 4px;">
                    ${
                        isFileSystemSupported
                            ? html`
                        <button onClick=${handleOpenFile} class="btn-secondary" style="font-size:0.75rem; height:26px; width:auto;">Open File</button>
                        <button onClick=${handleSelectBackupFolder} class="btn-secondary" style="font-size:0.75rem; height:26px; width:auto;">
                            ${backupDirSet.value ? 'Backup Active' : 'Set Backup'}
                        </button>
                    `
                            : html`
                        <button onClick=${() => {
                            const blob = new Blob([rawText.value], { type: 'text/plain' });
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = currentFileName.value;
                            a.click();
                        }} style="font-size:0.75rem; height:26px; width:auto;">Export</button>
                    `
                    }
                </div>
            </div>

            <!-- Task Input -->
            <div class="card" style="margin-bottom: 8px; padding: 6px;">
                <form onSubmit=${handleAddTask} style="display: flex; gap: 4px;">
                    <input 
                        type="text" 
                        placeholder="Add task (+project @context)..." 
                        value=${newTaskInput} 
                        onInput=${(e) => (newTaskInput.value = e.target.value)}
                        style="height: 28px; font-size: 0.8rem; flex-grow: 1;" 
                    />
                    <button type="submit" style="height: 28px; font-size: 0.8rem; width: auto; padding: 0 10px;">Add</button>
                </form>
            </div>

            <!-- Filter Controls -->
            <div class="card" style="margin-bottom: 8px; padding: 6px;">
                <input 
                    type="text" 
                    placeholder="Search tasks..." 
                    value=${searchQuery} 
                    onInput=${(e) => (searchQuery.value = e.target.value)}
                    style="height: 26px; font-size: 0.75rem; margin-bottom: 4px;"
                />
                
                <div style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 0.7rem;">
                    ${allProjects.value.map(
                        (p) => html`
                        <button 
                            onClick=${() => (selectedProject.value = selectedProject.value === p ? null : p)}
                            class="btn-secondary"
                            style="height: 20px; padding: 0 4px; font-size: 0.7rem; width: auto; background: ${selectedProject.value === p ? '#e6f2ff' : '#fff'};"
                        >+${p}</button>
                    `
                    )}
                    ${allContexts.value.map(
                        (c) => html`
                        <button 
                            onClick=${() => (selectedContext.value = selectedContext.value === c ? null : c)}
                            class="btn-secondary"
                            style="height: 20px; padding: 0 4px; font-size: 0.7rem; width: auto; background: ${selectedContext.value === c ? '#f0f0f0' : '#fff'};"
                        >@${c}</button>
                    `
                    )}
                </div>
            </div>

            <!-- Task Item List -->
            <div>
                ${
                    visibleTasks.value.length === 0
                        ? html`<div class="card" style="text-align: center; color: #777; padding: 12px; font-size: 0.8rem;">No tasks found.</div>`
                        : visibleTasks.value.map(
                              (item) => html`
                        <div class="card" style="padding: 6px 8px; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                            <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                                <input 
                                    type="checkbox" 
                                    checked=${item.completed} 
                                    onChange=${() => handleToggleComplete(item)} 
                                />
                                <span style="font-size: 0.85rem; text-decoration: ${item.completed ? 'line-through' : 'none'}; color: ${item.completed ? '#888' : '#000'};">
                                    ${item.priority ? html`<strong style="color: #0066cc;">(${item.priority}) </strong>` : ''}
                                    ${item.description}
                                </span>
                            </div>
                        </div>
                    `
                          )
                }
            </div>
        </div>
    `;
}

render(html`<${TodoAppRoot} />`, document.getElementById('app'));