export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type TaskStatus = 'TODO' | 'DONE'

export type Task = {
    id: number
    title: string
    description: string | null
    difficulty: Difficulty
    status: TaskStatus
    deadlineDate: string | null
    createdAt: string
    updatedAt: string
}

export type CreateTaskRequest = {
    title: string
    description: string
    difficulty: Difficulty
    deadlineDate: string | null
}