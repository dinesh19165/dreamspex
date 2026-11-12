import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ShopProvider } from './context/ShopContext'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { FranchiseLocationProvider } from './context/FranchiseLocationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <FranchiseLocationProvider>
          <ShopProvider>
            <App />
          </ShopProvider>
        </FranchiseLocationProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
