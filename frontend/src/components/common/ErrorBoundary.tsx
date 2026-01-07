// src/components/common/ErrorBoundary.tsx
// React Error Boundary dla debugowania na mobile

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 React Error Boundary caught:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Wyślij error do localStorage dla późniejszej analizy
    try {
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      localStorage.setItem('lastError', JSON.stringify(errorLog));
    } catch (e) {
      console.error('Failed to save error to localStorage:', e);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          backgroundColor: '#1a1a1a',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '13px',
          overflowY: 'auto',
          height: '100vh',
          maxWidth: '100vw'
        }}>
          <h2 style={{ color: '#ff6b35', marginBottom: '20px' }}>
            ⚠️ Błąd aplikacji
          </h2>
          
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            overflowX: 'auto'
          }}>
            <strong style={{ color: '#4fc3f7' }}>Error:</strong>
            <pre style={{ 
              color: '#f44336', 
              margin: '10px 0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {this.state.error?.toString()}
            </pre>
          </div>

          {this.state.error?.stack && (
            <div style={{
              backgroundColor: '#2a2a2a',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              overflowX: 'auto',
              fontSize: '11px'
            }}>
              <strong style={{ color: '#4fc3f7' }}>Stack Trace:</strong>
              <pre style={{ 
                color: '#aaa',
                margin: '10px 0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error.stack}
              </pre>
            </div>
          )}

          {this.state.errorInfo && (
            <div style={{
              backgroundColor: '#2a2a2a',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              overflowX: 'auto',
              fontSize: '11px'
            }}>
              <strong style={{ color: '#4fc3f7' }}>Component Stack:</strong>
              <pre style={{ 
                color: '#aaa',
                margin: '10px 0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginTop: '20px'
          }}>
            <button 
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🔄 Odśwież stronę
            </button>
            
            <button 
              onClick={this.handleClearCache}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🗑️ Wyczyść cache i odśwież
            </button>
            
            <button 
              onClick={() => window.location.href = '/login'}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🏠 Wróć do logowania
            </button>
          </div>

          <div style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#2a2a2a',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#aaa'
          }}>
            <strong style={{ color: '#4fc3f7' }}>Debug Info:</strong>
            <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <li>User Agent: {navigator.userAgent}</li>
              <li>URL: {window.location.href}</li>
              <li>Timestamp: {new Date().toISOString()}</li>
              <li>Screen: {window.screen.width}x{window.screen.height}</li>
              <li>Viewport: {window.innerWidth}x{window.innerHeight}</li>
            </ul>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
