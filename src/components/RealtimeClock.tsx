"use client";

import { useEffect, useState } from "react";

export function RealtimeClock() {
    // Avoid hydration mismatch by waiting for mount
    const [mounted, setMounted] = useState(false);
    const [time, setTime] = useState<string>("");

    useEffect(() => {
        setMounted(true);
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!mounted) {
        // Render a static placeholder (or the server-generated time if passed as prop, 
        // but simple placeholder is fine for now to avoid jump)
        // Using a similar width placeholder or empty
        return <span>--:--:--</span>;
    }

    return <span>{time}</span>;
}
