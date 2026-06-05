# System Architecture & Design Baselines

This document outlines the core security, state preservation, and execution models enforced across the Single-File Application Suite. These standards ensure every standalone utility remains auditable, highly portable, and mathematically secure against data exposure.

---

## The Zero-Knowledge Cryptographic Model

For standalone utilities that require data persistence (such as the Encrypted TOTP Vault), security is handled strictly within the client-side runtime layer using the native browser **Web Crypto API**. No plain text information ever touches the disk or network.

### 1. Key Derivation (PBKDF2)
When you submit your master passphrase, the application does not store or check it against a hardcoded string. Instead, it feeds the password into a hardware-accelerated Password-Based Key Derivation Function 2 (PBKDF2).
* **Salt:** A cryptographically secure random value generated via `crypto.getRandomValues()` and bound permanently to the individual device's local storage block.
* **Iterations:** 600,000 rounds of SHA-256 processing. This high computational cost protects against automated local brute-force attacks if a raw backup file is intercepted.
* **Output:** A 256-bit symmetric encryption key.

### 2. Symmetric Encryption (AES-GCM)
The derived key is loaded into transient memory as a CryptoKey object. When storing or exporting records, data is encrypted via **AES-GCM (Advanced Encryption Standard - Galois/Counter Mode)** with a 256-bit key length.
* **Initialization Vector (IV):** A unique, non-repeating 12-byte random nonce is generated for every single write event.
* **Integrity Authentication:** AES-GCM appends an authentication tag to the cipher text. This ensures that if a malicious script or corrupted storage stream alters even a single bit of your encrypted data, decryption will fail completely rather than loading compromised data.

---

## State Lifecycle & Runtime Flow

The diagram below details the operational boundaries of data within the browser window environment:

```text
 ┌────────────────────────────────────────────────────────┐
 │                   Web Browser Window                   │
 │                                                        │
 │  ┌─────────────────┐             ┌──────────────────┐  │
 │  │                 │ Decrypts to │                  │  │
 │  │  Encrypted State│────────────>│  Transient RAM   │  │
 │  │  (IndexedDB)    │             │  (Preact State)  │  │
 │  │                 │<────────────│                  │  │
 │  └─────────────────┘ Encrypts on └──────────────────┘  │
 │                        Mutation                        │
 └──────────────────────────┬─────────────────────────────┘
                            │ Export File Action
                            ▼
                    ┌───────────────┐
                    │ Downloaded    │
                    │ Encrypted     │
                    │ JSON Backup   │
                    └───────────────┘
```

* **Transient Workspace Memory:** Once decrypted, credentials exist strictly as reactive Preact signals in transient browser memory (RAM). Locking the application or refreshing the tab flushes this memory array instantly.
* **Encrypted Cold Storage:** The only thing committed to the browser's persistent database layer (`IndexedDB`) or an exported file configuration is the composite cryptographic payload payload: `{ ciphertext, iv, salt }`.

---

## Hosted HTTPS vs. Local `file://` Contexts

This suite is explicitly architected to adapt seamlessly to two fundamentally different browser execution contexts:

| Operational Feature | Hosted Context (`https://`) | Local Context (`file://`) |
| :--- | :--- | :--- |
| **Data Privacy** | 100% Client-Side (No data sent to host) | 100% Client-Side (Completely air-gapped) |
| **Web Crypto Availability** | **Fully Enabled** (Secure Origin Requirement) | **Enabled** (Modern browsers treat local files as safe) |
| **Advanced APIs (e.g. Geolocation)** | **Allowed** via native permission handshakes | **Auto-Denied** by browser security sandbox |
| **Offline Performance** | Reliant on initial load or Service Workers | Instant execution from internal disk sectors |

### Why Hosting Matters
While these applications can run straight from a local file download, modern browser security models enforce strict "Secure Origin" policies. Advanced hardware components—such as GPS coordinates for mapping utilities, camera context captures, or persistent service workers—are auto-blocked when executed under a standard local `file://` prefix. 

Serving this suite via static HTTPS portals (like GitHub Pages) unlocks full device capabilities while maintaining absolute local data privacy, as the server merely delivers the static asset string and takes zero part in processing your data.