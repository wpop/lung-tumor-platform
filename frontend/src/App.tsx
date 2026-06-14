import { type ChangeEvent, useEffect, useState } from 'react'
import './App.css'
import {
  getHealth,
  type HealthResponse,
  type PredictionResponse,
  uploadPrediction,
} from './api/client'

function getCaseId(filename: string) {
  if (filename.endsWith('.nii.gz')) {
    return filename.slice(0, -'.nii.gz'.length)
  }

  return filename.replace(/\.[^/.]+$/, '')
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null)
  const [overlayUrl, setOverlayUrl] = useState('')

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

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setUploadError('')
    setPredictionResult(null)
    setOverlayUrl('')
  }

  async function handleUpload() {
    if (!selectedFile) {
      return
    }

    setIsUploading(true)
    setUploadError('')
    setPredictionResult(null)
    setOverlayUrl('')

    try {
      // Send the selected NIfTI file to the FastAPI prediction endpoint.
      const result = await uploadPrediction(selectedFile)
      const caseId = getCaseId(selectedFile.name)

      setPredictionResult(result)
      setOverlayUrl(`http://127.0.0.1:8000/results/${caseId}/overlay`)
    } catch {
      setUploadError('Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="app-shell">
      <div className="status-panel">
        <h1>Lung Tumor AI Platform</h1>

        <section className="panel-section">
          <h2>Backend Status:</h2>

          {isLoading && <p className="status-text">Loading...</p>}

          {!isLoading && hasError && (
            <p className="status-text error">Backend unavailable.</p>
          )}

          {!isLoading && !hasError && health && (
            <div className="status-details">
              <p>
                Status: {health.status.toLowerCase() === 'ok' ? 'OK' : health.status}
              </p>
              <p>GPU: {health.gpu ? 'Available' : 'Unavailable'}</p>
            </div>
          )}
        </section>

        <section className="panel-section">
          <h2>Prediction Upload:</h2>

          <input type="file" onChange={handleFileChange} />

          {selectedFile && <p className="file-name">{selectedFile.name}</p>}

          <button type="button" onClick={handleUpload} disabled={!selectedFile || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>

          {uploadError && <p className="status-text error">{uploadError}</p>}

          {predictionResult !== null && (
            <>
              <div className="stats-grid">
                <div>
                  <span>Best slice</span>
                  <strong>{predictionResult.inference.best_slice_index}</strong>
                </div>
                <div>
                  <span>Positive voxels</span>
                  <strong>{predictionResult.inference.positive_voxel_count}</strong>
                </div>
                <div>
                  <span>Best probability</span>
                  <strong>
                    {predictionResult.inference.best_probability_max.toFixed(6)}
                  </strong>
                </div>
              </div>

              <pre>{JSON.stringify(predictionResult, null, 2)}</pre>

              {overlayUrl && (
                <div className="overlay-preview">
                  <h2>Prediction Overlay:</h2>
                  <img src={overlayUrl} alt="Prediction overlay for best slice" />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
