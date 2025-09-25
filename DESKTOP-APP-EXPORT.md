# StaPOS Desktop Application - Complete Export

This package contains all the files needed to run your Point of Sale system as a desktop application.

## 📁 File Structure

```
stapos-desktop/
├── electron/
│   ├── main.js                 # Main Electron process
│   ├── preload.js             # Secure IPC bridge
│   └── assets/
│       ├── icon.png           # App icon (512x512)
│       ├── icon.ico           # Windows icon
│       └── icon.icns          # macOS icon
├── src/
│   ├── hooks/
│   │   └── useElectron.tsx    # Electron integration hook
│   ├── lib/
│   │   ├── database.ts        # Local IndexedDB wrapper
│   │   ├── offlineSupabase.ts # Offline Supabase wrapper
│   │   └── supabase.ts        # Updated with offline support
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── ElectronTitleBar.tsx
│   │   │   └── Layout.tsx     # Updated with Electron support
│   │   └── ui/
│   │       └── OfflineIndicator.tsx
│   └── App.tsx                # Updated with offline indicator
├── package.json               # Updated with Electron dependencies
├── electron-builder.json      # Build configuration
├── vite.config.ts            # Updated for Electron
└── README-DESKTOP.md         # Desktop app documentation
```

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run in Development**
   ```bash
   npm run electron-dev
   ```

3. **Build Desktop App**
   ```bash
   npm run electron-build
   ```

## 📋 Installation Steps

1. Copy all files to your project directory
2. Install Node.js dependencies: `npm install`
3. Add app icons to `electron/assets/` folder
4. Run development mode: `npm run electron-dev`
5. Build for production: `npm run electron-build`

## 🎯 Features

- ✅ Complete offline functionality
- ✅ Local database (IndexedDB)
- ✅ Native desktop menus
- ✅ Keyboard shortcuts
- ✅ Print support
- ✅ Data backup/import
- ✅ Cross-platform (Windows, macOS, Linux)
- ✅ All original web app features preserved

## 📦 Distribution

The build creates installers for:
- Windows: NSIS installer (.exe)
- macOS: DMG file
- Linux: AppImage and DEB packages

## 🔧 Customization

- Update app name in `package.json` and `electron-builder.json`
- Replace icons in `electron/assets/`
- Modify menu items in `electron/main.js`
- Customize build settings in `electron-builder.json`

Your desktop POS application is ready to deploy!