# Building the Executable (.exe) File

This guide will help you create a standalone `.exe` file that can run on any Windows PC without requiring installation or dependencies.

## Prerequisites

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **npm** (comes with Node.js)

## Step-by-Step Build Instructions

### 1. Install Dependencies

Open a terminal/command prompt in the project folder and run:

```bash
npm install
```

This will install all required dependencies (only needed once, or when dependencies change).

### 2. Build the Application

Run the build command:

```bash
npm run build:app
```

This will:
- Compile the TypeScript code
- Build the React application
- Package everything into a standalone executable

### 3. Find Your .exe File

After the build completes, you'll find the executable in:

```
release/Waypoint Planner-1.1.0-Portable.exe
```

This is a **portable executable** - it contains everything needed to run the application.

## Distributing the .exe File

### What to Send

Send the `.exe` file from the `release` folder. The recipient can:
- Double-click the `.exe` file to run it
- No installation required
- No dependencies needed
- Works on any Windows 10/11 PC (64-bit)

### File Size

The `.exe` file will be approximately **150-200 MB** because it includes:
- Electron runtime
- Chromium browser
- All Node.js dependencies
- Your application code

This is normal for Electron applications.

## Alternative: Create an Installer

If you prefer an installer instead of a portable .exe, you can modify `package.json`:

Change the `win.target` from `portable` to `nsis`:

```json
"win": {
  "target": "nsis"
}
```

Then run `npm run build:app` again. This will create an installer in the `release` folder.

## Troubleshooting

### Build Fails

1. **Make sure all dependencies are installed:**
   ```bash
   npm install
   ```

2. **Clear build cache:**
   ```bash
   npm run build:electron
   npm run build:vite
   ```

3. **Check for errors** in the terminal output

### The .exe Doesn't Run on Another PC

- Make sure the target PC is **Windows 10 or 11 (64-bit)**
- The .exe might be blocked by Windows Defender - the user needs to click "More info" and "Run anyway" on first launch
- Some antivirus software may flag Electron apps - this is a false positive

### File is Too Large

This is normal for Electron apps. The file includes:
- Complete Chromium browser (~100MB)
- Node.js runtime (~30MB)
- All dependencies (~20-50MB)

## Building for Other Platforms

### macOS
```bash
npm run build:app
```
Creates a `.dmg` file in the `release` folder.

### Linux
```bash
npm run build:app
```
Creates an `.AppImage` file in the `release` folder.

## Quick Build Command

For Windows portable .exe:
```bash
npm run build:app
```

The executable will be in: `release/Waypoint Planner-1.1.0-Portable.exe`

