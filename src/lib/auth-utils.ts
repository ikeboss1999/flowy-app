/**
 * Shared authentication utilities that can be used on both client and server.
 * This file MUST NOT import any server-only libraries or checks.
 */

export const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit number
};

export const getAuthErrorMessage = (error: any): string => {
    if (!error) return "Ein unbekannter Fehler ist aufgetreten.";

    const message = error.message?.toLowerCase() || "";

    if (message.includes("invalid login credentials")) {
        return "Ungültige E-Mail-Adresse oder Passwort.";
    }

    if (message.includes("email not confirmed")) {
        return "Bitte bestätige zuerst deine E-Mail-Adresse.";
    }

    if (message.includes("user already registered") || message.includes("user_already_exists")) {
        return "Diese E-Mail-Adresse ist bereits registriert.";
    }

    if (message.includes("password should be at least")) {
        return "Das Passwort muss mindestens 6 Zeichen lang sein.";
    }

    if (message.includes("invalid format") || message.includes("valid email")) {
        return "Bitte gib eine gültige E-Mail-Adresse ein.";
    }

    if (message.includes("too many requests")) {
        return "Zu viele Versuche. Bitte warte einen Moment.";
    }

    if (message.includes("network error") || message.includes("failed to fetch")) {
        return "Netzwerkfehler. Bitte überprüfe deine Verbindung.";
    }

    // Default fallback
    console.warn("[Auth] Unhandled error message:", message);
    return "Fehler bei der Anmeldung. Bitte versuche es später erneut.";
};
