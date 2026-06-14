import { useEffect, useState } from 'react'
import './App.css'
import { getHealth, type HealthResponse } from './api/client'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let isMounted = true

    // Check backend health once when the app first loads.
    getHealth()
      .then((data) => {
        if (!isMounted) {
          return
        }

        setHealth(data)
        setHasError(false)
      })
      .catch(() => {
        if (!isMounted) {
          return
        }

        setHasError(true)
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <main className="app-shell">
      <div className="status-panel">
        <h1>Lung Tumor AI Platform</h1>
        <h2>Backend Status:</h2>

        {isLoading && <p className="status-text">Loading...</p>}

        {!isLoading && hasError && (
          <p className="status-text error">Backend unavailable.</p>
        )}

        {!isLoading && !hasError && health && (
          <div className="status-details">
            <p>Status: {health.status.toLowerCase() === 'ok' ? 'OK' : health.status}</p>
            <p>GPU: {health.gpu ? 'Available' : 'Unavailable'}</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default App
