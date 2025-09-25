# StaPOS - Offline Setup Guide

## 🚀 Running StaPOS Offline on PC, Tablet & Phone

This guide will help you set up StaPOS to run completely offline on all your devices without using internet data.

## 📋 Prerequisites

### For PC (Windows/Mac/Linux):
- Node.js (version 16 or higher) - Download from [nodejs.org](https://nodejs.org/)
- Git (optional) - Download from [git-scm.com](https://git-scm.com/)

### For Mobile Devices:
- Termux (Android) or iSH (iOS) for running Node.js
- Or use a local server app

## 🔧 Setup Instructions

### Step 1: Download the Project
```bash
# If you have git installed
git clone [your-repository-url]
cd stapos

# Or download and extract the ZIP file
```

### Step 2: Install Dependencies
```bash
# Install all required packages
npm install

# This will install all dependencies locally
```

### Step 3: Setup Environment Variables
```bash
# Copy the environment template
cp .env.example .env

# Edit .env file with your Supabase credentials
# (You'll need these for the database to work)
```

### Step 4: Build for Production
```bash
# Create optimized production build
npm run build

# This creates a 'dist' folder with all files
```

### Step 5: Serve Locally
```bash
# Option 1: Use the preview command
npm run preview

# Option 2: Use a simple HTTP server
npx serve dist

# Option 3: Use Python (if installed)
cd dist
python -m http.server 3000
```

## 📱 Mobile Setup Options

### Option A: Using Termux (Android)
1. Install Termux from F-Droid or Google Play
2. Run these commands in Termux:
```bash
pkg update
pkg install nodejs git
git clone [your-project]
cd stapos
npm install
npm run build
npm run preview
```

### Option B: Using Local Server Apps
1. **Android**: Use "Simple HTTP Server" or "KSWEB"
2. **iOS**: Use "WebDAV Nav+" or "Documents by Readdle"
3. Copy the `dist` folder to the app
4. Start the local server

### Option C: Progressive Web App (PWA)
1. Open the app in your mobile browser
2. Add to Home Screen when prompted
3. Works offline after first load

## 🌐 Network Setup for Multiple Devices

### Option 1: WiFi Hotspot
1. Create a WiFi hotspot on your PC
2. Connect all devices to this hotspot
3. Access via PC's local IP address

### Option 2: Local Network
1. Run the server on your PC: `npm run preview -- --host`
2. Find your PC's IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Access from other devices: `http://[PC-IP]:4173`

### Option 3: USB Tethering
1. Connect phone to PC via USB
2. Enable USB tethering
3. Access the local server

## 🗄️ Database Setup (Offline)

### Option 1: Local SQLite (Recommended)
```bash
# Install SQLite support
npm install better-sqlite3 sqlite3

# The app will automatically use local database
```

### Option 2: Local Supabase
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Initialize local Supabase
supabase init
supabase start

# This runs a local Supabase instance
```

## 📂 File Structure After Setup
```
stapos/
├── dist/                 # Built files for production
├── src/                  # Source code
├── node_modules/         # Dependencies
├── .env                  # Environment variables
├── package.json          # Project configuration
└── README-OFFLINE-SETUP.md
```

## 🔧 Troubleshooting

### Common Issues:

1. **Port Already in Use**
   ```bash
   # Use different port
   npm run preview -- --port 3001
   ```

2. **Permission Denied (Mobile)**
   ```bash
   # Fix permissions in Termux
   termux-setup-storage
   ```

3. **Network Access Issues**
   ```bash
   # Allow network access
   npm run preview -- --host 0.0.0.0
   ```

4. **Database Connection**
   - Check .env file configuration
   - Ensure Supabase is running (if using local)
   - Verify network connectivity

## 📊 Performance Tips

1. **Optimize for Mobile**:
   - Use WiFi instead of mobile data
   - Close other apps to free memory
   - Use landscape mode for better view

2. **Battery Saving**:
   - Reduce screen brightness
   - Use airplane mode + WiFi only
   - Close background apps

3. **Storage Management**:
   - Clear browser cache regularly
   - Monitor device storage
   - Backup data regularly

## 🔒 Security Notes

- Change default passwords
- Use HTTPS when possible
- Keep local network secure
- Regular data backups

## 📞 Support

If you encounter issues:
1. Check the console for error messages
2. Verify all dependencies are installed
3. Ensure ports are not blocked
4. Check device compatibility

## 🎯 Quick Start Commands

```bash
# Complete setup in one go
npm install && npm run build && npm run preview

# Access from other devices
npm run preview -- --host 0.0.0.0 --port 3000
```

Your StaPOS system will be accessible at:
- **PC**: http://localhost:3000
- **Other devices**: http://[YOUR-PC-IP]:3000

Enjoy your offline Point of Sale system! 🎉