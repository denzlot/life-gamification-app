import type { CreateTaskRequest, Task } from '../types/task'

export async function getTasks(): Promise<Task[]> {
    const response = await fetch('/api/tasks')

    if (!response.ok) {
        throw new Error('Failed to load tasks')
    }

    return response.json()
}

export async function createTask(request: CreateTaskRequest): Promise<Task> {
    const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    })

    if (!response.ok) {
        throw new Error('Failed to create task')
    }

    return response.json()
}