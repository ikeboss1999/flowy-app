"use client";

import { useState, useEffect } from 'react';
import { Todo } from '@/types/todo';
import { useAuth } from '@/context/AuthContext';

const STORAGE_KEY = 'flowy_todos';

export function useTodos() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading || !user) {
            if (!authLoading && !user) setIsLoading(false);
            return;
        }

        const loadTodos = async () => {
            try {
                const response = await fetch(`/api/todos?userId=${user.id}`);
                const data = await response.json();

                if (Array.isArray(data) && data.length > 0) {
                    setTodos(data);
                } else {
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) {
                        try {
                            const local: Todo[] = JSON.parse(saved).filter((t: any) => t.userId === user.id);
                            for (const item of local) {
                                await fetch('/api/todos', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ userId: user.id, todo: item })
                                });
                            }
                            setTodos(local);
                        } catch (e) { console.error(e); }
                    }
                }
            } catch (e) { console.error(e); }
            setIsLoading(false);
        };
        loadTodos();
    }, [user, authLoading]);

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
        try {
            await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, todo: newTodo })
            });
            setTodos(prev => [newTodo, ...prev]);
        } catch (e) { console.error(e); }
    };

    const toggleTodo = async (id: string) => {
        if (!user) return;
        const todo = todos.find(t => t.id === id);
        if (!todo) return;
        const updated = { ...todo, completed: !todo.completed };
        try {
            await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, todo: updated })
            });
            setTodos(prev => prev.map(t => t.id === id ? updated : t));
        } catch (e) { console.error(e); }
    };

    const deleteTodo = async (id: string) => {
        if (!user) return;
        try {
            await fetch(`/api/todos/${id}`, { method: 'DELETE' });
            setTodos(prev => prev.filter(t => t.id !== id));
        } catch (e) { console.error(e); }
    };

    return { todos, addTodo, toggleTodo, deleteTodo, isLoading: isLoading || authLoading };
}
