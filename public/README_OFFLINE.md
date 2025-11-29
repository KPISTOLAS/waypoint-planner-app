# Offline-First Architecture

This application implements a complete offline-first architecture with the following features:

## Features

### 1. Full Offline Functionality
- All data is stored locally using IndexedDB
- Application works completely offline
- No internet connection required for core functionality

### 2. Local-First Data Storage
- IndexedDB for persistent local storage
- Automatic fallback to local storage when file system is unavailable
- All flight plans saved locally first, then synced when possible

### 3. Background Sync
- Automatic sync when connection is restored
- Periodic sync check every 30 seconds
- Manual sync option available
- Sync status indicator in UI

### 4. Progressive Web App (PWA) Capabilities
- Service Worker for offline caching
- Web App Manifest for installability
- App can be installed on devices
- Works as standalone app when installed

## Storage Architecture

### IndexedDB Stores
- **flightPlans**: All flight plan data
- **settings**: Application settings
- **syncQueue**: Items pending sync

### Storage Flow
1. User saves flight plan → Saved to IndexedDB immediately
2. If Electron API available → Also saved to file system
3. If online → Queued for background sync
4. When offline → Data remains in IndexedDB, syncs when online

## Service Worker

The service worker (`/sw.js`) provides:
- Offline caching of app resources
- Background sync for data
- Cache management and updates

## Icons

For full PWA support, add these icon files to the `public` folder:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

These can be generated from your app logo.

## Usage

The offline functionality is automatic. Users will see:
- Offline indicator when connection is lost
- Sync status when items are pending
- Automatic sync when connection is restored

## API

### Storage Adapter
```typescript
import { saveFlightPlanLocal, loadAllFlightPlansLocal } from './utils/storageAdapter'

// Save flight plan (works offline)
await saveFlightPlanLocal(flightPlan)

// Load all flight plans (from local storage)
const plans = await loadAllFlightPlansLocal()
```

### Sync Manager
```typescript
import { syncManager } from './utils/syncManager'

// Get sync status
const status = syncManager.getStatus()

// Force sync
await syncManager.forceSync()

// Subscribe to status changes
const unsubscribe = syncManager.subscribe((status) => {
  console.log('Sync status:', status)
})
```

