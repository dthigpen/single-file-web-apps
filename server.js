import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = 8080;

const server = http.createServer((req, res) => {
    // Decode the requested file name from the URL path (e.g., /totp_vault.html)
    const fileName = decodeURIComponent(req.url.replace(/^\//, '')) || 'index.html';
    const filePath = path.join(DIST_DIR, fileName);

    // Security check: Ensure the device isn't escaping the dist folder
    if (
        !filePath.startsWith(DIST_DIR) ||
        !fs.existsSync(filePath) ||
        fs.statSync(filePath).isDirectory()
    ) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('File not found inside distribution build.');
    }

    console.log(`Beaming file to device: ${fileName}`);

    // THE MAGIC HEADERS: Forces the browser to download instead of opening
    res.writeHead(200, {
        'Content-Type': 'application/octet-stream', // Treats it as a raw download payload
        'Content-Disposition': `attachment; filename="${fileName}"`, // Forces native "Save File" dialog
        'Content-Length': fs.statSync(filePath).size
    });

    // Stream the file directly to the phone's download manager
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Wireless Download Portal active on port ${PORT}!`);
    console.log(`Access on your flip phone via Wi-Fi using your computer's local IP.`);
});
