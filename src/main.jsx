import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminPanel from './components/AdminPanel.jsx'

// Bardzo prosty router sprawdzający pasek adresu URL
const path = window.location.pathname;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {path === '/admin' ? <AdminPanel /> : <App />}
  </StrictMode>,
)