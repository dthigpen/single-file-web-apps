# Architecture Blueprint: Standalone Local-First Web Applications

This document outlines the core technical constraints, design patterns, and architectural rules for building zero-dependency, self-contained, single-file applications within this repository.

---

## 1. Foundational Constraints & Philosophy

* **Zero Network Dependencies:** Applications must be 100% offline-first. They must execute flawlessly when loaded directly from a local storage disk via the `file:///` protocol with zero active network connections.
* **Single-File Compilation Output:** The development toolchain must flatten all modular source files (HTML templates, CSS styles, JavaScript assets, and audited third-party vendor utilities) into a single, highly portable HTML asset within the `dist/` folder.
* **Data Sovereignty & Privacy:** User data must remain strictly local, contained entirely within the browser's persistent sandbox runtime environment.

---

## 2. Cryptographic Storage Lifecycle

Because the local operating environment and the browser's database systems are considered exposed terrain, all application data written to disk must remain fully encrypted at rest. Unencrypted data exists exclusively as a volatile structure in computer memory.

| Storage Layer | Longevity Tier | Security Posture | Read/Write Frequency |
| :--- | :--- | :--- | :--- |
| **File System Backup** | Permanent (Manual user file actions) | Encrypted (AES-GCM Envelope) | Occasional (User export/import) |
| **Local Storage Database** | Semi-Volatile (Browser managed disk space) | Encrypted (AES-GCM Envelope) | High (Background Auto-Saves) |
| **Volatile RAM Runtime** | Volatile (Purged cleanly on tab closure) | Decrypted Working State | Continuous (UI state sync loops) |

### The Master Key Enforcement Rule
The encryption master key can only be stored in memory. Every application session must begin by requesting a passphrase from the user to derive the active session key. No application features, secret stores, or secondary layout files may mount into the visual DOM tree until a verified master key is successfully established in memory.

---

## 3. Reactive State Management Paradigm

We use **Preact Signals** to achieve a strict separation of concerns between raw application business logic and local presentation details.

```
                  ┌──────────────────────┐
                  │    localStorage      │  (Encrypted Data Envelope)
                  └──────────┬───────────┘
                             │ (Read on boot)
                             ▼
                    ┌─────────────────┐
                    │  Lockscreen UI  │  ◄── [User Entering Passphrase]
                    └────────┬────────┘
                             │ (Derives & verifies)
                             ▼
                ┌─────────────────────────┐
                │  masterKey (Signal)     │  (Kept strictly in volatile RAM)
                └────────────┬────────────┘
                             │ (Unlocks)
                             ▼
                ┌─────────────────────────┐
                │  globalVault (Signal)   │  (Decrypted working state array)
                └────────────┬────────────┘
                             │
               ┌─────────────┴─────────────┐
               ▼                           ▼
   ┌───────────────────────┐   ┌────────────────────────┐
   │   Visual Component    │   │ Background Auto-Saver  │
   │  (Views active data)  │   │  (Listens to signals,  │
   └───────────────────────┘   │  encrypts & commits)   │
                               └────────────────────────┘
```

### State Categorization Matrix

To maintain a clean, performant workspace layout, state structures are handled using these specific reactive hooks:

1.  **Global App Scoped State (`signal()`)**
    * *Usage:* Core application databases, unencrypted credentials list, encryption session keys, global user profiles.
    * *Location:* Defined at the top level of the application or inside a dedicated state controller file.
2.  **Local Component Scoped State (`useSignal()`)**
    * *Usage:* Interactive text field inputs, search bar queries, transient UI presentation flags (`isModalOpen`).
    * *Location:* Defined inside individual functional UI blocks. Automatically collected out of memory when the component unmounts.
3.  **Derived/Calculated Values (`computed()` / `useComputed()`)**
    * *Usage:* Displaying counts (e.g., total entries) or active filters (e.g., search results).
    * *Rule:* Never write manual code that updates a secondary variable when a primary state changes. Let the signal calculation block infer it on the fly.

---

## 4. Layout Component Guidelines

Instead of rigid Web Components or imperative element creation loops, applications are constructed using modern **Preact Functional Components** combined with **HTM (`htm`)** template literals for clean, standard HTML string syntax.

* **The Component Tree Structure:** Data flows downward via standard properties (`props`). Structural adjustments or state transformations flow upward via direct developer callback functions.
* **The Content Pocket Rule:** Interactive elements like forms, inputs, and custom structures may safely reside directly inside standard list iterators. Preact's Virtual DOM naturally tracks cursor focus, user text selections, and layout updates during data changes.

---

## 5. Development Workspace Layout

The architecture enforces clean tracking boundaries, separating source code files from compilation targets:

```text
├── dist/                      # Production Output Target (Spotless, deployment ready)
│   ├── sandbox.html           # Single, portable standalone executable
│   └── totp_vault.html        # Compiled application payload
├── src/                       # Active Working Environment
│   ├── shared/                # Cross-Application Engine Utilities
│   │   ├── crypto.js          # Raw cryptographic pipeline loops (AES-GCM protocols)
│   │   ├── theme.css          # Minimalist typographic structural style rules
│   │   └── utils.js           # Generic developer helper frameworks
│   └── totp_vault/            
│       ├── index.html         # Empty application root skeleton frame point
│       ├── vaultController.js # Pure signal state management logic
│       └── app.js             # Top-level functional layout component
├── package.json               # Dependency configuration definitions
└── rollup.config.js           # Automated lifecycle bundler script
```