"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bold, Italic, List, Pilcrow, Underline } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

function toEditorHtml(value: string) {
    if (!value) return "";
    if (/<\/?(strong|b|em|i|u|ul|ol|li|p|div|br)\b/i.test(value)) return value;
    return value.replace(/\n/g, "<br />");
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [showParagraphMarkers, setShowParagraphMarkers] = useState(false);
    const [paragraphMarkers, setParagraphMarkers] = useState<Array<{ left: number; top: number }>>([]);

    const refreshParagraphMarkers = useCallback(() => {
        const editor = editorRef.current;
        if (!editor || !showParagraphMarkers) {
            setParagraphMarkers([]);
            return;
        }

        const editorRect = editor.getBoundingClientRect();
        const nextMarkers: Array<{ left: number; top: number }> = [];
        const addMarkerAtEnd = (node: Node) => {
            const range = document.createRange();
            if (node.nodeType === Node.TEXT_NODE) {
                range.setStart(node, node.textContent?.length || 0);
                range.collapse(true);
            } else {
                range.selectNodeContents(node);
                range.collapse(false);
            }
            const rects = range.getClientRects();
            const rect = rects[rects.length - 1] || range.getBoundingClientRect();
            if (!rect || (!rect.width && !rect.height)) return;
            nextMarkers.push({
                left: Math.min(editor.clientWidth - 12, Math.max(0, rect.left - editorRect.left + 2)),
                top: Math.max(0, rect.top - editorRect.top + Math.max(0, (rect.height - 16) / 2)),
            });
        };

        Array.from(editor.childNodes).forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                addMarkerAtEnd(node);
                return;
            }
            if (node instanceof HTMLBRElement) {
                const range = document.createRange();
                range.setStartBefore(node);
                range.collapse(true);
                const rects = range.getClientRects();
                const rect = rects[rects.length - 1] || range.getBoundingClientRect();
                if (rect.width || rect.height) {
                    nextMarkers.push({ left: Math.min(editor.clientWidth - 12, Math.max(0, rect.left - editorRect.left + 2)), top: Math.max(0, rect.top - editorRect.top + Math.max(0, (rect.height - 16) / 2)) });
                }
                return;
            }
            if (node instanceof HTMLElement) {
                if (node.matches("ul, ol")) {
                    node.querySelectorAll(":scope > li").forEach(addMarkerAtEnd);
                } else if (node.textContent?.trim()) {
                    addMarkerAtEnd(node);
                }
            }
        });

        setParagraphMarkers(nextMarkers);
    }, [showParagraphMarkers]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const next = toEditorHtml(value);
        if (editor.innerHTML !== next) editor.innerHTML = next;
        editor.style.height = "auto";
        editor.style.height = `${Math.max(44, editor.scrollHeight)}px`;
    }, [value]);

    useEffect(() => {
        const frame = window.requestAnimationFrame(refreshParagraphMarkers);
        window.addEventListener("resize", refreshParagraphMarkers);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener("resize", refreshParagraphMarkers);
        };
    }, [value, refreshParagraphMarkers]);

    const command = (name: "bold" | "italic" | "underline" | "insertUnorderedList") => {
        editorRef.current?.focus();
        document.execCommand(name, false);
        onChange(editorRef.current?.innerHTML || "");
    };

    return (
        <div className={cn("relative overflow-hidden rounded-2xl border border-slate-100 bg-white", showParagraphMarkers && "rich-text-show-paragraphs", className)}>
            {showParagraphMarkers && <style>{`
                .rich-text-show-paragraphs [contenteditable] div::after,
                .rich-text-show-paragraphs [contenteditable] p::after {
                    content: " ¶";
                    color: #a5b4fc;
                    font-weight: 700;
                    font-style: normal;
                    pointer-events: none;
                    user-select: none;
                }
                .rich-text-show-paragraphs [contenteditable] br::after {
                    content: "↵";
                    color: #c7d2fe;
                    font-weight: 700;
                    pointer-events: none;
                    user-select: none;
                }
                .rich-text-show-paragraphs [contenteditable] div::after,
                .rich-text-show-paragraphs [contenteditable] p::after {
                    content: "\\00B6" !important;
                    display: inline;
                    vertical-align: baseline;
                    line-height: inherit;
                }
                /* A pseudo-element on <br> is rendered after the line break in some browsers.
                   Paragraph markers on the actual editor blocks are therefore the precise indicator. */
                .rich-text-show-paragraphs [contenteditable] br::after { content: none !important; }
                .rich-text-show-paragraphs [contenteditable] div::after,
                .rich-text-show-paragraphs [contenteditable] p::after { content: none !important; }
            `}</style>}
            <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("bold")} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600" title="Fett"><Bold className="h-4 w-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("italic")} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600" title="Kursiv"><Italic className="h-4 w-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("underline")} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600" title="Unterstrichen"><Underline className="h-4 w-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("insertUnorderedList")} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600" title="Aufzählung"><List className="h-4 w-4" /></button>
                <span className="mx-1 h-5 w-px bg-slate-200" />
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setShowParagraphMarkers((visible) => !visible)} aria-pressed={showParagraphMarkers} className={cn("rounded-lg p-2 transition-colors", showParagraphMarkers ? "bg-indigo-100 text-indigo-700" : "text-slate-500 hover:bg-white hover:text-indigo-600")} title="Absatzmarken ein-/ausblenden"><Pilcrow className="h-4 w-4" /></button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                data-placeholder={placeholder}
                onInput={(event) => {
                    const target = event.currentTarget;
                    target.style.height = "auto";
                    target.style.height = `${Math.max(44, target.scrollHeight)}px`;
                    onChange(target.innerHTML);
                    window.requestAnimationFrame(refreshParagraphMarkers);
                }}
                className="min-h-11 whitespace-pre-wrap px-4 py-3 text-sm text-slate-800 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5"
            />
            {showParagraphMarkers && <div className="pointer-events-none absolute inset-x-0 top-[43px] bottom-0 overflow-hidden" aria-hidden="true">
                {paragraphMarkers.map((marker, index) => <span key={`${marker.left}-${marker.top}-${index}`} className="absolute select-none text-xs font-bold leading-4 text-indigo-300" style={{ left: marker.left, top: marker.top }}>¶</span>)}
            </div>}
        </div>
    );
}
