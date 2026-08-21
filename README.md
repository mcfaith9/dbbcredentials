# DBB Credentials — Local Desktop Password Manager (Electron + Vue 3 + Vite)

A secure, standalone desktop password manager built with **Electron**, **Vue 3**, **TypeScript**, **Tailwind CSS**, and **Vite**.

---

## 🚀 Running the App Locally

### 1. Run in Electron Desktop Window
To launch the native Electron desktop application window:
```bash
npm run dev
# or
npm run electron:dev
```
When executed on your computer (Windows, macOS, or Linux), Vite compiles the Electron main process (`electron/main.ts`) and preload script (`electron/preload.ts`), then launches the native Electron window with hot module reloading.

### 2. Build Native Desktop Binaries
To build installers and executables for your operating system:
```bash
npm run electron:build
```
This generates installable artifacts in the `release/` directory:
- **macOS**: `.dmg` and `.zip`
- **Windows**: `.exe` (NSIS Installer) and Portable binary
- **Linux**: `.AppImage` and `.deb`

---

## 🔐 Security Features

- **PBKDF2-SHA256 Master Key Derivation**: 100% offline authentication. Default credentials:
  - **Username**: `dbadmin`
  - **Password**: `ilovedbb`
- **AES-256-GCM Vault Encryption**: Encrypted storage and exports (`.dbb`).
- **Context Isolated Electron Shell**: Secure IPC bridge (`electron/preload.ts`) with no node integration in renderer.
- **Native OS File Dialogs & Notifications**: Native save/open dialogs and system desktop alerts.
