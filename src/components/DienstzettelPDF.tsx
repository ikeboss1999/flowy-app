import React, { forwardRef } from 'react';
import { Employee } from '@/types/employee';
import { CompanyData } from '@/types/company';

interface DienstzettelPDFProps {
    employee: Employee;
    companySettings: CompanyData;
}

export const DienstzettelPDF = forwardRef<HTMLDivElement, DienstzettelPDFProps>(({ employee, companySettings }, ref) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('de-DE');
    };

    const today = new Date().toLocaleDateString('de-DE');
    const logoSrc = companySettings.logo;

    return (
        <div ref={ref} style={{
            width: '210mm',
            height: '296mm',
            padding: '20mm',
            backgroundColor: 'white',
            color: '#000',
            fontFamily: 'Arial, sans-serif',
            fontSize: '11pt',
            lineHeight: '1.3',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {logoSrc ? (
                        <img src={logoSrc} alt="Logo" style={{ maxHeight: '70px', maxWidth: '300px', objectFit: 'contain' }} />
                    ) : (
                        <>
                            <div style={{ fontSize: '24pt', fontWeight: 900, fontStyle: 'italic', color: '#111', letterSpacing: '-1px' }}>
                                <span style={{ color: '#6366f1', marginRight: '4px' }}>//</span>{(companySettings?.companyName || 'FLOWY').toUpperCase()}
                            </div>
                        </>
                    )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '9pt', color: '#444', borderTop: '1px solid #ddd', paddingTop: '6px', minWidth: '250px', lineHeight: '1.4' }}>
                    {(companySettings?.street || '-')}<br />
                    {(companySettings?.zipCode || '')} {(companySettings?.city || '')}<br />
                    {(companySettings?.email || '-')}<br />
                    Tel.: {(companySettings?.phone || '-')}
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px', textDecoration: 'underline', fontWeight: 'bold', fontSize: '13pt' }}>
                DIENSTZETTEL
            </div>

            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>1. Arbeitgeber:</span> {companySettings.companyName}, {companySettings.street}, {companySettings.zipCode} {companySettings.city}
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 'bold' }}>2. Arbeitnehmer (in): {employee.personalData.firstName} {employee.personalData.lastName}</div>
                <div style={{ paddingLeft: '20px' }}>
                    Geboren am : {formatDate(employee.personalData.birthday)}<br />
                    Wohnhaft in : {employee.personalData.street}, {employee.personalData.zip} {employee.personalData.city}
                </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>3. Beginn des Dienstverhältnisses:</span> {formatDate(employee.employment.startDate)}<br />
                Ein Probemonat gilt als vereinbart (innerhalb dieses Monats kann das Dienstverhältnis von jedem der beiden Teile ohne Angabe von Gründen jederzeit gelöst werden)
            </div>

            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>4. Art des Dienstverhältnisses:</span> {employee.employment.workerType}<br />
                <span style={{ fontWeight: 'bold' }}>Verwendung:</span> {employee.employment.verwendung}
            </div>

            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>5. Kündigungsfristen und -termine richten sich nach dem Kollektivvertrag.</span>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>6. Dienstort:</span> {companySettings.city} und Baustellen
            </div>

            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>7. Anzuwendende kollektive Rechtsquellen:</span><br />
                Kollektivvertrag: Baugewerbe
            </div>

            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>8. Eingestuft:</span> {employee.employment.classification || '-'}
            </div>

            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>9. Anfangsbezug:</span> {employee.employment.salary}
            </div>

            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>10. Vereinbarte Normalarbeitszeit:</span> gemäß KV
            </div>

            <div style={{ marginBottom: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>11. Ausmaß des jährlichen Urlaubs:</span> {employee.employment.annualLeave} Werktage
            </div>

            <div style={{ marginBottom: '25px' }}>
                <span style={{ fontWeight: 'bold' }}>12. Mitarbeitervorsorgekasse-Leitzahl (Abf. Neu):</span><br />
                BUAK / VBV-Vorsorgekasse (Leitzahl: 71100)
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                <span>Gebührenfrei</span>
                <span>Dienstzettel übernommen</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                <div>
                    {companySettings.city}, {today}
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #000', width: '250px', marginTop: '20px' }}></div>
                    <div style={{ fontSize: '9pt', marginTop: '5px' }}>(Unterschrift des Arbeitnehmers)</div>
                </div>
            </div>
        </div>
    );
});

DienstzettelPDF.displayName = "DienstzettelPDF";
