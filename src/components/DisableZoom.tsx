"use client";

import { useEffect } from "react";

export function DisableZoom() {
    useEffect(() => {
        const handleGestureStart = (e: Event) => {
            e.preventDefault();
        };

        const handleTouchMove = (e: TouchEvent) => {
            // Prevent pinch-zoom (2+ fingers)
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        document.addEventListener("gesturestart", handleGestureStart);
        // document.addEventListener("touchmove", handleTouchMove, { passive: false }); 
        // Commented out touchmove as it might break scrolling if not careful, 
        // gesturestart is usually enough for pinch-zoom prevention on iOS.

        return () => {
            document.removeEventListener("gesturestart", handleGestureStart);
            // document.removeEventListener("touchmove", handleTouchMove);
        };
    }, []);

    return null;
}
