import React, { forwardRef } from 'react';
import { Employee } from '@/types/employee';
import { CompanyData } from '@/types/company';

interface EmployeeDataSheetPDFProps {
    employee: Employee;
    companySettings: CompanyData;
}

export const EmployeeDataSheetPDF = forwardRef<HTMLDivElement, EmployeeDataSheetPDFProps>(({ employee, companySettings }, ref) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('de-DE');
    };

    const logoSrc = companySettings.logo;

    return (
        <div ref={ref} style={{
            width: '210mm',
            height: '296mm',
            padding: '20mm',
            backgroundColor: 'white',
            color: '#1a1a1a',
            fontFamily: 'Arial, sans-serif',
            fontSize: '10pt',
            lineHeight: '1.5',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', borderBottom: '2px solid #333', paddingBottom: '20px' }}>
                <div>
                    {logoSrc ? (
                        <img src={logoSrc} alt="Logo" style={{ maxHeight: '60px', maxWidth: '250px', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ fontSize: '20pt', fontWeight: 'bold' }}>{companySettings.companyName}</div>
                    )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '9pt', color: '#666' }}>
                    <strong>Arbeitgeber:</strong><br />
                    {companySettings.companyName}<br />
                    {companySettings.street}<br />
                    {companySettings.zipCode} {companySettings.city}<br />
                    {companySettings.email}
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '22pt', fontWeight: 'bold', margin: '0', textTransform: 'uppercase', letterSpacing: '2px' }}>Personaldatenblatt</h1>
                <p style={{ fontSize: '10pt', color: '#666', marginTop: '5px' }}>Zur Vorlage bei der Steuerberatung / Lohnabrechnung</p>
            </div>

            {/* General Data Card */}
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '15px', color: '#333' }}>1. Persönliche Daten</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Personal-Nr:</span> {employee.employeeNumber}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Vorname:</span> {employee.personalData.firstName}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Nachname:</span> {employee.personalData.lastName}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Geburtsdatum:</span> {formatDate(employee.personalData.birthday)}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Geburtsort:</span> {employee.personalData.birthPlace} ({employee.personalData.birthCountry})</div>
                    </div>
                    <div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Familienstand:</span> {employee.personalData.maritalStatus}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Staatsangeh.:</span> {employee.personalData.nationality}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Straße/Nr:</span> {employee.personalData.street}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>PLZ/Ort:</span> {employee.personalData.zip} {employee.personalData.city}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Telefon:</span> {employee.personalData.phone}</div>
                    </div>
                </div>
            </div>

            {/* Tax & Social Card */}
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '15px', color: '#333' }}>2. Sozialversicherung</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>SV-Nummer:</span> {employee.personalData.socialSecurityNumber || 'nicht angegeben'}</div>
                    </div>
                    <div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Krankenkasse:</span> {employee.personalData.healthInsurance || 'nicht angegeben'}</div>
                    </div>
                </div>
            </div>

            {/* Employment Card */}
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '15px', color: '#333' }}>3. Beschäftigungsverhältnis</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Eintrittsdatum:</span> {formatDate(employee.employment.startDate)}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Position:</span> {employee.employment.position}</div>
                    </div>
                    <div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Status:</span> {employee.employment.status}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Bruttogehalt:</span> {employee.employment.salary}</div>
                        {employee.employment.endDate && (
                            <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '130px', display: 'inline-block' }}>Austrittsdatum:</span> {formatDate(employee.employment.endDate)}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bank Card */}
            <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '15px', color: '#333' }}>4. Bankverbindung</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '120px', display: 'inline-block' }}>Bankname:</span> {employee.bankDetails.bankName}</div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '120px', display: 'inline-block' }}>IBAN:</span> {employee.bankDetails.iban}</div>
                    </div>
                    <div>
                        <div style={{ marginBottom: '8px' }}><span style={{ fontWeight: 'bold', width: '120px', display: 'inline-block' }}>BIC:</span> {employee.bankDetails.bic}</div>
                    </div>
                </div>
            </div>

            {/* Additional Info */}
            {employee.additionalInfo.notes && (
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '12pt', fontWeight: 'bold', borderBottom: '1px solid #eee', paddingBottom: '5px', marginBottom: '15px', color: '#333' }}>5. Sonstiges / Notizen</h2>
                    <div style={{ fontSize: '9pt', color: '#444', fontStyle: 'italic' }}>
                        {employee.additionalInfo.notes}
                    </div>
                </div>
            )}

            {/* Signatures */}
            <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', paddingTop: '40px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
                        <div style={{ fontSize: '9pt', fontWeight: 'bold' }}>Ort, Datum, Unterschrift Arbeitnehmer</div>
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #333', paddingTop: '10px' }}>
                        <div style={{ fontSize: '9pt', fontWeight: 'bold' }}>Ort, Datum, Unterschrift Arbeitgeber</div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '8pt', color: '#999', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                Dieses Dokument wurde automatisch erstellt mit FlowY HR-Management.
            </div>
        </div>
    );
});

EmployeeDataSheetPDF.displayName = "EmployeeDataSheetPDF";
