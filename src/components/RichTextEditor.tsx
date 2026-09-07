"use client";

import React, { useEffect, useRef } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";
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

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const next = toEditorHtml(value);
        if (editor.innerHTML !== next) editor.innerHTML = next;
        editor.style.height = "auto";
        editor.style.height = `${Math.max(44, editor.scrollHeight)}px`;
    }, [value]);

    const command = (name: "bold" | "italic" | "underline" | "insertUnorderedList") => {
        editorRef.current?.focus();
        document.execCommand(name, false);
        onChange(editorRef.current?.innerHTML || "");
    };

    return (
        <div className={cn("overflow-hidden rounded-2xl border border-slate-100 bg-white", className)}>
            <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("bold")} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600" title="Fett"><Bold className="h-4 w-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("italic")} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600" title="Kursiv"><Italic className="h-4 w-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("underline")} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600" title="Unterstrichen"><Underline className="h-4 w-4" /></button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => command("insertUnorderedList")} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-indigo-600" title="Aufzählung"><List className="h-4 w-4" /></button>
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
                }}
                className="min-h-11 whitespace-pre-wrap px-4 py-3 text-sm text-slate-800 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5"
            />
        </div>
    );
}
