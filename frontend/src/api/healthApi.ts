export type HealthResponse = {
    status: string
}

export async function getHealth(): Promise<HealthResponse> {
    const response = await fetch('/api/health')

    if (!response.ok) {
        throw new Error('Backend is not available')
    }

    return response.json()
}