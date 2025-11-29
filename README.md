# Waypoint Planner - DJI Drone Flight Planning Application

A desktop application for creating and managing automated flight plans for DJI drones, with premium features for advanced photogrammetry and 3D mapping workflows.

## Version History

### Version 1.1.0 (Current)

#### New Features
- **Welcome Page & Project Management**: New welcome screen with project browser, recent projects list, and quick project creation
- **Auto-Save System**: Automatic saving of flight plans to prevent data loss
- **Battery Usage Calculator**: Estimate battery consumption and maximum safe flight distance based on drone model and flight parameters
- **Enhanced Export Options**: 
  - Export to CSV format for spreadsheet analysis
  - Generate comprehensive PDF flight reports with statistics
  - Export to DJI FlightHub JSON format
  - Export to Litchi CSV format for Litchi app compatibility
- **Flight Statistics Dashboard**: View detailed flight statistics including total distance, estimated flight time, battery usage, and waypoint count
- **Terrain Elevation Integration**: Apply terrain elevation data to waypoints for accurate altitude planning
- **Waypoint Templates**: Pre-configured waypoint patterns for common mission types
- **Toast Notification System**: User-friendly notifications for actions and errors
- **Professional Documentation**: Complete user guide and professional website documentation

#### Improvements
- Enhanced UI/UX with improved styling and user feedback
- Better error handling and user notifications
- Improved waypoint management interface
- Enhanced settings panel with better organization

### Version 1.0.0

#### Core Features
- **Waypoint Creation**: Create waypoints by clicking on the map or manually entering coordinates
- **DJI Drone Support**: Supports multiple DJI models including:
  - Mini 5 Pro
  - Mavic 4 Pro
  - Mini 4 Pro
  - Air 3 / Air 3S
  - Mavic 3 / Mavic 3 Pro / Mavic 3 Classic
- **Interactive Map**: Visualize and edit flight plans on an interactive map with multiple map styles (Dark, Satellite, Terrain, Light, OpenStreetMap)
- **Flight Plan Management**: Save and load flight plans as JSON files
- **Drawing Tools**: Create waypoints from polygons, rectangles, and circular POI areas
- **Mission Splitting**: Split large missions into smaller, manageable parts

#### Premium Features
- **Dynamic Altitude Adjustment**: Automatically adjust altitude based on terrain
- **Waypoint Actions**: Add actions at waypoints (take photo, start/stop recording, rotate gimbal, hover)
- **Reverse Points**: Reverse the order of waypoints
- **Line Orientation**: Rotate flight paths by specified angle
- **Straightened Flight Paths**: Optimize paths by removing unnecessary waypoints
- **KMZ Import/Export**: Import and export flight plans in KMZ format for DJI apps
- **KML/WGS84 Import**: Import polygon data from KML files and coordinate files
- **Image Overlap Control**: Configure forward and side overlap percentages for photogrammetry
- **Flight Presets**: Quick configuration presets for 3D Modeling, Mapping, Scanning, and Inspection missions

## Features

### Core Features
- **Waypoint Creation**: Create waypoints by clicking on the map or manually entering coordinates
- **DJI Drone Support**: Supports multiple DJI models including:
  - Mini 5 Pro
  - Mavic 4 Pro
  - Mini 4 Pro
  - Air 3 / Air 3S
  - Mavic 3 / Mavic 3 Pro / Mavic 3 Classic
- **Interactive Map**: Visualize and edit flight plans on an interactive map
- **Flight Plan Management**: Save and load flight plans as JSON files
- **Project Management**: Organize multiple flight plans with the welcome page interface
- **Auto-Save**: Automatic saving to prevent data loss

### Premium Features
- **Dynamic Altitude Adjustment**: Automatically adjust altitude based on terrain
- **Waypoint Actions**: Add actions at waypoints (take photo, start/stop recording, rotate gimbal, hover)
- **Reverse Points**: Reverse the order of waypoints
- **Line Orientation**: Rotate flight paths by specified angle
- **Straightened Flight Paths**: Optimize paths by removing unnecessary waypoints
- **Multiple Export Formats**: 
  - JSON (native format)
  - KMZ (for DJI Fly/Pilot)
  - CSV (for spreadsheet analysis)
  - PDF (comprehensive flight reports)
  - DJI FlightHub JSON
  - Litchi CSV
- **Import Support**: KMZ, KML, WGS84/TXT coordinate files
- **Image Overlap Control**: Configure forward and side overlap percentages for photogrammetry
- **Battery Calculator**: Estimate battery usage and safe flight distances
- **Flight Statistics**: View detailed flight metrics and statistics
- **Terrain Elevation**: Apply terrain data for accurate altitude planning
- **Waypoint Templates**: Pre-configured patterns for common missions

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

To run the application in development mode:

```bash
npm run electron:dev
```

This will start the Vite dev server and launch Electron.

## Building

To build the application for production:

```bash
npm run build
```

This will create distributable packages in the `release` directory.

## Usage

### Getting Started

1. **Launch the Application**: Open Waypoint Planner to see the welcome page
2. **Create or Open a Project**: 
   - Click "Create New Project" to start a new flight plan
   - Or select a recent project from the list
3. **Select Drone Model**: Choose your DJI drone model from the settings panel
4. **Configure Flight Settings**: 
   - Use presets (3D Modeling, Mapping, Scanning, Inspection) for quick setup
   - Or manually configure altitude, speed, gimbal angle, path spacing, and image overlap
5. **Add Waypoints**: 
   - Click on the map to add waypoints
   - Use drawing tools (Rectangle, Polygon, POI) to generate waypoints automatically
   - Or use the "Add Waypoint" button and enter coordinates manually
6. **Edit Waypoints**: Click on a waypoint in the list to edit its properties
7. **Add Actions**: Select a waypoint and add actions like taking photos or recording video
8. **View Statistics**: Check flight statistics including distance, time, and battery usage
9. **Export**: Save as JSON or export in various formats (KMZ, CSV, PDF, DJI FlightHub, Litchi)

### Advanced Features

- **Auto-Save**: Your flight plan is automatically saved as you work
- **Mission Splitting**: Split large missions into smaller parts for battery management
- **Terrain Elevation**: Apply terrain data to adjust waypoint altitudes automatically
- **Battery Calculator**: Estimate battery usage before flight
- **Flight Presets**: Use optimized presets for different mission types

## Technology Stack

- **Electron**: Desktop application framework
- **React**: UI framework
- **TypeScript**: Type safety
- **Leaflet**: Interactive maps
- **Jotai**: State management
- **Vite**: Build tool and dev server

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Documentation

Comprehensive documentation is available in the `docs/` folder:
- **User Guide**: Complete guide with all features and instructions (`docs/guide.html`)
- **Website**: Professional documentation website (`docs/index.html`)

## Third-Party Attributions

This project uses several open-source libraries and map tile providers. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for a complete list of third-party software and their licenses.

## Changelog

### [1.2.0] - Current Release (December 2024)
- Complete UI redesign with draggable, floating panels
- Advanced photogrammetry tools (GSD, coverage, image count, processing time, camera recommendations)
- Offline-first architecture with IndexedDB storage and PWA capabilities
- Keyboard shortcuts and customizable UI layouts
- Enhanced dark theme
- Measurement tools and waypoint clustering
- Print-friendly views and drag-and-drop import
- Export presets functionality

### [1.1.0] - Previous Release (July 2024)
- Added welcome page with project management
- Implemented auto-save functionality
- Added battery usage calculator
- Enhanced export options (CSV, PDF, DJI FlightHub, Litchi)
- Added flight statistics dashboard
- Integrated terrain elevation data
- Added waypoint templates
- Implemented toast notification system
- Created professional documentation website
- Improved UI/UX throughout the application

### [1.0.0] - Initial Release
- Basic waypoint creation and editing
- DJI drone model support
- Interactive map with multiple styles
- Flight plan save/load (JSON)
- KMZ import/export
- Drawing tools (polygon, rectangle, POI)
- Mission splitting
- Flight presets
- Dynamic altitude adjustment
- Waypoint actions
- Image overlap control

