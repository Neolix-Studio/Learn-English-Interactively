import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './assets/css/main.css'
import './assets/css/landing.css'
import './assets/css/animations.css'
import './assets/css/root-fix.css'
import './i18n'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.tsx'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
