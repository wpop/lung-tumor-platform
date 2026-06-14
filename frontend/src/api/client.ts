export type HealthResponse = {
  status: string
  gpu: boolean
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch('http://127.0.0.1:8000/health')

  if (!response.ok) {
    throw new Error('Failed to fetch backend health.')
  }

  return response.json()
}
