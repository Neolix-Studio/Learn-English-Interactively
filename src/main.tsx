import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './assets/css/tokens.css'
import './assets/css/main.css'
import './assets/css/landing.css'
import './assets/css/animations.css'
import './assets/css/root-fix.css'
import './i18n'
import { ErrorBoundary } from './components/ErrorBoundary'
import { RecoveryHomeLink, RecoveryScreen } from './components/RecoveryScreen'
import App from './App.tsx'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

// The last resort, outside the router and the providers: RouteBoundary (App.tsx) catches route errors first.
const rootFallback = (error: Error) => (
  <RecoveryScreen
    error={error}
    onRetry={() => window.location.reload()}
    exit={<RecoveryHomeLink />}
  />
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={rootFallback}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
