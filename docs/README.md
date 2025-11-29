# Waypoint Planner - Documentation

This folder contains the documentation website for Waypoint Planner, designed to be hosted on GitHub Pages.

## Files

- **index.html** - Main landing page with introduction and features
- **intro.html** - Alternative introduction page (same content as index.html)
- **guide.html** - Complete user guide with all features and instructions

## GitHub Pages Setup

To enable GitHub Pages for this repository:

1. Go to your repository on GitHub
2. Click on **Settings**
3. Scroll down to **Pages** section
4. Under **Source**, select **Deploy from a branch**
5. Select **main** (or **master**) branch
6. Select **/docs** folder
7. Click **Save**

Your site will be available at: `https://kpistolas.github.io/Waypoint-PlannerWeb/`

## Local Testing

To test the pages locally before pushing:

1. Open the files directly in a browser, or
2. Use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server docs -p 8000
   ```
3. Visit `http://localhost:8000` in your browser

## Links

- Main page: `index.html` (or root URL)
- User Guide: `guide.html`
- Download: Links to GitHub Releases

All links use relative paths, so they work both locally and on GitHub Pages.

