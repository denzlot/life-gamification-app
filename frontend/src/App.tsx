import { useEffect, useState } from 'react'
import { getHealth } from './api/healthApi'

function App() {
  const [backendStatus, setBackendStatus] = useState<string>('checking...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHealth()
        .then((data) => {
          setBackendStatus(data.status)
        })
        .catch(() => {
          setError('Backend is not available')
        })
  }, [])

  return (
      <main>
        <h1>Life Gamification App</h1>

        {error ? (
            <p>{error}</p>
        ) : (
            <p>Backend status: {backendStatus}</p>
        )}
      </main>
  )
}

export default App