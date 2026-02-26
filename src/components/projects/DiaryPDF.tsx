import React, { forwardRef } from 'react';
import { Project, DiaryEntry } from '@/types/project';
import { CompanyData } from '@/types/company';
import { Customer } from '@/types/customer';
import { cn } from '@/lib/utils';

interface DiaryPDFProps {
    project: Project;
    customer?: Customer;
    companySettings: CompanyData;
}

export const DiaryPDF = forwardRef<HTMLDivElement, DiaryPDFProps>(({ project, customer, companySettings }, ref) => {
    const logoSrc = companySettings.logo;

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const sortedEntries = [...(project.diaryEntries || [])].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
        <div ref={ref} style={{
            width: '100%',
            minHeight: '296mm',
            padding: '40px 75px 30px 75px',
            backgroundColor: 'white',
            color: '#000',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            lineHeight: '1.4',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            margin: '0',
        }}>
            {/* Header - Identical to Invoice */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {logoSrc ? (
                        <img src={logoSrc} alt="Logo" style={{ maxHeight: '90px', maxWidth: '320px', objectFit: 'contain' }} />
                    ) : (
                        <>
                            <div style={{ fontSize: '28pt', fontWeight: 900, fontStyle: 'italic', color: '#111', letterSpacing: '-1px' }}>
                                <span style={{ color: '#f43f5e', marginRight: '4px' }}>//</span>{(companySettings?.companyName || 'FLOWY').toUpperCase()}
                            </div>
                            <div style={{ color: '#f43f5e', fontSize: '11pt', fontWeight: 'bold', marginTop: '-4px' }}>Ihr Partner für Bauprojekte</div>
                        </>
                    )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '10pt', color: '#444', borderTop: '1px solid #ddd', paddingTop: '8px', minWidth: '320px', lineHeight: '1.5' }}>
                    {(companySettings?.street || '-')} | {(companySettings?.zipCode || '')} {(companySettings?.city || '')}<br />
                    {(companySettings?.email || '-')} | Tel.: {(companySettings?.phone || '-')}
                </div>
            </div>

            {/* Title & Project Info */}
            <div style={{ marginBottom: '30px', borderBottom: '2px solid #000', paddingBottom: '15px' }}>
                <h1 style={{ fontSize: '24pt', fontWeight: 'bold', margin: '0 0 10px 0', color: '#4f46e5' }}>BAUTAGEBUCH BERICHT</h1>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '10pt', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Projekt</p>
                        <p style={{ margin: 0, fontSize: '14pt', fontWeight: 'bold' }}>{project.name}</p>
                        <p style={{ margin: '4px 0 0 0', color: '#444' }}>{project.address.street}, {project.address.zip} {project.address.city}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 4px 0', fontSize: '10pt', color: '#666', textTransform: 'uppercase', fontWeight: 'bold' }}>Datum</p>
                        <p style={{ margin: 0, fontSize: '12pt', fontWeight: 'bold' }}>{new Date().toLocaleDateString('de-DE')}</p>
                        {customer && (
                            <p style={{ margin: '8px 0 0 0', color: '#444' }}>Kunde: <span style={{ fontWeight: 'bold' }}>{customer.name}</span></p>
                        )}
                    </div>
                </div>
            </div>

            {/* Entries */}
            <div style={{ flex: 1 }}>
                {sortedEntries.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                        Keine Bautagebucheinträge vorhanden.
                    </div>
                ) : (
                    sortedEntries.map((entry, index) => (
                        <div key={entry.id} style={{
                            marginBottom: '40px',
                            pageBreakInside: 'avoid',
                            backgroundColor: '#f8fafc',
                            padding: '25px',
                            borderRadius: '15px',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #cbd5e1', paddingBottom: '10px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '12pt', color: '#1e293b' }}>
                                    {formatDate(entry.date)}
                                </div>
                                <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '4px 12px', borderRadius: '8px' }}>
                                    {formatTime(entry.date)} Uhr
                                </div>
                            </div>

                            {entry.description && (
                                <div style={{ marginBottom: '20px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                                    {entry.description}
                                </div>
                            )}

                            {entry.images && entry.images.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                                    {entry.images.map((img, idx) => (
                                        <div key={idx} style={{
                                            aspectRatio: '16/10',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#fff'
                                        }}>
                                            <img src={img} alt={`Bild ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

DiaryPDF.displayName = "DiaryPDF";
