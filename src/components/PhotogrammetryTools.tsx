import React, { useMemo, useState } from 'react'
import { useAtom } from 'jotai'
import { flightSettingsAtom, droneModelAtom, waypointsAtom } from '../store/flightPlanStore'
import {
  calculateAllPhotogrammetryMetrics,
  getCameraRecommendations,
} from '../utils/photogrammetryTools'
import { calculateFlightPath } from '../utils/flightPathCalculator'
import { Camera, Ruler, Image, Clock, Settings as SettingsIcon, Sun, Cloud, Moon } from 'lucide-react'
import './PhotogrammetryTools.css'

const PhotogrammetryTools: React.FC = () => {
  const [settings] = useAtom(flightSettingsAtom)
  const [droneModel] = useAtom(droneModelAtom)
  const [waypoints] = useAtom(waypointsAtom)
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('afternoon')
  const [weather, setWeather] = useState<'sunny' | 'cloudy' | 'overcast'>('sunny')
  const [processingSpeed, setProcessingSpeed] = useState(50) // images per hour

  // Calculate flight time
  const flightTime = useMemo(() => {
    if (waypoints.length < 2) return 0
    const path = calculateFlightPath(waypoints, settings)
    return path.estimatedTime / 60 // Convert to minutes
  }, [waypoints, settings])

  // Calculate all metrics
  const metrics = useMemo(() => {
    if (waypoints.length === 0) {
      return null
    }

    const baseMetrics = calculateAllPhotogrammetryMetrics(
      settings.altitude,
      droneModel,
      waypoints,
      settings,
      flightTime
    )

    // Update processing time with custom speed
    const processingTime = {
      ...baseMetrics.processingTime,
      estimatedHours: Math.floor(baseMetrics.imageCount.estimatedImages / processingSpeed),
      estimatedMinutes: Math.round(
        ((baseMetrics.imageCount.estimatedImages / processingSpeed) % 1) * 60
      ),
      processingSpeed,
    }

    // Get camera recommendations with current conditions
    const cameraRecommendations = getCameraRecommendations(settings.altitude, timeOfDay, weather)

    return {
      ...baseMetrics,
      processingTime,
      cameraRecommendations,
    }
  }, [settings, droneModel, waypoints, flightTime, timeOfDay, weather, processingSpeed])

  if (!metrics) {
    return (
      <div className="photogrammetry-tools">
        <div className="photogrammetry-header">
          <Camera size={18} />
          <h3>Photogrammetry Tools</h3>
        </div>
        <div className="photogrammetry-empty">
          <p>Add waypoints to calculate photogrammetry metrics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="photogrammetry-tools">
      <div className="photogrammetry-header">
        <Camera size={18} />
        <h3>Photogrammetry Tools</h3>
      </div>

      <div className="photogrammetry-content">
        {/* GSD Calculator */}
        <div className="photogrammetry-section">
          <div className="section-header">
            <Ruler size={16} />
            <h4>Ground Sample Distance (GSD)</h4>
          </div>
          <div className="section-content">
            <div className="metric-row">
              <span className="metric-label">GSD:</span>
              <span className="metric-value">{metrics.gsd.gsd} cm/pixel</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Pixel Size:</span>
              <span className="metric-value">{metrics.gsd.pixelSize} cm</span>
            </div>
            <div className="metric-note">
              Lower GSD = Higher detail. For mapping, aim for 1-5 cm/pixel
            </div>
          </div>
        </div>

        {/* Coverage Calculator */}
        <div className="photogrammetry-section">
          <div className="section-header">
            <Image size={16} />
            <h4>Coverage Area</h4>
          </div>
          <div className="section-content">
            <div className="metric-row">
              <span className="metric-label">Single Image:</span>
              <span className="metric-value">
                {metrics.coverage.imageFootprint.width.toFixed(1)}m ×{' '}
                {metrics.coverage.imageFootprint.height.toFixed(1)}m
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Single Image Area:</span>
              <span className="metric-value">
                {metrics.coverage.singleImageArea.toFixed(0)} m²
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">Total Coverage:</span>
              <span className="metric-value">
                {metrics.coverage.totalCoverageArea < 10000
                  ? `${metrics.coverage.totalCoverageArea.toFixed(0)} m²`
                  : `${(metrics.coverage.totalCoverageArea / 10000).toFixed(2)} ha`}
              </span>
            </div>
          </div>
        </div>

        {/* Image Count Estimator */}
        <div className="photogrammetry-section">
          <div className="section-header">
            <Image size={16} />
            <h4>Image Count</h4>
          </div>
          <div className="section-content">
            <div className="metric-row">
              <span className="metric-label">Estimated Images:</span>
              <span className="metric-value highlight">
                {metrics.imageCount.estimatedImages}
              </span>
            </div>
            <div className="metric-row">
              <span className="metric-label">From Waypoints:</span>
              <span className="metric-value">{metrics.imageCount.totalImages}</span>
            </div>
            <div className="metric-note">
              Based on flight path, spacing, and overlap settings
            </div>
          </div>
        </div>

        {/* Processing Time Estimator */}
        <div className="photogrammetry-section">
          <div className="section-header">
            <Clock size={16} />
            <h4>Processing Time</h4>
          </div>
          <div className="section-content">
            <div className="metric-row">
              <span className="metric-label">Estimated Time:</span>
              <span className="metric-value highlight">
                {metrics.processingTime.estimatedHours > 0
                  ? `${metrics.processingTime.estimatedHours}h ${metrics.processingTime.estimatedMinutes}m`
                  : `${metrics.processingTime.estimatedMinutes}m`}
              </span>
            </div>
            <div className="processing-speed-control">
              <label>
                Processing Speed:
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={processingSpeed}
                  onChange={(e) => setProcessingSpeed(parseInt(e.target.value) || 50)}
                  className="speed-input"
                />
                <span>images/hour</span>
              </label>
            </div>
            <div className="metric-note">
              Typical: 30-100 images/hour depending on hardware and software
            </div>
          </div>
        </div>

        {/* Camera Settings Recommendations */}
        <div className="photogrammetry-section">
          <div className="section-header">
            <SettingsIcon size={16} />
            <h4>Camera Recommendations</h4>
          </div>
          <div className="section-content">
            <div className="condition-selectors">
              <div className="condition-selector">
                <label>Time of Day:</label>
                <div className="condition-buttons">
                  <button
                    className={timeOfDay === 'morning' ? 'active' : ''}
                    onClick={() => setTimeOfDay('morning')}
                    title="Morning"
                  >
                    <Sun size={14} />
                    Morning
                  </button>
                  <button
                    className={timeOfDay === 'afternoon' ? 'active' : ''}
                    onClick={() => setTimeOfDay('afternoon')}
                    title="Afternoon"
                  >
                    <Sun size={14} />
                    Afternoon
                  </button>
                  <button
                    className={timeOfDay === 'evening' ? 'active' : ''}
                    onClick={() => setTimeOfDay('evening')}
                    title="Evening"
                  >
                    <Sun size={14} />
                    Evening
                  </button>
                  <button
                    className={timeOfDay === 'night' ? 'active' : ''}
                    onClick={() => setTimeOfDay('night')}
                    title="Night"
                  >
                    <Moon size={14} />
                    Night
                  </button>
                </div>
              </div>
              <div className="condition-selector">
                <label>Weather:</label>
                <div className="condition-buttons">
                  <button
                    className={weather === 'sunny' ? 'active' : ''}
                    onClick={() => setWeather('sunny')}
                    title="Sunny"
                  >
                    <Sun size={14} />
                    Sunny
                  </button>
                  <button
                    className={weather === 'cloudy' ? 'active' : ''}
                    onClick={() => setWeather('cloudy')}
                    title="Cloudy"
                  >
                    <Cloud size={14} />
                    Cloudy
                  </button>
                  <button
                    className={weather === 'overcast' ? 'active' : ''}
                    onClick={() => setWeather('overcast')}
                    title="Overcast"
                  >
                    <Cloud size={14} />
                    Overcast
                  </button>
                </div>
              </div>
            </div>

            <div className="recommendations-list">
              <div className="recommendation-item">
                <strong>ISO:</strong> {metrics.cameraRecommendations.recommendedISO}
              </div>
              <div className="recommendation-item">
                <strong>Shutter Speed:</strong> {metrics.cameraRecommendations.recommendedShutterSpeed}
              </div>
              <div className="recommendation-item">
                <strong>Aperture:</strong> {metrics.cameraRecommendations.recommendedAperture}
              </div>
              <div className="recommendation-item">
                <strong>White Balance:</strong> {metrics.cameraRecommendations.recommendedWhiteBalance}
              </div>
            </div>

            {metrics.cameraRecommendations.notes.length > 0 && (
              <div className="recommendations-notes">
                <strong>Notes:</strong>
                <ul>
                  {metrics.cameraRecommendations.notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhotogrammetryTools

