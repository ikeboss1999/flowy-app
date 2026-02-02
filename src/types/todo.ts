export type TodoPriority = 'low' | 'medium' | 'high';

export interface Todo {
    id: string;
    userId: string;
    task: string;
    completed: boolean;
    priority: TodoPriority;
    dueDate?: string;
    createdAt: string;
}
