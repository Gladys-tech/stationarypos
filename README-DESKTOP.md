# StaPOS Desktop Application

A complete offline Point of Sale system for stationary stores, built with Electron and React.

## Features

- **Complete Offline Functionality**: Works without internet connection
- **Local Database**: Uses IndexedDB for local data storage
- **Desktop Integration**: Native desktop app with system menus
- **Data Backup/Import**: Export and import your data
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Keyboard Shortcuts**: Full keyboard navigation support
- **Print Support**: Direct printing of receipts

## Development

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run electron-dev
```

This will start both the React development server and the Electron app.

### Building

To build the desktop application:

```bash
npm run electron-build
```

This will create distributable packages in the `dist-electron` folder.

### Available Scripts

- `npm run electron-dev` - Start development mode
- `npm run electron-build` - Build for production
- `npm run dist` - Create distribution packages
- `npm run build` - Build web version only

## Desktop Features

### Keyboard Shortcuts

- **Ctrl+N** (Cmd+N on Mac) - New Sale
- **Ctrl+T** (Cmd+T on Mac) - View Transactions
- **Ctrl+D** (Cmd+D on Mac) - Dashboard
- **Ctrl+I** (Cmd+I on Mac) - Inventory
- **Ctrl+R** (Cmd+R on Mac) - Reports
- **Ctrl+P** (Cmd+P on Mac) - Print
- **Ctrl+,** (Cmd+, on Mac) - Settings
- **F11** (Ctrl+Cmd+F on Mac) - Fullscreen
- **Ctrl+Shift+I** (Alt+Cmd+I on Mac) - Developer Tools

### Menu Features

- **File Menu**: New sale, transactions, print, exit
- **View Menu**: Navigation, zoom controls, fullscreen
- **Tools Menu**: Data backup/import, settings
- **Window Menu**: Window management
- **Help Menu**: About, shortcuts, documentation

### Data Management

The desktop app uses IndexedDB for local storage and can:

- Store all POS data locally
- Work completely offline
- Export data to JSON files
- Import data from backup files
- Sync with online database when available

### Offline Database

The app includes a complete offline database system that mirrors the online Supabase structure:

- **Products**: Inventory management
- **Sales**: Transaction records
- **Expenses**: Business expenses
- **Categories**: Product categories
- **Users**: User profiles and authentication

## Distribution

### Windows

Creates an NSIS installer (.exe) that installs the app system-wide.

### macOS

Creates a DMG file with the app bundle for easy installation.

### Linux

Creates both AppImage (portable) and DEB package formats.

## Architecture

- **Frontend**: React with TypeScript
- **Desktop Framework**: Electron
- **Local Database**: IndexedDB with custom wrapper
- **State Management**: React Context
- **Styling**: Tailwind CSS
- **Build Tool**: Vite
- **Package Builder**: electron-builder

## Security

- Context isolation enabled
- Node integration disabled
- Secure IPC communication
- Local data encryption (planned)

## Performance

- Lazy loading of components
- Efficient local database queries
- Optimized bundle splitting
- Memory management for large datasets

## Troubleshooting

### Common Issues

1. **App won't start**: Check Node.js version (16+ required)
2. **Build fails**: Clear node_modules and reinstall
3. **Database errors**: Clear browser data and restart
4. **Print issues**: Check system printer settings

### Debug Mode

Run with debug flags:
```bash
DEBUG=* npm run electron-dev
```

### Logs

Application logs are stored in:
- **Windows**: `%APPDATA%/StaPOS Desktop/logs/`
- **macOS**: `~/Library/Logs/StaPOS Desktop/`
- **Linux**: `~/.config/StaPOS Desktop/logs/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.