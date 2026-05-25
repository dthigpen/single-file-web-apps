# Development Guide

Welcome! This guide outlines the local development setup, architectural philosophy, and build process for contributing to the single-file web applications suite.

---

## Local Environment Setup

These tools operate entirely locally with minimal external dependencies. To compile the production builds or run the documentation site, make sure you have Python installed on your system.

### 1. Clone the Repository
```bash
git clone [https://github.com/dthigpen/single-file-web-apps.git](https://github.com/dthigpen/single-file-web-apps.git)
cd single-file-web-apps
```

### 2. Install Development Dependencies
Python's standard library handles the entire build compilation system. Dependencies are only required for rendering the local documentation server (`mkdocs`).

```bash
# Optional: Set up a clean virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate

# Install the technical documentation tools
pip install mkdocs mkdocs-material
```

---

## Architectural Pipeline

To keep the development workspace highly organized, reusable user interface layers are kept completely separated from individual application runtimes. 

* **`shared/`**: Contains core cryptographic functions (`crypto.js`), interface layout modules (`lockscreen.js`, `data-io.js`), and global styles (`theme.css`).
* **`totp_app/`** / **`todo_app/`**: Contain the raw, modular source files for individual applications before compilation.
* **`dist/`**: The target destination directory containing the final standalone, distributable HTML deployment packages.

The building engine scans source files for layout include tokens (e.g., `{{include: shared/utils.js}}`) and injects the corresponding dependency scripts cleanly inline during compilation phases.

---

## Compilation & Build Workflows

### Compile Single-File Targets
Run the custom Python build script from the root folder to process dependency tags and assemble the standalone production packages inside the `dist/` directory.

```bash
python build.py
```

### Live Documentation Preview
To preview documentation edits or verify changes to the integration hooks locally before pushing to production branches, spin up the local live-reload documentation server:

```bash
mkdocs serve
```
Once initialized, navigate your local browser workspace to `http://127.0.0.1:8000/`.

---

## Distribution & Deployment

Deployments to GitHub Pages are managed locally via automated file hooks. 

When you execute the deployment script, a custom Python hook (`hooks.py`) automatically intercepts the configuration pipeline, copies any freshly generated `.html` application packages out of `dist/`, stages them as static documentation assets inside `docs/dist/`, and signs them out to the remote host.

To compile and deploy the complete site layout along with all application runtimes in a single pass, execute:

```bash
# 1. Ensure production builds are fully compiled
python build.py

# 2. Automatically package, stage, and push assets live
mkdocs gh-deploy
```

Once pushed, your live application sandboxes will become immediately accessible at:  
`https://dthigpen.github.io/single-file-web-apps/dist/[app_name].html`