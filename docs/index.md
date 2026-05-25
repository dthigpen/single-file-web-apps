# Single-File Web Apps

A collection of portable, privacy-respecting, and local-first web apps. Each application is just a self-contained `.html` file that you can download, inspect, and run yourself.

---

## The Apps

For each application below you can click the **Try it Now** link to run open the copy of that app hosted here. If you like it, simply save the page (`Ctrl+S`) or download it from the repository. Additionally, learn more about the apps by clicking their title to go to their dedicated page.

### [Encrypted TOTP Vault](./apps/totp_app.md)

A minimal, keyboard-navigable 2FA token generator explicitly designed to work flawlessly inside resource-constrained environments like minimalist feature phone (dumbphone) web browsers.

*   **Security:** Native browser-level AES-GCM-256 encryption and exported files are always encrypted.
*   **[Read the Usage Guide](apps/totp_app.md)**  
*   **[Try it Now](https://dthigpen.github.io/single-file-web-apps/dist/totp_app.html)**

---

## Architectural Principles

The apps written in this repository take the following design rules into account to guarantee long-term maintainability and platform portability:

1.  **Zero Dependencies:** No `npm install`, no heavy build systems, and no bloated node modules. Raw HTML, modern CSS, and vanilla ECMAScript JavaScript only.
2.  **Local Storage as an Encrypted State:** Data must never sit on a remote cloud drive unencrypted. If persistent storage state is required, it must be locked behind strong user-derived keys via the native browser Web Crypto API.
3.  **Device Inclusivity:** Layout UI elements must adapt beautifully to constrained screens, D-pad scrolling loops, and non-touch mobile displays.

To understand how these safety boundaries are drawn inside your web browser, proceed to our full [Architecture & System Design](architecture.md) page.