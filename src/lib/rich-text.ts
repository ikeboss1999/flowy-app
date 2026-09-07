export interface RichTextSegment {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

export function richTextLines(value: string): RichTextSegment[][] {
    const source = String(value || "");
    const html = /<\/?(strong|b|em|i|u|ul|ol|li|p|div|br)\b/i.test(source)
        ? source
            .replace(/<li[^>]*>/gi, "• ")
            .replace(/<\/(li|p|div)>/gi, "\n")
            .replace(/<br\s*\/?>/gi, "\n")
        : source.replace(/\n/g, "\n");
    return html.split(/\n+/).map((line) => {
        const segments: RichTextSegment[] = [];
        const pattern = /<(strong|b|em|i|u)>|<\/(strong|b|em|i|u)>/gi;
        let bold = false;
        let italic = false;
        let underline = false;
        let cursor = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(line))) {
            const text = line.slice(cursor, match.index).replace(/<[^>]+>/g, "");
            if (text) segments.push({ text, bold, italic, underline });
            const tag = (match[1] || match[2]).toLowerCase();
            const closing = Boolean(match[2]);
            if (tag === "strong" || tag === "b") bold = !closing;
            if (tag === "em" || tag === "i") italic = !closing;
            if (tag === "u") underline = !closing;
            cursor = match.index + match[0].length;
        }
        const tail = line.slice(cursor).replace(/<[^>]+>/g, "");
        if (tail) segments.push({ text: tail, bold, italic, underline });
        return segments.length ? segments : [{ text: "" }];
    });
}
