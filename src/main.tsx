import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import SharedStoryViewer from './components/SharedStoryViewer.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import stabilityMonitor from './utils/stabilityMonitor'

// Extend window interface for stability monitor
declare global {
  interface Window {
    _stabilityMonitorInitialized?: boolean
  }
}

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

createRoot(document.getElementById('root')!).render(
  process.env.NODE_ENV === 'development' ? <StrictMode>{appTree}</StrictMode> : appTree
)
