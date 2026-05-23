import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { isExtensionError } from './utils/isExtensionError'

// 🆕 Global error handler
window.addEventListener('error', (event) => {
  if (isExtensionError(event.filename, event.error?.stack, event.error?.message || event.message)) {
    event.preventDefault()
    return
  }

  console.error('🚨 Global error caught:', event.error);
  console.error('Stack:', event.error?.stack);
});

window.addEventListener('unhandledrejection', (event) => {
  const stack = typeof event.reason === 'object' && event.reason !== null && 'stack' in event.reason
    ? String((event.reason as { stack?: unknown }).stack || '')
    : ''
  const message = typeof event.reason === 'object' && event.reason !== null && 'message' in event.reason
    ? String((event.reason as { message?: unknown }).message || '')
    : String(event.reason || '')

  if (isExtensionError(undefined, stack, message)) {
    event.preventDefault()
    return
  }

  console.error('🚨 Unhandled promise rejection:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
