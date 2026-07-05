"use client";

import { useState, useEffect } from 'react';

export function useDevice() {
    const [isIPhone, setIsIPhone] = useState(false);
    const [isIPad, setIsIPad] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [viewportWidth, setViewportWidth] = useState(0);
    useEffect(() => {
        const checkDevice = () => {
            const ua = window.navigator.userAgent.toLowerCase();
            const width = window.innerWidth;

            // iPhone Detection
            const isIPhoneCheck = /iphone/.test(ua);

            // iPad Detection (iPadOS 13+ often reports as Macintosh but has maxTouchPoints > 1)
            const isIPadCheck =
                /ipad/.test(ua) ||
                (ua.includes("macintosh") && navigator.maxTouchPoints > 1);

            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isMobileCheck = isIPhoneCheck || /android|iemobile|wpdesktop/.test(ua);

            setIsIPhone(isIPhoneCheck);
            setIsIPad(isIPadCheck);
            setIsTouchDevice(isTouch);
            setIsMobile(isMobileCheck);
            setIsDesktop(!isMobileCheck && !isIPadCheck);
            setViewportWidth(width);
        };

        let debounceTimer: ReturnType<typeof setTimeout>;
        const debouncedCheck = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(checkDevice, 150);
        };

        checkDevice();
        window.addEventListener('resize', debouncedCheck);

        return () => {
            window.removeEventListener('resize', debouncedCheck);
            clearTimeout(debounceTimer);
        };
    }, []);

    const isCompactLayout = viewportWidth > 0 && viewportWidth < 1180;
    const isDrawerLayout = isMobile || isIPad || isCompactLayout;

    return { isIPhone, isIPad, isTouchDevice, isMobile, isDesktop, viewportWidth, isCompactLayout, isDrawerLayout };
}
