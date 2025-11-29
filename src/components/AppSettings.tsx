import React, { useState } from 'react'
import { useAtom } from 'jotai'
import { themeAtom, layoutAtom, UILayout, Theme } from '../store/uiSettingsStore'
import { Settings, Moon, Sun, Layout, X, ChevronDown, ChevronUp } from 'lucide-react'
import './AppSettings.css'

const AppSettings: React.FC = () => {
  const [theme, setTheme] = useAtom(themeAtom)
  const [layout, setLayout] = useAtom(layoutAtom)
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)

  const layoutOptions: { value: UILayout; name: string; description: string }[] = [
    {
      value: 'default',
      name: 'Default',
      description: 'Standard layout with balanced panels',
    },
    {
      value: 'compact',
      name: 'Compact',
      description: 'Smaller panels, more map space',
    },
    {
      value: 'wide',
      name: 'Wide',
      description: 'Wider panels for detailed information',
    },
    {
      value: 'minimal',
      name: 'Minimal',
      description: 'Minimal UI, maximum map area',
    },
  ]

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <>
      <button
        className="app-settings-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="App Settings"
      >
        <Settings size={20} />
      </button>

      {isOpen && (
        <div className="app-settings-overlay" onClick={() => setIsOpen(false)}>
          <div className="app-settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="app-settings-header">
              <h2>Application Settings</h2>
              <button className="close-btn" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="app-settings-content">
              {/* Theme Toggle */}
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3>Theme</h3>
                </div>
                <div className="theme-toggle-container">
                  <button
                    className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                  >
                    <Sun size={18} />
                    <span>Light</span>
                  </button>
                  <button
                    className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                  >
                    <Moon size={18} />
                    <span>Dark</span>
                  </button>
                </div>
              </div>

              {/* UI Layout Options */}
              <div className="settings-section">
                <div
                  className="settings-section-header"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  style={{ cursor: 'pointer' }}
                >
                  <h3>UI Layout</h3>
                  {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
                {!isCollapsed && (
                  <div className="layout-options">
                    {layoutOptions.map((option) => (
                      <div
                        key={option.value}
                        className={`layout-option ${layout === option.value ? 'active' : ''}`}
                        onClick={() => setLayout(option.value)}
                      >
                        <div className="layout-option-header">
                          <Layout size={16} />
                          <span className="layout-option-name">{option.name}</span>
                        </div>
                        <p className="layout-option-description">{option.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AppSettings

