"use client";

import { useEffect } from 'react';

const SESSION_KEY = 'flowy_admin_session_id';

export function AdminSessionHeartbeat() {
    useEffect(() => {
        let sessionId = sessionStorage.getItem(SESSION_KEY);
        if (!sessionId) {
            sessionId = crypto.randomUUID();
            sessionStorage.setItem(SESSION_KEY, sessionId);
        }

        const ping = () => {
            if (document.visibilityState !== 'visible') return;
            fetch('/api/auth/activity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, appSource: 'web' }),
                keepalive: true,
            }).catch(() => undefined);
        };

        ping();
        const interval = window.setInterval(ping, 60_000);
        document.addEventListener('visibilitychange', ping);
        return () => {
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', ping);
        };
    }, []);

    return null;
}
