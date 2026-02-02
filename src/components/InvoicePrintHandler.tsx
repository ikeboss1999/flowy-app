import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface InvoicePrintHandlerProps {
    children: React.ReactNode;
    onAfterPrint?: () => void;
}

export const InvoicePrintHandler: React.FC<InvoicePrintHandlerProps> = ({ children, onAfterPrint }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument;
        if (!doc) return;

        // 1. Copy all styles from the main document
        const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach((style) => {
            doc.head.appendChild(style.cloneNode(true));
        });

        // 2. Add base print styles to the iframe
        const styleElement = doc.createElement('style');
        styleElement.textContent = `
      body {
        margin: 0;
        padding: 0;
        background: white;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
      /* Ensure full visibility for the content */
      #print-root {
        width: 100%;
        height: 100%;
      }
    `;
        doc.head.appendChild(styleElement);

        // 3. Create a mount node in the iframe body
        const root = doc.createElement('div');
        root.id = 'print-root';
        doc.body.appendChild(root);
        setMountNode(root);

        // 4. Trigger print once content is ready (we'll count on the consumer to render content)
        // For now, we wait a bit for styles to load then print
        // In a real scenario with external stylesheets, we might need 'load' listeners
        // But since we are cloning nodes, mostly it works.

        // We'll expose a print trigger mechanism or just auto-print when mounted.
        // Let's auto-print after a short delay to allow rendering.
        const printTimer = setTimeout(() => {
            iframe.contentWindow?.print();
            if (onAfterPrint) {
                // We might want to wait for the print dialog to close, but browsers don't reliably fire that event.
                // So we just call it.
                onAfterPrint();
            }
        }, 500);

        return () => {
            clearTimeout(printTimer);
        };
    }, [onAfterPrint]);

    return (
        <iframe
            ref={iframeRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '0px',
                height: '0px',
                border: 'none',
                visibility: 'hidden',
                pointerEvents: 'none'
            }}
            title="print-frame"
        >
            {mountNode && createPortal(children, mountNode)}
        </iframe>
    );
};
