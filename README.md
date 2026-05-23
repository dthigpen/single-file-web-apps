# Single-File Web Apps

A collection of self-contained, offline-first web utilities developed as modular projects and compiled into isolated, single-file HTML implementations. These tools require no network access, no backend infrastructure, and no external runtime environments beyond a standard web browser engine.

## Overview

A single-file web app bundles all its presentation logic (HTML), layout styling (CSS), structural assets (such as inlined base64 graphic data), and behavior workflows (JavaScript) into one solitary `.html` file. 

### Why Use Single-File Apps?

*   **Permanent Portability:** Moving the application is as simple as copying a single file via USB, ADB, or local network transfer.
*   **Zero Dependencies:** The application cannot break due to remote server upgrades, API deprecations, or expired domain names. If a browser can parse standard web code, the application will function indefinitely.
*   **Privacy & Isolation:** Because data processing occurs entirely within the local client runtime, no telemetry, analytical tracking, or personal data escapes the host device.
*   **Hardware Compatibility:** This pattern is highly efficient for resource-constrained environments, minimalist operating systems, or legacy hardware (such as basic modern flip phones running stripped-down Android variants) where running heavy client-side applications is impractical or restricted.

### Architectural Constraints

While highly resilient, this paradigm introduces unique restrictions that must be planned for during development:

*   **The State Preservation Problem:** When loaded via the local file protocol (`file:///`), standard browser mechanisms like `localStorage` exhibit highly volatile behavior or are completely isolated per file. State continuity must rely on browser-driven file generation (Blob data streams) exported explicitly to the native file system, and re-imported manually via standard file pickers.
*   **The CORS Network Barrier:** Browsers enforce strict Cross-Origin Resource Sharing (CORS) rules on local files, treating an anonymous `file://` origin as a security risk. Direct client-side API requests to modern web services will be rejected. Data must be processed locally or pre-compiled into static configurations on a host machine prior to deployment.
*   **Credential Exposure:** Because the source code resides entirely on the client filesystem, hardcoding secret API tokens or private encryption keys within the distribution files will expose them to anyone with access to the source file.

### Why This Paradigm Isn't Ubiquitous

The modern software industry largely favors cloud-centric architectures (Software-as-a-Service) over permanent localized binaries. This shift is driven primarily by economic incentives rather than technical limitations:

*   **Monetization Frameworks:** Single-file, client-side code cannot easily enforce recurring subscription monetization, gating features behind paywalls, or serving dynamic advertisements.
*   **Data Aggregation:** Centralized servers enable platforms to capture user metrics, search habits, and behavioral telemetry, which represent significant asset vectors for modern corporate models.
*   **Control over Versioning:** Forcing software to run on remote servers allows providers to modify features, withdraw access, or sunset software at will, ensuring users remain dependent on an active platform lifecycle.

---

## Directory Structure

To maintain clean separation of concerns without manually copying utility code across different applications, the workspace is structured as a modular codebase that undergoes a compilation step before deployment.

```text
├── shared/              # Common logic and design assets
│   ├── utils.js         # Common routines (crypto, export handles, math)
│   └── theme.css        # Unified layout styles optimized for low-res screens
├── [app_name_dir]/      # A distinct utility app folder
│   ├── index.html       # The template scaffolding containing compilation anchors
│   └── app.js           # App-specific functional logic
├── dist/                # Production-ready single-file binaries (tracked in version control)
└── build.py             # Preprocessor compiler script
```

---

## User Guide: Running the Apps

Because the distribution payloads inside the `/dist` directory are already fully compiled and completely unified, consumers do not need to install Python, run build scripts, or configure local developer setups to use them.

### Desktop & Standard Mobile Usage
1. Enter the [/dist](https://github.com/dthigpen/single-file-apps/dist) directory of this repository.
2. Download any of the `.html` app files that you want.
3. Double-click or open any compiled `.html` application file (e.g., `dist/example_app.html`) directly inside a modern web browser.
4. Bookmarking the file URL (`file:///path/to/dist/app.html`) inside your browser provides permanent local access.

### Dumbphone Installation (e.g., TCL Flip 2)

To deploy these tools onto a minimalist or restricted handset without internet access, use one of the following physical loading pathways.

#### Method 1: Direct USB Mass Storage / MTP Transfer (Preferred)
1. Connect the phone to your computer using a standard USB data cable.
2. On the handset interface, open **Settings > Storage > USB Storage** and verify that file sharing or **Media Transfer Protocol (MTP)** mode is enabled.
3. On your computer, open your file manager and find the device drive mapping.
4. Navigate to the phone's internal memory root and enter the `Download/` directory.
5. Drag and drop the targeted `.html` application binary from your computer's local `dist/` workspace into the phone's `Download/` folder. Alternatively, for better organization make an `Apps/` folder next to `Downloads/` and put all your `*_app.html` files in there.
6. Disconnect the cable. On the phone, open the native **File Manager** utility, scroll to the `Download/` section, select the file, and tap it to launch it directly within the system's baseline browser runtime.

#### Method 2: Android Debug Bridge (Command Line Execution)
If the phone UI restricts file manager visibility, or if manual drag-and-drop protocols fail to mount properly, utilize the terminal pipeline to place files directly into the environment:

```bash
# Push a compiled file straight to the shared storage landing zone
adb push dist/example_app.html /sdcard/Download/
```

Once pushed, enter the browser app on the device and manually invoke the local address string via the URL bar:
`file:///sdcard/Download/example_app.html`

---

## Development & Compilation Workflow

### Template Injection Pattern
During local development, do not write code directly inside a singular long HTML block. Instead, utilize the custom anchor syntax inside your specific application's `index.html` file to point to modular source components:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        /* {{include: shared/theme.css}} */
    </style>
</head>
<body>
    <div id="app"></div>

    <script>
        /* {{include: shared/utils.js}} */
        /* {{include: target_app_dir/app.js}} */
    </script>
</body>
</html>
```

### Running the Preprocessor Compiler
The root `build.py` script reads template files, recursively fetches the targets declared in the `/* {{include: ...}} */` comment blocks, strips out the marker flags, and outputs a flat, production-ready file inside the `dist/` folder.

If executed with no arguments, the compiler automatically scans the workspace directory, skips core folders like `shared` and `dist`, identifies any folder containing an `index.html` file, and compiles them sequentially:

```bash
python3 build.py
```

To compile an isolated application during active development, pass the target directory name as an argument:

```bash
python3 build.py totp_app
```

---

## Contributing Guidelines

1.  **Strict Vanilla Architecture:** External frameworks are permitted only if their entire minified source code can be bundled directly via the preprocessor tool. Prefer pure vanilla DOM APIs and native JavaScript implementations.
2.  **No Hot-Linking:** Never pull resources (fonts, stylesheets, libraries, or imagery) via remote content delivery networks (CDNs). All resources must reside locally within the repository workspace and be embedded directly at compile-time.
3.  **Agnostic to File-Path Origins:** Code logic must never assume it is operating from an HTTP domain or root folder context. Avoid references to absolute location roots (`/assets/...`); maintain standard local processing flows to prevent security errors when executing code inside the browser under `file:///` pathways.
```