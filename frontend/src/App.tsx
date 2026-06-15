import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useState,
} from 'react'
import './App.css'
import {
  API_BASE_URL,
  getHealth,
  type HealthResponse,
  type PredictionResponse,
  uploadPrediction,
} from './api/client'
import VTKViewer from './components/VTKViewer'

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
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(null)
  const [overlayUrl, setOverlayUrl] = useState('')
  const [maskUrl, setMaskUrl] = useState('')
  const [caseId, setCaseId] = useState('')
  const [volumeDepth, setVolumeDepth] = useState(0)
  const [sliceIndex, setSliceIndex] = useState(0)
  const [overlayOpacity, setOverlayOpacity] = useState(0.75)

  const maxSliceIndex = volumeDepth > 0 ? volumeDepth - 1 : 0
  const overlayOpacityPercent = Math.round(overlayOpacity * 100)
  const ctSliceUrl =
    caseId && volumeDepth > 0
      ? `${API_BASE_URL}/results/${caseId}/ct/${sliceIndex}?v=${sliceIndex}`
      : ''
  const sliceOverlayUrl =
    caseId && volumeDepth > 0
      ? `${API_BASE_URL}/results/${caseId}/overlay/${sliceIndex}?v=${sliceIndex}`
      : ''
  const volumeSize = predictionResult
    ? predictionResult.inference.volume_shape.join(' × ')
    : ''
  const bestProbabilityPercent = predictionResult
    ? `${(predictionResult.inference.best_probability_max * 100).toFixed(2)}%`
    : ''
  const inferenceDevice = health?.gpu ? 'CUDA' : 'CPU'

  function goToPreviousSlice() {
    setSliceIndex((currentSliceIndex) => Math.max(0, currentSliceIndex - 1))
  }

  function goToNextSlice() {
    setSliceIndex((currentSliceIndex) =>
      Math.min(maxSliceIndex, currentSliceIndex + 1),
    )
  }

  function isNiftiGzipFile(file: File) {
    return file.name.toLowerCase().endsWith('.nii.gz')
  }

  function resetPredictionState() {
    setPredictionResult(null)
    setOverlayUrl('')
    setMaskUrl('')
    setCaseId('')
    setVolumeDepth(0)
    setSliceIndex(0)
  }

  function selectUploadFile(file: File | null) {
    setSelectedFile(file)
    setUploadError('')
    resetPredictionState()
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDraggingFile(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }

    setIsDraggingFile(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDraggingFile(false)

    const file = event.dataTransfer.files[0] ?? null
    if (!file) {
      return
    }

    if (!isNiftiGzipFile(file)) {
      setUploadError('Please drop a .nii.gz CT volume file.')
      return
    }

    selectUploadFile(file)
  }

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
    selectUploadFile(file)
  }

  async function handleUpload() {
    if (!selectedFile) {
      return
    }

    setIsUploading(true)
    setUploadError('')
    resetPredictionState()

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
      setOverlayUrl(`${API_BASE_URL}/results/${nextCaseId}/overlay`)
      setMaskUrl(`${API_BASE_URL}/results/${nextCaseId}/mask`)
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

          <div
            className={`drop-zone${isDraggingFile ? ' active' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <strong>Drop .nii.gz file here</strong>
            <span>or choose a file below</span>
          </div>

          <label className="file-picker">
            <span>Choose NIfTI file</span>
            <input type="file" accept=".nii.gz" onChange={handleFileChange} />
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
          <>
            <section className="card">
              <div className="card-header">
                <h2>Case Information</h2>
              </div>

              <div className="case-info-grid">
                <div>
                  <span>Filename</span>
                  <strong>{predictionResult.filename}</strong>
                </div>
                <div>
                  <span>Volume size</span>
                  <strong>{volumeSize}</strong>
                </div>
                <div>
                  <span>Best slice</span>
                  <strong>{predictionResult.inference.best_slice_index}</strong>
                </div>
                <div>
                  <span>Positive voxels</span>
                  <strong>{predictionResult.inference.positive_voxel_count}</strong>
                </div>
                <div>
                  <span>Threshold</span>
                  <strong>{predictionResult.inference.threshold}</strong>
                </div>
                <div>
                  <span>Best probability</span>
                  <strong>{bestProbabilityPercent}</strong>
                </div>
                <div>
                  <span>Model name</span>
                  <strong>UNet2D</strong>
                </div>
                <div>
                  <span>Inference device</span>
                  <strong>{inferenceDevice}</strong>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-header">
                <h2>Prediction Results</h2>
              </div>

              {ctSliceUrl && sliceOverlayUrl && (
                <div className="overlay-preview">
                  <div className="slice-control-header">
                    <h3>Slice Viewer</h3>
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
                  <div className="slice-button-row">
                    <button
                      className="slice-button"
                      type="button"
                      onClick={goToPreviousSlice}
                      disabled={sliceIndex === 0}
                    >
                      Previous slice
                    </button>
                    <button
                      className="slice-button"
                      type="button"
                      onClick={goToNextSlice}
                      disabled={sliceIndex === maxSliceIndex}
                    >
                      Next slice
                    </button>
                  </div>
                  <label className="opacity-control">
                    <span>Overlay opacity: {overlayOpacityPercent}%</span>
                    <input
                      aria-label="Overlay opacity"
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={overlayOpacity}
                      onChange={(event) =>
                        setOverlayOpacity(Number(event.target.value))
                      }
                    />
                  </label>
                  <div className="medical-viewer-grid">
                    <figure className="medical-viewer-panel">
                      <figcaption>Original CT</figcaption>
                      <img
                        key={`ct-${sliceIndex}`}
                        src={ctSliceUrl}
                        alt={`Original CT slice ${sliceIndex}`}
                        className="viewer-image"
                      />
                    </figure>
                    <figure className="medical-viewer-panel">
                      <figcaption>Prediction Overlay</figcaption>
                      <img
                        key={`overlay-${sliceIndex}`}
                        src={sliceOverlayUrl}
                        alt={`Prediction overlay slice ${sliceIndex}`}
                        className="viewer-image"
                        style={{ opacity: overlayOpacity }}
                      />
                    </figure>
                  </div>

                  <section
                    className="vtk-viewer-section"
                    aria-labelledby="vtk-viewer-heading"
                  >
                    <h3 id="vtk-viewer-heading">VTK.js Viewer</h3>
                    <VTKViewer caseId={caseId} sliceIndex={sliceIndex} />
                  </section>
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
          </>
        )}
      </div>
    </main>
  )
}

export default App
