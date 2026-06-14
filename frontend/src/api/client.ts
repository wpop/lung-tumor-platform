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

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch('http://127.0.0.1:8000/health')

  if (!response.ok) {
    throw new Error('Failed to fetch backend health.')
  }

  return response.json()
}

export async function uploadPrediction(file: File): Promise<PredictionResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('http://127.0.0.1:8000/predict', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload prediction file.')
  }

  return response.json()
}
