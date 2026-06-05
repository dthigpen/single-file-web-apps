# The Single-File Application Suite

A collection of portable, privacy-respecting, and local-first standalone utilities. Each tool in this suite is compiled into a completely self-contained `.html` file that operates entirely client-side.

---

## App Catalog

Open this page directly on your device browser to run or install the latest builds. If you wish to use an app entirely offline, you can simply save the page directly from your browser (`Ctrl+S`) or pull the source file from the repository downloads.

### [Encrypted TOTP Vault](./apps/totp_app.md)

A clean, responsive, and keyboard-navigable 2FA token generator designed for absolute balance across modern desktop monitors and constrained hardware viewports alike.

* **Security:** Features native browser-level AES-GCM encryption. Local state and exported backup files are always strictly encrypted using your master passphrase.
* **[Read the App Documentation](./apps/totp_app.md)**
* **[Launch Standalone App](./downloads/totp_vault.html)**

*(Note: If you require bulk text ingestion or experimental QR parsing tools, you can also deploy the [TOTP Vault Ingestion Variant](./downloads/totp_vault_qr.html) or use the [Standalone QR Scanner](./downloads/qr_scanner.html) utility).*

---

## Practical Tips for Data Persistence & Offline Usage

Because these standalone utilities operate entirely client-side without a central cloud database, your encrypted data is bound directly to your device's local browser environment. Keep the following behaviors in mind to ensure a seamless experience:

### 1. Guard Against Aggressive Storage Sweeping
Modern mobile operating systems (including iOS and various Android flavors) frequently run background maintenance routines. If your device runs low on internal space, or if an app hasn't been launched in several weeks, the system browser may aggressively clear cached site data, including `LocalStorage` and `IndexedDB`.
* **The Safeguard:** Utilize the application's built-in **"Download Backup"** action regularly after creating or updating entries. 
* **The Home Screen Trick:** On most mobile devices, using your browser's native **"Add to Home Screen"** or **"Install Application"** function registers the single-file utility with a more permanent, highly protected storage profile that prevents the OS from clearing its database.

### 2. Opening Downloaded Files Directly on Mobile
If you choose to save a utility payload (like `totp_vault.html`) directly to your phone's internal memory for 100% offline usage, your system's native file manager might not automatically trigger the browser when you tap the file.
* **The Solution:** Open your mobile web browser first, manually type the local file protocol path into the URL address bar (for example: `file:///sdcard/Download/totp_vault.html` or the equivalent directory on your device), and bookmark the resulting page for instant offline access.

## Architectural Core Principles

The standalone utilities in this suite are engineered against a strict set of architectural boundaries to guarantee permanent portability, auditability, and long-term maintainability:

### 1. Zero Runtime Dependencies
While the developer workspace utilizes a lean compilation pipeline to build and bundle files, the production outputs have **zero runtime dependencies**. There are no external scripts, CDNs, or remote assets fetched at runtime. Everything required to execute the utility is completely sealed within the single file.

### 2. Local-First Encrypted State
Your data belongs to you. No user database states or profiles are ever transmitted to a remote cloud server. If a utility requires persistent storage, it leverages the browser's native Web Crypto API to ensure your data is encrypted with a strong, user-derived key directly in local storage before it ever touches a disk.

### 3. Hosted & Offline Versatility
While these apps are self-contained and can be saved locally, certain hardware and web browser security models restrict advanced APIs (like Geolocation or specific device permissions) when running straight from a local `file://` link. This suite is engineered to be safely served via secure HTTPS hosting (such as GitHub Pages) to unlock full hardware access while maintaining 100% client-side privacy.

### 4. Pragmatic Device Balance
This suite avoids hyper-optimizing for a single target. Instead, it balances modern functionality with wide accessibility. Layouts are built mobile-first to ensure they fluidly reflow down to tight mobile screens and physical D-pad navigation boundaries, without sacrificing presentation or utility on a large desktop monitor.

---

To dive deeper into how these security baselines and runtime environments are constructed inside the browser, proceed to our full [Architecture & System Design Layout](architecture.md) guide.