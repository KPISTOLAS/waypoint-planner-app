# Waypoint Planner - DJI Drone Flight Planning Application

A desktop application for creating and managing automated flight plans for DJI drones, with premium features for advanced photogrammetry and 3D mapping workflows.

## Features

### Core Features
- **Waypoint Creation**: Create waypoints by clicking on the map or manually entering coordinates
- **DJI WPML Mission Export**: Exports DJI-compatible WPML KMZ mission packages for supported DJI enterprise platforms:
  - Mavic 3 Enterprise / Thermal / Multispectral
  - Matrice 30 / 30T
  - Matrice 3D / 3TD
- **Interactive Map**: Visualize and edit flight plans on an interactive map
- **Flight Plan Management**: Save and load flight plans as JSON files

### Premium Features
- **Dynamic Altitude Adjustment**: Automatically adjust altitude based on terrain
- **Waypoint Actions**: Add actions at waypoints (take photo, start/stop recording, rotate gimbal, hover)
- **Reverse Points**: Reverse the order of waypoints
- **Line Orientation**: Rotate flight paths by specified angle
- **Straightened Flight Paths**: Optimize paths by removing unnecessary waypoints
- **KMZ Import/Export**: Import KML/KMZ geometry and export DJI WPML KMZ missions
- **Image Overlap Control**: Configure forward and side overlap percentages for photogrammetry

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

1. **Create a New Flight Plan**: Click "New" in the toolbar
2. **Select Drone Model**: Choose your DJI drone model from the settings panel
3. **Configure Flight Settings**: Set altitude, speed, gimbal angle, path spacing, and image overlap
4. **Add Waypoints**: 
   - Click on the map to add waypoints
   - Or use the "Add Waypoint" button and enter coordinates manually
5. **Edit Waypoints**: Click on a waypoint in the list to edit its properties
6. **Add Actions**: Select a waypoint and add actions like taking photos or recording video
7. **Enable Premium Features**: Toggle options like dynamic altitude, reverse points, straightened paths
8. **Save/Load**: Save your flight plan as JSON or export as DJI WPML KMZ for use with DJI Pilot 2 / FlightHub 2 supported aircraft

## Technology Stack

- **Electron**: Desktop application framework
- **React**: UI framework
- **TypeScript**: Type safety
- **Leaflet**: Interactive maps
- **Jotai**: State management
- **Vite**: Build tool and dev server

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Third-Party Attributions

This project uses several open-source libraries and map tile providers. See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for a complete list of third-party software and their licenses.

