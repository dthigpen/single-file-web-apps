# Architecture & System Design

This project follows a **local-only, single-file application model**. There are no databases to maintain, no servers to configure, and no cloud backends tracking your data. The browser itself is the entire operating system boundary.

---

## The Data Lifecycle

Data in this ecosystem flows between an active, unencrypted state in memory and two distinct, encrypted persistent states on disk.

```text
                  ┌──────────────────────────────────┐
                  │       Browser Runtime RAM        │
                  │ (Decrypted Plaintext JSON) │
                  └────────────────┬─────────────────┘
                                   │
                      Master Passphrase Encryption
                                   │
                                   ▼
         ================ Encrypted Storage Boundary ================
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
       ┌─────────────────────┐           ┌─────────────────────┐
       │    Local Storage    │           │ Physical File System│
       │ (Browser Persistent)│           │ (Secure File Backup)│
       └──────────┬──────────┘           └─────────────────────┘
                  │
            Device Clear
          (Browser Wipe)
                  │
                  ▼
          [ Data Cleared ]
```

### 1. Working Data (Local Storage)
Primary working data lives in the browser's `localStorage` or `IndexedDB`. This allows the app to remember your dataset across page refreshes. To ensure security at rest, it is never saved as plaintext; it sits on your device's disk as a sealed AES-GCM encrypted string block.

### 2. Encryption Process
When you save or update your data, your master passphrase seals the database in-memory before it ever touches your storage drive. The data flows through this pipeline:

```text
[ User Master Passphrase ]
            │
            ▼
   [ PBKDF2-HMAC-SHA256 ] ──► (100,000 Iterations, 16-Byte Random Salt)
            │
            ▼
   [ Derived 256-Bit Key ]
            │
            ▼
    [ AES-GCM-256 Bit ]   ──► (12-Byte Unique Nonce / IV)
            │
            ▼
 [ Final Base64 Encrypted String ] ──► Written to localStorage
```

### 3. Persistent Data (File System Exports)
Because browser local storage is managed by the operating system, it is fundamentally volatile. If your device runs incredibly low on disk space, or if you clear your browser app cache, the browser may evict your local storage.

To prevent data loss, permanent records rely on you manually exporting that same encrypted Base64 block out to a physical file (like a `.txt` or .`json` file) stored securely on your device's hard drive or MicroSD card.

---

## Core Constraints & Limitations

Operating strictly out of a single file wrapper without a traditional server backend introduces a few specific compromises you need to design around:

### 1. The Key-Management Burden
Because there is no backend server to securely inject hidden environment variables or API secrets, apps that talk to external web services (like mapping or weather tools) require you to bring your own API key (BYOK). These keys must be input via the UI and stored safely in your encrypted application state.

### 2. Browser Storage Eviction
Modern mobile browsers and feature-phone web views will occasionally purge `localStorage` data if the device runs incredibly low on disk space, or if the browser app cache is cleared. 
* **The Mitigation:** You cannot rely on the browser for permanent, multi-year storage. You **must** periodically use the app's export features to save an encrypted backup file to physical storage.

---

## UI & Accessibility Guidelines

To make sure these tools remain highly usable on any hardware profile, whether it's a desktop monitor, an e-ink dashboard, or a compact phone webview:

* **Uncomplicated Layouts:** Focus on single-column, highly responsive structures. Avoid deep menus or overlapping UI windows.
* **Visible Focus States:** Because mouse pointers on feature phones can sometimes be finicky or slow to navigate, interactive items must feature distinct outline highlights (`:focus` and `:focus-within`) so you always know exactly what element is selected.
* **File Readers Over Clipboards:** Clipboard access is highly sandboxed and unreliable on feature phones. Always provide an explicit file loader (`<input type="file">`) rather than forcing yourself to copy and paste massive text strings.