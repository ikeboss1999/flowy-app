"use client";

import { useEffect } from "react";

export function DisableZoom() {
    useEffect(() => {
        const handleGestureStart = (e: Event) => {
            e.preventDefault();
        };

        document.addEventListener("gesturestart", handleGestureStart);

        return () => {
            document.removeEventListener("gesturestart", handleGestureStart);
        };
    }, []);

    return null;
}
