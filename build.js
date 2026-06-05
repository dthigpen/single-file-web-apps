import preact from '@preact/preset-vite';
import { babel } from '@rollup/plugin-babel'; // ◄ Import Babel
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = './src';

// dist/ is local compiled artifacts dir
// docs/downloads is for docs deployment
const distDir = path.resolve(__dirname, 'dist');
const docsDownloadDir = path.resolve(__dirname, 'docs/downloads');

// Clean out directories first
for (const outDir of [distDir, docsDownloadDir]) {
    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outDir);
}


const apps = fs.readdirSync(srcDir).filter((file) => {
    return fs.statSync(path.join(srcDir, file)).isDirectory() && file !== 'shared';
});

console.log(`Starting compilation for ${apps.length} apps...\n`);

for (const appName of apps) {
    console.log(`Building: ${appName}...`);

    await build({
        root: path.resolve(__dirname, `src/${appName}`),
        configFile: false,
        plugins: [
            preact(),
            viteSingleFile(),
            // Babel intercepts the code and rewrites "??", "?.", and modern syntax down to ES2015
            babel({
                babelHelpers: 'bundled',
                presets: [
                    [
                        '@babel/preset-env',
                        {
                            targets: 'chrome 80', // Strictly enforce 2020 browser syntax compatibility
                            modules: false
                        }
                    ]
                ],
                // Ensure it sweeps through everything including node_modules if needed
                compact: true
            })
        ],
        build: {
            outDir: distDir,
            emptyOutDir: false,
            target: 'es2015', // Force output baseline lower than es2020
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, `src/${appName}/index.html`)
                }
            }
        },
        logLevel: 'warn'
    });

    const defaultOutputFile = path.join(distDir, 'index.html');
    const targetOutputFile = path.join(distDir, `${appName}.html`);

    if (fs.existsSync(defaultOutputFile)) {
        fs.renameSync(defaultOutputFile, targetOutputFile);
        console.log(`Generated: dist/${appName}.html\n`);
    }
}

console.log('All standalone applications built successfully!');

// Copy compiled single-file HTML variants over to the docs assets block
const builtFiles = fs.readdirSync(distDir).filter(file => file.endsWith('.html'));
for (const file of builtFiles) {
    fs.copyFileSync(path.join(distDir, file), path.join(docsDownloadDir, file));
    console.log(`Copied ${file} to docs/downloads/ for static deployment.`);
}
