export function plainTextToHtml(text = '') {
    return text
        .split(/\r?\n/)
        .map((line) => line.trim() ? escapeHtml(line) : '<br>')
        .join('<br>');
}

export function htmlToPlainText(html = '') {
    return html
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export function sanitizeEmailHtml(html = '') {
    return html
        .replace(/<\s*(script|style|iframe|object|embed|form|input|button|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
        .replace(/<\s*(script|style|iframe|object|embed|form|input|button|meta|link)[^>]*\/?\s*>/gi, '')
        .replace(/\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
        .replace(/\s+(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, '')
        .replace(/\s+style\s*=\s*(['"])(?:(?!expression|javascript:)[\s\S])*?\1/gi, (match) => match);
}

export function buildDocumentEmailHtml(message: string, signatureHtml?: string) {
    const bodyHtml = plainTextToHtml(message);
    const safeSignature = sanitizeEmailHtml(signatureHtml || '');
    return [
        `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#111827;">${bodyHtml}</div>`,
        safeSignature ? `<div style="margin-top:24px;">${safeSignature}</div>` : '',
    ].filter(Boolean).join('');
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
