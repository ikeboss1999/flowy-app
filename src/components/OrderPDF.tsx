import React, { forwardRef } from 'react';
import { OrderConfirmation, OrderSettings } from '@/types/order';
import { CompanyData } from '@/types/company';
import { Customer } from '@/types/customer';

interface OrderPDFProps {
    order: OrderConfirmation;
    customer?: Customer;
    companySettings: CompanyData;
    orderSettings?: OrderSettings;
}

export const OrderPDF = forwardRef<HTMLDivElement, OrderPDFProps>(({ order, customer, companySettings, orderSettings }, ref) => {
    const logoSrc = companySettings?.logo;

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('de-DE');
    };

    const getSalutation = () => {
        if (customer?.type === 'business') return 'Sehr geehrte Damen und Herren,';
        const lastName = customer?.name?.split(' ').pop() || '';
        if (customer?.salutation === 'Frau') return `Sehr geehrte Frau ${lastName},`;
        if (customer?.salutation === 'Herr') return `Sehr geehrter Herr ${lastName},`;
        return 'Sehr geehrte Damen und Herren,'; // Fallback
    };

    return (
        <div ref={ref} style={{
            width: '100%',
            minHeight: '296mm',
            flexShrink: 0,
            padding: '40px 75px 30px 75px',
            backgroundColor: 'white',
            color: '#000',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11pt',
            lineHeight: '1.25',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            margin: '0',
        }}>
            {/* Header */}
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

            {/* Recipient */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '45px', marginTop: '30px' }}>
                <div style={{ fontSize: '11pt', lineHeight: '1.5' }}>
                    {customer?.type === 'business' ? (
                        <>Firma<br />{customer.name}</>
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
                    minWidth: '220px'
                }}>
                    Auftragsinformationen
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10pt', marginBottom: '30px' }}>
                    <div style={{ width: '50%' }}>
                        <div style={{ display: 'flex', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Baustelle:</span>
                            <span style={{ fontWeight: 'normal' }}>{order.constructionProject || customer?.address.street || '-'}</span>
                        </div>
                        {order.deliveryDate && (
                            <div style={{ display: 'flex' }}>
                                <span style={{ fontWeight: 'bold', width: '135px', flexShrink: 0 }}>Liefertermin:</span>
                                <span style={{ fontWeight: 'normal' }}>{formatDate(order.deliveryDate)}</span>
                            </div>
                        )}
                        {order.offerNumber && (
                            <div style={{ display: 'flex' }}>
                                <span style={{ fontWeight: 'bold', width: '105px', flexShrink: 0 }}>Angebots-Ref:</span>
                                <span style={{ fontWeight: 'normal' }}>{order.offerNumber}</span>
                            </div>
                        )}
                    </div>
                    <div style={{ width: '32%' }}>
                        {[
                            ['Datum:', formatDate(order.issueDate)],
                            ['Bearbeiter:', order.processor || `${companySettings?.ceoFirstName || ''} ${companySettings?.ceoLastName || ''}`.trim() || '-'],
                        ].map(([label, value]) => (
                            <div key={label} style={{ display: 'flex', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 'bold', width: '85px', flexShrink: 0 }}>{label}</span>
                                <span style={{ fontWeight: 'normal' }}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Title */}
            <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '15px', color: '#000' }}>
                {`Auftragsbestätigung Nr.: ${order.orderNumber}`}
                {order.subjectExtra ? ` // ${order.subjectExtra}` : ''}
            </div>

            {/* Intro Text */}
            <div style={{ fontSize: '11pt', lineHeight: '1.5', marginBottom: '25px', color: '#222', whiteSpace: 'pre-wrap' }}>
                {getSalutation() + '\n\n'}
                {order.introText || ''}
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
                    {(() => {
                        let pos = 0;
                        return order.items.map((item) => {
                            const isTitle = item.itemType === 'title';
                            if (!isTitle) pos++;
                            if (isTitle) {
                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f5f5f5' }}>
                                        <td style={{ padding: '9px 5px', textAlign: 'center', color: '#aaa', fontSize: '9pt' }}>—</td>
                                        <td colSpan={5} style={{ padding: '9px 10px', fontWeight: 'bold', fontSize: '10.5pt', color: '#111' }}>
                                            {item.title || item.description}
                                        </td>
                                    </tr>
                                );
                            }
                            return (
                                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px 5px', fontSize: '10pt', textAlign: 'center', color: '#444' }}>{pos}</td>
                                    <td style={{ padding: '10px 10px', fontSize: '10pt' }}>
                                        {item.title && <div style={{ fontWeight: 'bold' }}>{item.title}</div>}
                                        {item.description && <div style={{ fontSize: '9.5pt', color: '#555', marginTop: item.title ? '2px' : 0 }}>{item.description}</div>}
                                    </td>
                                    <td style={{ padding: '10px 5px', fontSize: '10pt', textAlign: 'center' }}>{item.unit}</td>
                                    <td style={{ padding: '10px 5px', fontSize: '10pt', textAlign: 'center' }}>{item.quantity}</td>
                                    <td style={{ padding: '10px 10px', fontSize: '10pt', textAlign: 'right' }}>€ {(item.pricePerUnit || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                                    <td style={{ padding: '10px 10px', fontSize: '10pt', textAlign: 'right', fontWeight: 'bold' }}>€ {(item.totalPrice || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            );
                        });
                    })()}
                </tbody>
            </table>

            {/* Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div style={{ width: '60%', fontWeight: 'bold', paddingTop: '10px', color: '#000' }}>
                    {order.isReverseCharge && (
                        <div style={{ fontSize: '8pt' }}>
                            Übergang der Steuerschuld für Bauleistungen gem. §19 Abs. 1a UStG
                        </div>
                    )}
                </div>
                <div style={{ width: '250px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '10pt' }}>
                        <span style={{ flex: 1 }}>Nettobetrag:</span>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>€ {order.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '10pt' }}>
                        <span style={{ flex: 1 }}>{order.isReverseCharge ? '0% USt.' : `${order.taxRate}% USt.`}:</span>
                        <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>€ {order.taxAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '12pt', fontWeight: 900, borderTop: '2px solid #000', marginTop: '6px' }}>
                        <span style={{ flex: 1, paddingRight: '8px' }}>Gesamtsumme:</span>
                        <span style={{ whiteSpace: 'nowrap' }}>€ {order.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Terms and conditions */}
            {order.terms && (
                <div style={{ fontSize: '9pt', color: '#555', marginBottom: '30px', whiteSpace: 'pre-wrap' }}>
                    {order.terms}
                </div>
            )}

            {/* Signature Area */}
            <div style={{ fontSize: '10pt', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <div>Mit freundlichen Grüßen<br /><br /></div>
                <div style={{ fontWeight: 'bold' }}>{companySettings?.ceoFirstName} {companySettings?.ceoLastName}</div>
                <div>Geschäftsführer</div>
            </div>

            {/* Footer */}
            <div style={{ paddingTop: '10px' }}>
                <div style={{ borderTop: '1px solid #000', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#444' }}>
                    <div style={{ width: '30%' }}>
                        <span style={{ fontWeight: 'bold', color: '#000' }}>Firmenbuchgericht:</span> {companySettings?.commercialCourt || '-'}<br />
                        <span style={{ fontWeight: 'bold', color: '#000' }}>Firmenbuch-Nr.:</span> {companySettings?.commercialRegisterNumber || '-'}
                    </div>
                    <div style={{ width: '35%', textAlign: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#000' }}>Bank:</span> {companySettings?.bankName || '-'}<br />
                        <span style={{ fontWeight: 'bold', color: '#000' }}>IBAN:</span> {companySettings?.iban || '-'}
                    </div>
                    <div style={{ width: '30%', textAlign: 'right' }}>
                        <span style={{ fontWeight: 'bold', color: '#000' }}>BIC:</span> {companySettings?.bic || '-'}<br />
                        <span style={{ fontWeight: 'bold', color: '#000' }}>UID:</span> {companySettings?.vatId || '-'}
                    </div>
                </div>
            </div>
        </div>
    );
});

OrderPDF.displayName = "OrderPDF";
