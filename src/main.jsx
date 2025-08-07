import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import SharedStoryViewer from './components/SharedStoryViewer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/shared/:shareId" element={<SharedStoryViewer />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
