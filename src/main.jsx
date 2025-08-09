import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import SharedStoryViewer from './components/SharedStoryViewer.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import stabilityMonitor from './utils/stabilityMonitor.js'

// Initialize stability monitoring only once (guard for SSR/undefined window)
if (typeof window !== 'undefined' && !window._stabilityMonitorInitialized) {
  stabilityMonitor.startMonitoring()
  window._stabilityMonitorInitialized = true
}

const appTree = (
  <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/shared/:shareId" element={<SharedStoryViewer />} />
      </Routes>
    </BrowserRouter>
  </ErrorBoundary>
)

createRoot(document.getElementById('root')).render(
  import.meta.env?.DEV ? <StrictMode>{appTree}</StrictMode> : appTree
)
