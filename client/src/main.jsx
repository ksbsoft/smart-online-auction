import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', background: '#333', color: '#fff' }
        }} />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
)
