# Getting Started

Because every application in this project is built into a single, independent HTML file, running them is simple. Your data never touches a remote server regardless of how you choose to open them, all processing and cryptography occur entirely inside your browser window.

---

## Ways to Run the Apps

### Opening from the Hosted Website (Quickest)
You can run the latest stable versions directly from the project's portfolio site.
* **The Link:** https://dthigpen.github.io/single-file-web-apps/
* **How it works:** Your browser downloads the single-file app directly into its temporary cache. Any time the browser reloads the page, it will need internet connection to fetch the page again. The nice thing about this method is that it automatically loads updated versions of the apps!

### Opening Files Locally (Zero Network Reliance)
If you want to be completely disconnected from the web, you can run the pre-compiled applications directly from your device’s hard drive or storage card.
* **How to do it:** Navigate into the repository's root `dist/` directory and open the app file (for example, `dist/totp_app.html`) directly with your standard web browser.
* **What you will see:** Your browser will display a `file:///` address in the URL bar. This confirms that the file is running locally from your device without any network connection overhead.

---

## Moving an App onto a Mobile Device or Dumbphone

To put a tool like the TOTP vault onto a secondary phone, e-ink device, or minimalist device setup, follow these steps:

1. **Locate the Compiled File**  
   Open the root-level `dist/` folder and copy the standalone target file (like `totp_app.html`).

2. **Transfer to Device Storage**  
   Connect your mobile device via a USB data cable or mount its MicroSD card. Copy the `.html` file into a permanent directory on the device storage (such as a `/Documents/` folder).

3. **Open and Bookmark**  
   Open your device's native file manager app, select the `.html` file, and open it with your web browser. Once it loads, add the page to your browser bookmarks so you can launch it instantly anytime you are offline.

---

## Advanced Setup: Running Over a Home Network

If you want to host these single-file utilities on a local home server or Raspberry Pi so multiple devices on your Wi-Fi network can access them via a shared URL, there is one critical security constraint to keep in mind: **The Secure Context Restriction**.

Modern web browsers will completely block access to the Web Crypto API (which handles your master password encryption and token generation) unless the application is running inside a verified Secure Context.

Browsers only recognize a Secure Context in three specific scenarios:
1. Any URL beginning with `http://localhost` or `http://127.0.0.1` (local loopback loops are always trusted).
2. Any asset executed directly as a local file via a `file:///` path.
3. Any network domain or IP address utilizing an active **`https://`** connection.

> **The Local Network Catch:** If you host an app at a plain network IP like `http://192.168.1.50/totp_app.html`, devices connecting over your Wi-Fi will display a "Crypto Not Supported" error because the connection is unencrypted. To make home network hosting work, you must configure a local reverse proxy (like Nginx or Caddy) to sign traffic with SSL certificates or utilize an ecosystem like Tailscale to provide automated HTTPS links.