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
  const [maskUrl, setMaskUrl] = useState('')
  const [caseId, setCaseId] = useState('')
  const [volumeDepth, setVolumeDepth] = useState(0)
  const [sliceIndex, setSliceIndex] = useState(0)

  const maxSliceIndex = volumeDepth > 0 ? volumeDepth - 1 : 0
  const sliceOverlayUrl =
    caseId && volumeDepth > 0
      ? `http://127.0.0.1:8000/results/${caseId}/overlay/${sliceIndex}?v=${sliceIndex}`
      : ''

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
    setMaskUrl('')
    setCaseId('')
    setVolumeDepth(0)
    setSliceIndex(0)
  }

  async function handleUpload() {
    if (!selectedFile) {
      return
    }

    setIsUploading(true)
    setUploadError('')
    setPredictionResult(null)
    setOverlayUrl('')
    setMaskUrl('')
    setCaseId('')
    setVolumeDepth(0)
    setSliceIndex(0)

    try {
      // Send the selected NIfTI file to the FastAPI prediction endpoint.
      const result = await uploadPrediction(selectedFile)
      const nextCaseId = getCaseId(selectedFile.name)
      const nextVolumeDepth = result.inference.volume_shape[2] ?? 0
      const nextSliceIndex = result.inference.best_slice_index ?? 0

      setPredictionResult(result)
      setCaseId(nextCaseId)
      setVolumeDepth(nextVolumeDepth)
      setSliceIndex(nextSliceIndex)
      setOverlayUrl(`http://127.0.0.1:8000/results/${nextCaseId}/overlay`)
      setMaskUrl(`http://127.0.0.1:8000/results/${nextCaseId}/mask`)
    } catch {
      setUploadError('Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="app-shell">
      <div className="page-container">
        <header className="app-header">
          <div>
            <h1>Lung Tumor AI Platform</h1>
            <p>AI-assisted CT segmentation research prototype</p>
          </div>
          <span>Not intended for clinical diagnosis.</span>
        </header>

        <section className="card">
          <div className="card-header">
            <h2>Backend Status</h2>
          </div>

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

        <section className="card">
          <div className="card-header">
            <h2>Upload CT Volume</h2>
          </div>

          <label className="file-picker">
            <span>Choose NIfTI file</span>
            <input type="file" onChange={handleFileChange} />
          </label>

          <p className="file-name">
            Selected file: <strong>{selectedFile ? selectedFile.name : 'None'}</strong>
          </p>

          <button
            className="upload-button"
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>

          {isUploading && (
            <p className="status-text">Prediction is running. This may take a moment.</p>
          )}

          {uploadError && <p className="status-text error">{uploadError}</p>}
        </section>

        {predictionResult !== null && (
          <section className="card">
            <div className="card-header">
              <h2>Prediction Results</h2>
            </div>

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
              <div>
                <span>Threshold</span>
                <strong>{predictionResult.inference.threshold}</strong>
              </div>
              <div>
                <span>Volume shape</span>
                <strong>{predictionResult.inference.volume_shape.join(' x ')}</strong>
              </div>
            </div>

            {sliceOverlayUrl && (
              <div className="overlay-preview">
                <div className="slice-control-header">
                  <h3>Overlay Preview</h3>
                  <span>
                    Slice {sliceIndex} / {maxSliceIndex}
                  </span>
                </div>
                <input
                  aria-label="Overlay slice"
                  className="slice-slider"
                  type="range"
                  min={0}
                  max={maxSliceIndex}
                  value={sliceIndex}
                  onChange={(event) => setSliceIndex(Number(event.target.value))}
                />
                <img
                  key={sliceIndex}
                  src={sliceOverlayUrl}
                  alt={`Overlay slice ${sliceIndex}`}
                  className="overlay-image"
                />
              </div>
            )}

            <div className="download-center">
              <a className="download-button" href={overlayUrl} download>
                Download Overlay
              </a>
              <a className="download-button secondary" href={maskUrl} download>
                Download Predicted Mask
              </a>
            </div>

            <details className="raw-response">
              <summary>Show raw API response</summary>
              <pre>{JSON.stringify(predictionResult, null, 2)}</pre>
            </details>
          </section>
        )}
      </div>
    </main>
  )
}

export default App
