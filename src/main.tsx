import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppBootstrap from './components/AppBootstrap'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppBootstrap />
  </StrictMode>,
)
