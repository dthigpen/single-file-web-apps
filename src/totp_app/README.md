# Minimalist Local TOTP Vault

A private, distraction-free, local-first 2FA authentication hub designed to operate within resource-constrained browser contexts (such as custom or minimalist flip-phone webviews). 

The app features zero tracking, requires no external server network connections, and operates out of an encrypted browser database footprint to guarantee zero unencrypted credentials ever sit at rest on local device storage.

![TOTP App Interface](/docs/img/totp-app-screenshot.png)
---

## Security Architecture

* **Zero Plaintext at Rest:** All credentials strings are encrypted natively using browser-level **AES-GCM-256** using a master key derived via **PBKDF2-HMAC-SHA256** (100,000 iterations).
* **Hardware-Aware Layout:** Built to interact safely using basic physical keypad directional inputs (D-pads) without requiring complex text selections or heavy copy-paste interactions.
* **Lockout Prevention Gate:** To ensure your primary database is never corrupted by an input error, updates are tested and successfully decrypted in volatile system memory *before* being written to local browser storage.

---

## Getting Started

### 1. Preparing the Vault (Aegis Migration)
To cleanly migrate your existing keys out of an encrypted Aegis Android backup file without dropping unencrypted payloads onto your disk, use the included Python migration script.

1. Install the core cryptographic dependency:
```bash
   pip install cryptography
   ```
2. Run your localized python conversion tool:
```bash
   python import_aegis.py
   ```
3. Provide the path to your Aegis backup, then specify an export file target (e.g., `vault.txt`). This generates an encoded data payload matching the precise structure expected by this application.

### 2. Loading into the Application Container
1. Open `index.html` on your device's browser profile. The app will launch automatically in **Demo Mode** with a pair of non-functional placeholder paths if no persistent storage data exists.
2. Select **Manage Vault** at the bottom of the interface to reveal the administration configuration panel.
3. Under **Import Encoded Vault File**, select your exported text payload file (`vault.txt`).
4. Enter the exact Master Passphrase used during the Python script conversion process, then click **Verify & Import**.
5. The application will test the payload integrity, save it securely to `localStorage`, and instantly reload into production mode.

### 3. Manual Vault Setup (From Scratch)
If you want to construct your database natively within the browser pane:
1. Open the **Manage Vault** settings block.
2. In the text workspace, input your configurations exactly matching a comma-separated syntax array (one entry per line):
```text
   Service Label,Base32SecretKey,TimeInterval
   GitHub:Personal,JBSWY3DPEHPK3PXP,30
   Nextcloud:Admin,ORXW233SMVZA4===,30
   ```
3. Type your targeted password string into both the **Choose Master Passphrase** and **Confirm Master Passphrase** fields.
4. Click **Compile & Save to Storage** to finalize your encrypted layout container.

---

## Daily Operational Usage

* **Decryption Prompt:** When opening or reloading the application, you will be prompted for your validation passphrase. Entering it safely decrypts the dynamic database straight into memory.
* **Clean System Cleanup:** To close your vault and purge active authorization states out of physical system RAM instantly, simply close the browser application window or tab.