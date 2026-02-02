import React, { forwardRef } from 'react';
import { Invoice } from '@/types/invoice';
import { CompanyData } from '@/types/company';
import { Customer } from '@/types/customer';
import { cn } from '@/lib/utils';
import { useCompanySettings } from '@/hooks/useCompanySettings';

interface InvoicePDFProps {
    invoice: Invoice;
    customer?: Customer;
    companySettings: CompanyData;
}

export const InvoicePDF = forwardRef<HTMLDivElement, InvoicePDFProps>(({ invoice, customer, companySettings }, ref) => {
    // Determine logo to use
    const logoSrc = companySettings.logo;

    // Format dates
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('de-DE');
    };

    return (
        <div ref={ref} style={{
            width: '210mm',
            height: '297mm',
            flexShrink: 0,
            padding: '40px 75px 30px 75px', // Reduced top padding to shift header up
            backgroundColor: 'white',
            color: '#000',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            lineHeight: '1.25',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            margin: '0 auto',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '35px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {logoSrc ? (
                        <img src={logoSrc} alt="Logo" style={{ maxHeight: '60px', maxWidth: '280px', objectFit: 'contain' }} />
                    ) : (
                        <>
                            <div style={{ fontSize: '28pt', fontWeight: 900, fontStyle: 'italic', color: '#111', letterSpacing: '-1px' }}>
                                <span style={{ color: '#f43f5e', marginRight: '4px' }}>//</span>{companySettings.companyName.toUpperCase()}
                            </div>
                            <div style={{ color: '#f43f5e', fontSize: '11pt', fontWeight: 'bold', marginTop: '-4px' }}>Auf Qualität ist Verlass</div>
                        </>
                    )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '9pt', color: '#444', borderTop: '1px solid #ddd', paddingTop: '8px', minWidth: '320px', lineHeight: '1.5' }}>
                    {companySettings.street} | {companySettings.zipCode} {companySettings.city}<br />
                    {companySettings.email} | Tel.: {companySettings.phone}
                </div>
            </div>

            {/* Recipient */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '45px', marginTop: '30px' }}>
                <div style={{ fontSize: '11pt', lineHeight: '1.5' }}>
                    {customer?.type === 'business' ? (
                        <>{customer.name}<br />z.H. Buchhaltung</>
                    ) : (
                        <>{customer?.salutation || 'Herr'}<br />{customer?.name}</>
                    )}
                    <br />
                    {customer?.address.street}<br />
                    {customer?.address.zip} {customer?.address.city}
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '10pt' }}>Seite 1</div>
            </div>

            {/* Zusatzinformationen */}
            <div style={{ textAlign: 'left' }}>
                <div style={{
                    background: '#000',
                    color: '#fff',
                    display: 'inline-block',
                    padding: '6px 24px',
                    fontWeight: 'bold',
                    fontSize: '11pt',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    textAlign: 'center',
                    minWidth: '180px'
                }}>
                    Zusatzinformationen
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginBottom: '30px' }}>
                    <div style={{ width: '50%' }}>
                        <div style={{ display: 'flex', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', width: '135px', flexShrink: 0 }}>Baustelle:</span>
                            <span>{invoice.constructionProject || customer?.address.street || '-'}</span>
                        </div>
                        <div style={{ display: 'flex' }}>
                            <span style={{ fontWeight: 'bold', width: '135px', flexShrink: 0 }}>Leistungszeitraum:</span>
                            <span>
                                {invoice.performancePeriod.from
                                    ? `${formatDate(invoice.performancePeriod.from)} - ${formatDate(invoice.performancePeriod.to || '')}`
                                    : '-'
                                }
                            </span>
                        </div>
                        {customer?.type === 'business' && customer.taxId && (
                            <div style={{ display: 'flex', marginTop: '4px' }}>
                                <span style={{ fontWeight: 'bold', width: '135px', flexShrink: 0 }}>UID-Nummer:</span>
                                <span>{customer.taxId}</span>
                            </div>
                        )}
                        {invoice.isReverseCharge && companySettings.employerNumber && (
                            <div style={{ display: 'flex', marginTop: '4px' }}>
                                <span style={{ fontWeight: 'bold', width: '135px', flexShrink: 0 }}>Dienstgebernr.:</span>
                                <span>{companySettings.employerNumber}</span>
                            </div>
                        )}
                    </div>
                    <div style={{ width: '45%', paddingLeft: '40px' }}>
                        {[
                            ['Datum:', formatDate(invoice.issueDate)],
                            ['Bearbeiter:', (invoice.processor && invoice.processor !== 'Mithat Etovic')
                                ? invoice.processor
                                : `${companySettings.ceoFirstName} ${companySettings.ceoLastName}`.trim() || invoice.processor || '-'],
                            ['E-Mail:', companySettings.email],
                            ['Telefon:', companySettings.phone]
                        ].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 'bold', width: '110px', flexShrink: 0 }}>{label}</span>
                                <span>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Title */}
            <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '25px', color: '#000' }}>
                {invoice.billingType === 'partial' ? (
                    `${invoice.partialPaymentNumber || '1'}. Teilrechnungs-Nr.: ${invoice.invoiceNumber}`
                ) : invoice.billingType === 'final' ? (
                    `Schlussrechnungs-Nr.: ${invoice.invoiceNumber}`
                ) : (
                    `Rechnungs-Nr: ${invoice.invoiceNumber}`
                )}
                {invoice.subjectExtra ? ` // ${invoice.subjectExtra}` : ''}
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                    <tr style={{ background: '#000', color: '#fff' }}>
                        <th style={{ padding: '10px 5px', fontSize: '9pt', width: '45px' }}>Pos.</th>
                        <th style={{ padding: '10px 10px', fontSize: '9pt', textAlign: 'left' }}>Bezeichnung</th>
                        <th style={{ padding: '10px 5px', fontSize: '9pt', width: '75px' }}>Einheit</th>
                        <th style={{ padding: '10px 5px', fontSize: '9pt', width: '70px' }}>Menge</th>
                        <th style={{ padding: '10px 10px', fontSize: '9pt', width: '110px', textAlign: 'right' }}>Einzelpreis</th>
                        <th style={{ padding: '10px 10px', fontSize: '9pt', width: '110px', textAlign: 'right' }}>Gesamt</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item, index) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '12px 5px', fontSize: '10pt', textAlign: 'center', color: '#444' }}>{index + 1}</td>
                            <td style={{ padding: '12px 10px', fontSize: '10pt' }}>{item.description}</td>
                            <td style={{ padding: '12px 5px', fontSize: '10pt', textAlign: 'center' }}>{item.unit === 'pauschal' ? 'PA' : item.unit}</td>
                            <td style={{ padding: '12px 5px', fontSize: '10pt', textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ padding: '12px 10px', fontSize: '10pt', textAlign: 'right' }}>€ {Number(item.pricePerUnit).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '12px 10px', fontSize: '10pt', textAlign: 'right', fontWeight: 'bold' }}>€ {Number(item.totalPrice).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Summary and Reverse Charge Notice */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div style={{ width: '60%', fontSize: '10pt', fontWeight: 'bold', paddingTop: '10px' }}>
                    {invoice.isReverseCharge && (
                        <span>Übergang der Steuerschuld für Bauleistungen gem. §19 Abs. 1a UStG</span>
                    )}
                </div>
                <div style={{ width: '250px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '10pt' }}>
                        <span style={{ flex: 1 }}>{invoice.billingType === 'final' ? 'Gesamtleistung Netto:' : 'Nettobetrag:'}</span>
                        <span style={{ fontWeight: 'bold' }}>€ {invoice.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '10pt' }}>
                        <span style={{ flex: 1 }}>{invoice.isReverseCharge ? '0% USt.' : `${invoice.taxRate}% USt.`}:</span>
                        <span style={{ fontWeight: 'bold' }}>€ {invoice.taxAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '12pt', fontWeight: 900, borderTop: '2px solid #000', marginTop: '6px' }}>
                        <span style={{ flex: 1 }}>{invoice.billingType === 'final' ? 'Rest-Zahlbetrag:' : 'Bruttobetrag:'}</span>
                        <span>€ {invoice.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Payment Info */}
            <div style={{ textAlign: 'center', fontSize: '10pt', marginBottom: '60px', lineHeight: '1.6' }}>
                Bitte überweisen Sie den Betrag von <span style={{ color: '#f43f5e', fontWeight: 'bold' }}>€ {invoice.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span> an die folgende IBAN:<br />
                <div><span style={{ fontWeight: 'bold' }}>IBAN:</span> {companySettings.iban}</div>
                <div><span style={{ fontWeight: 'bold' }}>Verwendungszweck:</span> Rechnungs-Nr: {invoice.invoiceNumber}</div>
            </div>

            {/* Signature Area */}
            <div style={{ fontSize: '10pt', marginBottom: 'auto' }}>
                Mit freundlichen Grüßen<br /><br />
                <div style={{ fontWeight: 'bold' }}>{companySettings.ceoFirstName} {companySettings.ceoLastName}</div>
                <div>Geschäftsführer</div>
            </div>

            {/* Footer */}
            <div style={{ paddingTop: '10px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '9pt', textAlign: 'center', marginBottom: '15px' }}>Zahlungskondition: sofort nach Rechnungserhalt</div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#444' }}>
                    <div style={{ width: '30%' }}>
                        <span style={{ fontWeight: 'bold', color: '#000' }}>Gericht:</span> {companySettings.commercialCourt || '-'}<br />
                        <span style={{ fontWeight: 'bold', color: '#000' }}>FN:</span> {companySettings.commercialRegisterNumber || '-'}
                    </div>
                    <div style={{ width: '35%' }}>
                        <span style={{ fontWeight: 'bold', color: '#000' }}>Bank:</span> {companySettings.bankName}<br />
                        <span style={{ fontWeight: 'bold', color: '#000' }}>IBAN:</span> {companySettings.iban}
                    </div>
                    <div style={{ width: '30%', textAlign: 'right' }}>
                        <span style={{ fontWeight: 'bold', color: '#000' }}>BIC:</span> {companySettings.bic}<br />
                        <span style={{ fontWeight: 'bold', color: '#000' }}>UID:</span> {companySettings.vatId}
                    </div>
                </div>
            </div>
        </div>
    );


});

InvoicePDF.displayName = "InvoicePDF";
