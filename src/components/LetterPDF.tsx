import React, { forwardRef } from 'react';
import { Letter } from '@/types/letter';
import { CompanyData } from '@/types/company';

interface LetterPDFProps {
    letter: Letter;
    companySettings: CompanyData;
}

export const LetterPDF = forwardRef<HTMLDivElement, LetterPDFProps>(({ letter, companySettings }, ref) => {
    const logoSrc = companySettings?.logo;
    const ceoName = `${companySettings?.ceoFirstName || ''} ${companySettings?.ceoLastName || ''}`.trim();
    const senderShort = `${companySettings?.companyName || 'FlowY'}, ${companySettings?.street || ''}, ${companySettings?.zipCode || ''} ${companySettings?.city || ''}`;

    const formattedDate = letter.date 
        ? new Date(letter.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('de-DE');

    const paragraphs = letter.bodyText ? letter.bodyText.split('\n') : [''];

    return (
        <div ref={ref} style={{
            width: '100%',
            minHeight: '296mm',
            flexShrink: 0,
            padding: '50px 75px 60px 75px',
            backgroundColor: 'white',
            color: '#000',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '10pt',
            lineHeight: '1.45',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            margin: '0',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {logoSrc ? (
                        <img src={logoSrc} alt="Logo" style={{ maxHeight: '72px', maxWidth: '260px', objectFit: 'contain' }} />
                    ) : (
                        <>
                            <div style={{ fontSize: '22pt', fontWeight: 900, fontStyle: 'italic', color: '#111', letterSpacing: '-0.5px' }}>
                                <span style={{ color: '#6366f1', marginRight: '4px' }}>//</span>{(companySettings?.companyName || 'FLOWY').toUpperCase()}
                            </div>
                            <div style={{ color: '#6366f1', fontSize: '9pt', fontWeight: 'bold', marginTop: '3px' }}>Ihr Partner für Service & Logistik</div>
                        </>
                    )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '9pt', color: '#444', borderTop: '1px solid #111', paddingTop: '8px', minWidth: '240px', lineHeight: '1.3' }}>
                    {(companySettings?.street || '-')}<br />
                    {(companySettings?.zipCode || '')} {(companySettings?.city || '')}<br />
                    {(companySettings?.email || '-')} | Tel.: {(companySettings?.phone || '-')}
                </div>
            </div>

            {/* Recipient Field */}
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '40px', marginTop: '15px', width: '280px' }}>
                <div style={{ fontSize: '7.5pt', color: '#777', borderBottom: '1px solid #bbb', paddingBottom: '3px', marginBottom: '8px' }}>
                    {senderShort}
                </div>
                <div style={{ fontSize: '10.5pt', lineHeight: '1.4', fontWeight: 'bold', color: '#1e293b' }}>
                    {letter.recipientName}
                </div>
                <div style={{ fontSize: '10.5pt', lineHeight: '1.4', whiteSpace: 'pre-wrap', color: '#334155' }}>
                    {letter.recipientAddress}
                </div>
            </div>

            {/* Date & Place */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '25px', fontSize: '9.5pt', color: '#333' }}>
                {letter.city}, am {formattedDate}
            </div>

            {/* Subject */}
            <div style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
                {letter.subject}
            </div>

            {/* Salutation */}
            <div style={{ fontSize: '10pt', marginBottom: '12px', color: '#334155' }}>
                {letter.salutation}
            </div>

            {/* Body Text */}
            <div style={{ fontSize: '10pt', lineHeight: '1.5', color: '#334155', flexGrow: 1 }}>
                {paragraphs.map((para, idx) => (
                    <p key={idx} style={{ marginBottom: '14px', whiteSpace: 'pre-wrap' }}>{para}</p>
                ))}
            </div>

            {/* Sign-Off */}
            <div style={{ marginTop: '25px', fontSize: '10pt', lineHeight: '1.4', pageBreakInside: 'avoid' }}>
                <div>{letter.signOff}</div>
                <div style={{ height: '45px' }}></div>
                <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{companySettings?.companyName || 'FlowY'}</div>
                {ceoName && <div style={{ color: '#64748b', fontSize: '9pt', marginTop: '2px' }}>Vertreten durch {ceoName}</div>}
            </div>

            {/* Footer info (pinned to bottom of letter preview) */}
            <div style={{
                marginTop: 'auto',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '7.5pt',
                color: '#64748b',
                lineHeight: '1.4'
            }}>
                <div style={{ width: '33%' }}>
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>Firmenbuchgericht: </span><br />
                    {companySettings?.commercialCourt || '-'}
                    <br />
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>Firmenbuch-Nr.: </span><br />
                    {companySettings?.commercialRegisterNumber || '-'}
                </div>
                <div style={{ width: '34%', textAlign: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>Bank: </span><br />
                    {companySettings?.bankName || '-'}
                    <br />
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>IBAN: </span><br />
                    {companySettings?.iban || '-'}
                </div>
                <div style={{ width: '33%', textAlign: 'right' }}>
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>BIC: </span><br />
                    {companySettings?.bic || '-'}
                    <br />
                    <span style={{ fontWeight: 'bold', color: '#334155' }}>UID-Nr: </span><br />
                    {companySettings?.vatId || '-'}
                </div>
            </div>
        </div>
    );
});

LetterPDF.displayName = "LetterPDF";
