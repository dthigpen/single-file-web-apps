# Developer Workspace & Tooling Lifecycle

This guide covers the development pipeline, toolchain configuration, and testing protocols used to write, format, build, and deploy the Single-File Application Suite.

---

## Repository Architecture

The workspace isolates source components into modular folders before the compiler flattens them down into the final, independent distribution files:

```text
├── biome.json          # Formatter & linter style profiles
├── build.js            # Node-based Vite/Babel bundler suite
├── server.js           # Wireless download portal server
├── package.json        # Build commands and tool dependencies
├── docs/               # GitHub Pages live deployment source
│   ├── index.md        # Documentation landing portal
│   └── downloads/      # Checked-in production standalone HTML utilities
└── src/                # Handwritten application source modules
    ├── shared/         # Common stylesheets, components, and engines
    ├── totp_vault/     # Core application source
    ├── totp_vault_qr/  # Bulk ingestion variant source
    └── qr_scanner/     # Standalone QR utility source
```

---

## ️ Local Task Scripts

Everyday development actions are mapped inside the `package.json` file for quick execution:

### 1. Code Assembly & Bundling
```bash
npm run build
```
Runs the `build.js` compiler. This script cleans your working directories, bundles the target Preact components via Vite, processes the code down to an ES2015 baseline using Babel, minifies the code, and writes a single standalone HTML file for each utility into the local `dist/` directory.

### 2. Static Automated Housekeeping
```bash
npm run lint      # Check codebase for structural or style issues
npm run lint:fix  # Automatically fix code layout bugs and const variables
npm run format    # Rewrite code layout (Forces 4 spaces, single quotes)
```
Managed entirely via **Biome**, a super-fast Rust-based tooling engine. Biome ensures your code stays elegant and uniform, while automatically ignoring your compiled assets in `dist/` to prevent tracking clutter.

### 3. Wireless Mobile Development Testing Server
```bash
npm run serve
```
Launches a custom, local Node.js file portal. Unlike standard local web servers that try to preview HTML files directly in the browser tab, this server injects custom binary transfer headers (`Content-Type: application/octet-stream` and `Content-Disposition: attachment`), forcing your phone's browser to trigger its native download manager. This lets you wireless beam updates straight to your mobile device over Wi-Fi without needing a USB data cable.

---

## The Local Build Mirroring Pipeline

To eliminate redundancy and prevent developer errors, the compilation engine inside `build.js` acts as an automated system mirror:

1. **Clean Canvas Stage:** Running `npm run build` deletes any existing `dist/` and `docs/downloads/` folders on your disk to clear out stale code.
2. **Compilation Loop:** Vite compiles the source projects in `src/` out into optimized local testing assets inside `dist/`.
3. **Deployment Mirroring:** The script copies the final compiled single-file HTML utilities directly from `dist/` into `docs/downloads/` automatically.

### Git Version Tracking Strategy
Because `dist/` is an ephemeral testing folder, it is permanently ignored inside your `.gitignore` file to avoid tracking messiness. However, the `docs/downloads/` directory **is** actively tracked and checked into version control. 

This layout means your Git commit logs stay focused and readable, while your live production files are pushed automatically to your GitHub Pages hosting destination the moment you commit and push your source changes to the `main` branch.