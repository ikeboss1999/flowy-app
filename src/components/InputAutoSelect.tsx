"use client";

import { useEffect } from "react";

/**
 * Global helper to automatically select the content of numeric input fields 
 * when they receive focus. This improves UX by allowing users to overwrite 
 * values (like "0") immediately.
 */
export function InputAutoSelect() {
    useEffect(() => {
        const handleFocus = (e: FocusEvent) => {
            const target = e.target as HTMLInputElement;
            
            // Check if it's an input field
            if (target && target.tagName === 'INPUT') {
                // Determine if it's a numeric field based on several markers
                const isNumeric = 
                    target.type === 'number' || 
                    target.hasAttribute('step') ||
                    target.placeholder === '0' ||
                    target.placeholder === '0.00' ||
                    target.placeholder === '0,00' ||
                    target.classList.contains('font-mono') ||
                    // Also check for specific names used in the app
                    ['price', 'amount', 'budget', 'salary', 'overtime', 'hours'].includes(target.name || '');

                if (isNumeric) {
                    // Use a short delay to ensure browser default caret placement 
                    // is finished before we perform the selection.
                    setTimeout(() => {
                        if (document.activeElement === target) {
                            try {
                                target.select();
                            } catch (err) {
                                // Fallback for browsers that might restrict selection on some input types
                                if (target.setSelectionRange) {
                                    target.setSelectionRange(0, target.value.length);
                                }
                            }
                        }
                    }, 50);
                }
            }
        };

        // We use capture phase (true) to catch events bubbling up from shadowed components if any
        window.addEventListener('focus', handleFocus, true);
        return () => window.removeEventListener('focus', handleFocus, true);
    }, []);

    return null;
}
