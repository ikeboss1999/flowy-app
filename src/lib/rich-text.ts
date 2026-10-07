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
            // ContentEditable represents one empty line as <div><br></div> (or <p><br></p>).
            // Normalize the whole block first, otherwise <br> and </div> would create two gaps.
            .replace(/<(div|p)[^>]*>\s*<br\s*\/?\s*>\s*<\/\1>/gi, "\n")
            .replace(/<li[^>]*>/gi, "• ")
            .replace(/<\/(li|p|div)>/gi, "\n")
            .replace(/<br\s*\/?>/gi, "\n")
        : source.replace(/\n/g, "\n");
    // Do not collapse consecutive line breaks: an empty line is intentional formatting
    // and must be kept in the generated offer/invoice PDF.
    return html.split("\n").map((line) => {
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
        // React-PDF does not reserve height for an entirely empty Text node.
        // A non-breaking space keeps the requested blank line visible in the PDF.
        return segments.length ? segments : [{ text: "\u00A0" }];
    });
}
