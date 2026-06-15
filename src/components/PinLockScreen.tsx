"use client";

import React, { useState, useEffect } from "react";
import { Lock, Delete, ShieldAlert, KeyRound } from "lucide-react";
import { useAccountSettings } from "@/hooks/useAccountSettings";
import { cn } from "@/lib/utils";

interface PinLockScreenProps {
    onUnlock: () => void;
}

export function PinLockScreen({ onUnlock }: PinLockScreenProps) {
    const { data: accountSettings } = useAccountSettings();
    const [pin, setPin] = useState("");
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    const targetPin = accountSettings?.pinCode || "";

    useEffect(() => {
        // Automatically check when PIN reaches target length
        if (targetPin && pin.length === targetPin.length) {
            if (pin === targetPin) {
                onUnlock();
            } else {
                setError(true);
                setShake(true);
                // Shake animation for 500ms
                const timer = setTimeout(() => {
                    setShake(false);
                    setPin("");
                    setError(false);
                }, 600);
                return () => clearTimeout(timer);
            }
        }
    }, [pin, targetPin, onUnlock]);

    // Handle physical keyboard input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key >= "0" && e.key <= "9") {
                if (targetPin && pin.length < targetPin.length) {
                    setPin(prev => prev + e.key);
                }
            } else if (e.key === "Backspace") {
                setPin(prev => prev.slice(0, -1));
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [pin, targetPin]);

    const handleNumberClick = (num: number) => {
        if (targetPin && pin.length < targetPin.length) {
            setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const pinLength = targetPin ? targetPin.length : 4;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            {/* Background glowing effects */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-md w-full relative z-10 flex flex-col items-center space-y-8">
                {/* Header Lock Icon */}
                <div className={cn(
                    "w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl transition-all duration-300",
                    error ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "text-indigo-400"
                )}>
                    {error ? (
                        <ShieldAlert className="w-10 h-10 animate-bounce" />
                    ) : (
                        <KeyRound className="w-10 h-10 animate-pulse" />
                    )}
                </div>

                {/* Text Description */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-black text-white tracking-tight">Sicherheitsschranke</h1>
                    <p className="text-slate-400 text-sm font-medium max-w-xs mx-auto leading-relaxed">
                        Bitte gib deinen PIN-Code ein, um auf den Tresor zuzugreifen.
                    </p>
                </div>

                {/* PIN Code Dots (Indicators) */}
                <div className={cn(
                    "flex gap-4 items-center justify-center py-2",
                    shake && "animate-shake"
                )}>
                    {Array.from({ length: pinLength }).map((_, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "w-4 h-4 rounded-full border transition-all duration-200",
                                idx < pin.length
                                    ? (error ? "bg-rose-500 border-rose-500 scale-110 shadow-lg shadow-rose-500/50" : "bg-indigo-500 border-indigo-500 scale-110 shadow-lg shadow-indigo-500/50")
                                    : "border-slate-700 bg-transparent"
                            )}
                        />
                    ))}
                </div>

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            className="h-16 w-16 rounded-full bg-white/5 border border-white/5 text-white hover:bg-white/10 hover:border-white/10 active:scale-90 transition-all font-bold text-xl flex items-center justify-center mx-auto"
                        >
                            {num}
                        </button>
                    ))}
                    {/* Empty cell for layout */}
                    <div />
                    <button
                        onClick={() => handleNumberClick(0)}
                        className="h-16 w-16 rounded-full bg-white/5 border border-white/5 text-white hover:bg-white/10 hover:border-white/10 active:scale-90 transition-all font-bold text-xl flex items-center justify-center mx-auto"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        className="h-16 w-16 rounded-full bg-transparent text-slate-400 hover:text-white active:scale-90 transition-all flex items-center justify-center mx-auto"
                    >
                        <Delete className="w-6 h-6" />
                    </button>
                </div>

                {/* Error text if mismatch occurs */}
                {error && (
                    <p className="text-rose-500 text-sm font-bold animate-in fade-in duration-300">
                        Ungültiger PIN-Code
                    </p>
                )}
            </div>
        </div>
    );
}
