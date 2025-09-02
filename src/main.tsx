import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import SharedStoryViewer from './components/SharedStoryViewer.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// Simplified main entry point for personal use
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
  import.meta.env.DEV ? <StrictMode>{appTree}</StrictMode> : appTree
)
