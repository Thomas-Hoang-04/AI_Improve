export type TaskStatus = 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'
export type Effort = 'S' | 'M' | 'L'

export interface Task {
    id: string
    title: string
    description: string
    status: TaskStatus
    importance: boolean
    urgency: boolean
    aiSuggestedImportance: boolean
    aiSuggestedUrgency: boolean
    aiExplanation: string
    effort: Effort | null
    dueDate: string | null
    tags: string[]
    createdAt: string
    updatedAt: string
}

export interface CreateTaskInput {
    title: string
    description?: string
    effort?: Effort
    dueDate?: string
    tags?: string[]
}

export interface AIClassification {
    importance: boolean
    urgency: boolean
    explanation: string
}

export interface CSVTask {
    title: string
    description?: string
    dueDate?: string
    effort?: Effort
    tags?: string
}
