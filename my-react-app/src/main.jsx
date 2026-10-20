import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MiPrimerComponente from './MiPrimerComponente.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MiPrimerComponente />
  </StrictMode>,
)
