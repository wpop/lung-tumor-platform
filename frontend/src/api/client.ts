export type HealthResponse = {
  status: string
  gpu: boolean
}

export type PredictionInference = {
  volume_shape: number[]
  mask_path: string
  overlay_path?: string
  threshold: number
  positive_voxel_count: number
  best_slice_index: number
  best_probability_max: number
}

export type PredictionResponse = {
  message: string
  filename: string
  saved_to: string
  inference: PredictionInference
}

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/$/, '')

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`)

  if (!response.ok) {
    throw new Error('Failed to fetch backend health.')
  }

  return response.json()
}

export async function uploadPrediction(file: File): Promise<PredictionResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload prediction file.')
  }

  return response.json()
}
