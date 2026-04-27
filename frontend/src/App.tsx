import { FormEvent, useEffect, useState } from 'react'
import { createTask, getTasks } from './api/tasksApi'
import type { Difficulty, Task } from './types/task'

function App() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [difficulty, setDifficulty] = useState<Difficulty>('EASY')
    const [deadlineDate, setDeadlineDate] = useState('')
    const [error, setError] = useState<string | null>(null)

    async function loadTasks() {
        try {
            const loadedTasks = await getTasks()
            setTasks(loadedTasks)
            setError(null)
        } catch {
            setError('Backend is not available')
        }
    }

    useEffect(() => {
        loadTasks()
    }, [])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        if (!title.trim()) {
            setError('Title is required')
            return
        }

        try {
            await createTask({
                title,
                description,
                difficulty,
                deadlineDate: deadlineDate || null,
            })

            setTitle('')
            setDescription('')
            setDifficulty('EASY')
            setDeadlineDate('')
            setError(null)

            await loadTasks()
        } catch {
            setError('Failed to create task')
        }
    }

    return (
        <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'Arial, sans-serif' }}>
            <h1>Life Gamification App</h1>
            <h2>Tasks</h2>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
                <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Task title"
                />

                <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Description"
                />

                <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                </select>

                <input
                    type="date"
                    value={deadlineDate}
                    onChange={(event) => setDeadlineDate(event.target.value)}
                />

                <button type="submit">Create task</button>
            </form>

            <section>
                {tasks.length === 0 ? (
                    <p>No tasks yet.</p>
                ) : (
                    tasks.map((task) => (
                        <article
                            key={task.id}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                padding: 16,
                                marginBottom: 12,
                            }}
                        >
                            <h3>{task.title}</h3>
                            {task.description && <p>{task.description}</p>}
                            <p>Difficulty: {task.difficulty}</p>
                            <p>Status: {task.status}</p>
                            <p>Deadline: {task.deadlineDate ?? 'No deadline'}</p>
                        </article>
                    ))
                )}
            </section>
        </main>
    )
}

export default App