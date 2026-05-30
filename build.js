import { build } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { babel } from '@rollup/plugin-babel'; // ◄ Import Babel
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = './src';

const distDir = path.resolve(__dirname, 'dist');
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

const apps = fs.readdirSync(srcDir).filter(file => {
    return fs.statSync(path.join(srcDir, file)).isDirectory() && file !== 'shared';
});

console.log(`Starting vintage-compatible compilation for ${apps.length} apps...\n`);

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
                    ['@babel/preset-env', {
                        targets: 'chrome 80', // Strictly enforce 2020 browser syntax compatibility
                        modules: false
                    }]
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