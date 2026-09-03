import { useSignal } from '@preact/signals';

const IDB_NAME = 'todo_app_db';
const IDB_STORE = 'todo_store';

export const isFileSystemSupported = 'showOpenFilePicker' in window;
export const storageMode = useSignal(isFileSystemSupported ? 'native-fs' : 'local-fallback');
export const currentFileName = useSignal('todo.txt');
export const lastSavedTimestamp = useSignal(null);
export const isDirty = useSignal(false);

let activeFileHandle = null;
let activeBackupDirHandle = null;

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function readFallbackStorage() {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get('fallback_text');
        req.onsuccess = () => resolve(req.result || '');
        req.onerror = () => reject(req.error);
    });
}

export async function writeFallbackStorage(text) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const req = tx.objectStore(IDB_STORE).put(text, 'fallback_text');
        req.onsuccess = () => {
            lastSavedTimestamp.value = new Date().toISOString();
            isDirty.value = false;
            resolve();
        };
        req.onerror = () => reject(req.error);
    });
}

export async function openFileFromDisk() {
    if (!isFileSystemSupported) return null;
    try {
        const [handle] = await window.showOpenFilePicker({
            types: [{ description: 'Text Files', accept: { 'text/plain': ['.txt'] } }],
            multiple: false
        });
        activeFileHandle = handle;
        currentFileName.value = handle.name;
        storageMode.value = 'native-fs';

        const file = await handle.getFile();
        const text = await file.text();
        isDirty.value = false;
        return text;
    } catch (err) {
        if (err.name === 'AbortError') return null;
        throw err;
    }
}

export async function selectBackupDirectory() {
    if (!isFileSystemSupported) return false;
    try {
        activeBackupDirHandle = await window.showDirectoryPicker();
        return true;
    } catch (err) {
        if (err.name === 'AbortError') return false;
        throw err;
    }
}

export async function saveTodoText(text) {
    if (storageMode.value === 'native-fs' && activeFileHandle) {
        // Direct write back to disk file
        const writable = await activeFileHandle.createWritable();
        await writable.write(text);
        await writable.close();

        // Optional automated directory backup execution
        if (activeBackupDirHandle) {
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupName = `todo.${timestamp}.bak.txt`;
                const backupHandle = await activeBackupDirHandle.getFileHandle(backupName, { create: true });
                const backupWritable = await backupHandle.createWritable();
                await backupWritable.write(text);
                await backupWritable.close();
            } catch (backupErr) {
                console.warn('Backup write failed:', backupErr);
            }
        }

        lastSavedTimestamp.value = new Date().toISOString();
        isDirty.value = false;
    } else {
        await writeFallbackStorage(text);
    }
}