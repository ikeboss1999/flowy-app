"use client";

import { useState, useEffect } from 'react';

export function useDevice() {
    const [isIPhone, setIsIPhone] = useState(false);
    const [isIPad, setIsIPad] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const checkDevice = () => {
            const ua = window.navigator.userAgent.toLowerCase();

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
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);

        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return { isIPhone, isIPad, isTouchDevice, isMobile, isDesktop };
}
