"use client";

import useSWR from 'swr';
import { Todo } from '@/types/todo';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { fetcher } from '@/lib/fetcher';

export function useTodos() {
    const { user } = useAuth();
    const { markDirty } = useSync();

    const key = user ? `/api/todos?userId=${user.id}` : null;
    const { data = [], isLoading, mutate } = useSWR<Todo[]>(key, fetcher);

    const addTodo = async (task: string, priority: Todo['priority'] = 'medium') => {
        if (!user) return;
        const newTodo: Todo = {
            id: Math.random().toString(36).substr(2, 9),
            userId: user.id,
            task,
            completed: false,
            priority,
            createdAt: new Date().toISOString()
        };
        mutate([newTodo, ...data], false);
        try {
            await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, todo: newTodo })
            });
            markDirty();
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const toggleTodo = async (id: string) => {
        if (!user) return;
        const todo = data.find(t => t.id === id);
        if (!todo) return;
        const updated = { ...todo, completed: !todo.completed };
        mutate(data.map(t => t.id === id ? updated : t), false);
        try {
            await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, todo: updated })
            });
            markDirty();
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    const deleteTodo = async (id: string) => {
        if (!user) return;
        mutate(data.filter(t => t.id !== id), false);
        try {
            await fetch(`/api/todos/${id}`, { method: 'DELETE' });
            markDirty();
        } catch (e) {
            console.error(e);
            mutate();
        }
    };

    return { todos: data, addTodo, toggleTodo, deleteTodo, isLoading };
}
