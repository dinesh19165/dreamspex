import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ShopProvider } from './context/ShopContext'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ShopProvider>
          <App />
        </ShopProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
