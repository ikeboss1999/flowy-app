"use client";

import React, { useState, useEffect } from 'react';
import { 
    CheckSquare, 
    X, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    ClipboardList,
    AlertCircle,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTodos } from '@/hooks/useTodos';

export function GlobalTodoWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { todos, addTodo, toggleTodo, deleteTodo } = useTodos();
    const [newTask, setNewTask] = useState("");
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

    const openTodos = todos.filter(t => !t.completed).length;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        addTodo(newTask, priority);
        setNewTask("");
        setPriority('medium');
    };

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-8 right-8 z-[100] h-16 w-16 rounded-full shadow-2xl transition-all duration-500 flex items-center justify-center group overflow-hidden",
                    isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
                )}
            >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 group-hover:scale-110 transition-transform duration-500" />
                
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-orange-400 blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />

                <div className="relative flex items-center justify-center">
                    <ClipboardList className="h-7 w-7 text-white group-hover:rotate-12 transition-transform" />
                    {openTodos > 0 && (
                        <div className="absolute -top-1 -right-1 h-5 w-5 bg-white text-orange-600 text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                            {openTodos}
                        </div>
                    )}
                </div>
            </button>

            {/* Overlay */}
            <div 
                className={cn(
                    "fixed inset-0 bg-white/30 z-[110] transition-opacity duration-500",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => setIsOpen(false)}
            />

            {/* Side Panel */}
            <div 
                className={cn(
                    "fixed top-4 bottom-4 right-4 w-full max-w-md bg-white/95 backdrop-blur-xl z-[120] rounded-[32px] shadow-2xl border border-white/20 transition-all duration-500 ease-out flex flex-col overflow-hidden",
                    isOpen ? "translate-x-0" : "translate-x-[110%]"
                )}
            >
                {/* Header */}
                <div className="p-8 bg-gradient-to-br from-orange-50/50 to-white border-b border-orange-100/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 blur-3xl rounded-full -mr-16 -mt-16" />
                    
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
                                <CheckSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Deine Aufgaben</h3>
                                <p className="text-xs font-bold text-orange-600/70 uppercase tracking-widest">
                                    {openTodos} offene To-Dos
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-6 border-b border-slate-50">
                    <form onSubmit={handleAdd} className="space-y-3">
                        <div className="relative">
                            <input 
                                type="text"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                placeholder="Was steht an?"
                                className="w-full pl-5 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-base font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:bg-white transition-all placeholder:text-slate-400"
                            />
                            <button 
                                type="submit"
                                className="absolute right-2 top-2 h-10 w-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-200 hover:scale-[1.05] active:scale-95 transition-all"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {(['low', 'medium', 'high'] as const).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                                        priority === p 
                                            ? (p === 'high' ? "bg-rose-50 text-rose-600 border-rose-100" : 
                                               p === 'medium' ? "bg-orange-50 text-orange-600 border-orange-100" : 
                                               "bg-slate-50 text-slate-600 border-slate-100")
                                            : "bg-white text-slate-400 border-slate-50 hover:bg-slate-50"
                                    )}
                                >
                                    {p === 'high' ? 'Dringend' : p === 'medium' ? 'Normal' : 'Nebenbei'}
                                </button>
                            ))}
                        </div>
                    </form>
                </div>

                {/* List Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {todos.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-40">
                            <ClipboardList className="h-12 w-12 text-slate-300 mb-4" />
                            <p className="text-slate-500 font-bold">Alles erledigt!</p>
                            <p className="text-xs text-slate-400 mt-1">Lehn dich zurück oder füge eine neue Aufgabe hinzu.</p>
                        </div>
                    ) : (
                        todos.map((todo) => (
                            <div 
                                key={todo.id}
                                className={cn(
                                    "flex items-start gap-4 p-4 rounded-2xl border transition-all group relative overflow-hidden",
                                    todo.completed 
                                        ? "bg-slate-50 border-transparent opacity-60" 
                                        : "bg-white border-slate-100 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-500/5"
                                )}
                            >
                                <button 
                                    onClick={() => toggleTodo(todo.id)}
                                    className={cn(
                                        "mt-0.5 h-6 w-6 rounded-lg flex items-center justify-center transition-all",
                                        todo.completed ? "bg-orange-500 text-white" : "border-2 border-slate-200 text-transparent hover:border-orange-400"
                                    )}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                </button>
                                
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleTodo(todo.id)}>
                                    <p className={cn(
                                        "font-bold text-sm leading-tight transition-all",
                                        todo.completed ? "text-slate-400 line-through" : "text-slate-800"
                                    )}>
                                        {todo.task}
                                    </p>
                                    {!todo.completed && (
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-[0.1em] mt-1 block",
                                            todo.priority === 'high' ? "text-rose-500" :
                                            todo.priority === 'medium' ? "text-orange-500" : "text-slate-400"
                                        )}>
                                            {todo.priority === 'high' ? 'Dringend' : todo.priority === 'medium' ? 'Wichtig' : 'Routine'}
                                        </span>
                                    )}
                                </div>

                                <button 
                                    onClick={() => deleteTodo(todo.id)}
                                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100">
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                    >
                        Schließen <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </>
    );
}
