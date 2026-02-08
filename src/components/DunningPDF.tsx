import React, { forwardRef } from 'react';
import { Invoice, InvoiceSettings } from '@/types/invoice';
import { CompanyData } from '@/types/company';
import { Customer } from '@/types/customer';

interface DunningPDFProps {
    invoice: Invoice;
    customer?: Customer;
    companySettings: CompanyData;
    invoiceSettings: InvoiceSettings;
    dunningLevel: number; // 1 = Review, 2 = 1. Mahnung, etc.
    dunningDate: string; // ISO String
}

export const DunningPDF = forwardRef<HTMLDivElement, DunningPDFProps>(({ invoice, customer, companySettings, invoiceSettings, dunningLevel, dunningDate }, ref) => {
    // Determine logo to use
    const logoSrc = companySettings.logo;

    // Helper: Format Date
    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('de-DE');
    };

    // Helper: Calculate Deadline
    const calculateDeadline = () => {
        const date = new Date(dunningDate);
        let daysToAdd = 7; // Default
        if (dunningLevel === 1) daysToAdd = invoiceSettings.dunningLevels.level1.period;
        if (dunningLevel === 2) daysToAdd = invoiceSettings.dunningLevels.level2.period;
        if (dunningLevel === 3) daysToAdd = invoiceSettings.dunningLevels.level3.period;
        if (dunningLevel === 4) daysToAdd = invoiceSettings.dunningLevels.level4.period;

        date.setDate(date.getDate() + daysToAdd);
        return date.toLocaleDateString('de-DE');
    };

    // Helper: Get Cumulative Fee
    const getFee = () => {
        let totalFee = 0;
        if (dunningLevel >= 1) totalFee += invoiceSettings.dunningLevels.level1.fee;
        if (dunningLevel >= 2) totalFee += invoiceSettings.dunningLevels.level2.fee;
        if (dunningLevel >= 3) totalFee += invoiceSettings.dunningLevels.level3.fee;
        if (dunningLevel >= 4) totalFee += invoiceSettings.dunningLevels.level4.fee;
        return totalFee;
    };

    const fee = getFee();
    const newTotal = invoice.totalAmount + fee;

    // Content Config
    const getContent = () => {
        switch (dunningLevel) {
            case 1:
                return {
                    title: "Zahlungserinnerung",
                    intro: <>bei der Durchsicht unserer Unterlagen haben wir festgestellt, dass Ihre Rechnung Nr. <span style={{ fontWeight: 'bold' }}>{invoice.invoiceNumber}</span> vom <span style={{ fontWeight: 'bold' }}>{formatDate(invoice.issueDate)}</span> noch zur Zahlung offen ist.</>,
                    amountText: "Der neue ausstehende Betrag beläuft sich auf:",
                    closing: <>Sicherlich handelt es sich hierbei um ein Versehen. Wir möchten Sie freundlich bitten, die Überweisung des offenen Betrags bis spätestens <span style={{ fontWeight: 'bold' }}>{calculateDeadline()}</span> vorzunehmen.</>,
                    final: "Sollten Sie die Zahlung in der Zwischenzeit bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als gegenstandslos."
                };
            case 2:
                return {
                    title: "1. Mahnung",
                    intro: <>leider konnten wir bezüglich unserer Rechnung Nr. <span style={{ fontWeight: 'bold' }}>{invoice.invoiceNumber}</span> vom <span style={{ fontWeight: 'bold' }}>{formatDate(invoice.issueDate)}</span> bisher keinen Zahlungseingang feststellen.</>,
                    amountText: "Der neue ausstehende Betrag beläuft sich auf:",
                    closing: <>Wir erlauben uns daher, Ihnen Mahngebühren in Höhe von € {fee.toFixed(2).replace('.', ',')} zu berechnen und bitten Sie, den Gesamtbetrag bis spätestens <span style={{ fontWeight: 'bold' }}>{calculateDeadline()}</span> zu begleichen.</>,
                    final: "Sollte der Betrag bereits überwiesen sein, betrachten Sie dieses Schreiben bitte als gegenstandslos."
                };
            case 3:
                return {
                    title: "2. Mahnung",
                    intro: <>trotz unserer bisherigen Zahlungserinnerung ist die Rechnung Nr. <span style={{ fontWeight: 'bold' }}>{invoice.invoiceNumber}</span> vom <span style={{ fontWeight: 'bold' }}>{formatDate(invoice.issueDate)}</span> weiterhin unbeglichen.</>,
                    amountText: "Der neue ausstehende Betrag beläuft sich auf:",
                    closing: <>Wir erheben weitere Mahngebühren von € {fee.toFixed(2).replace('.', ',')} und fordern Sie letztmalig auf, den ausstehenden Gesamtbetrag bis zum <span style={{ fontWeight: 'bold' }}>{calculateDeadline()}</span> zu überweisen.</>,
                    final: "Sollte auch diese Frist ohne Zahlungseingang verstreichen, sehen wir uns gezwungen, ohne weitere Ankündigung rechtliche Schritte einzuleiten."
                };
            case 4:
                return {
                    title: "Letzte Mahnung",
                    intro: <>die offene Forderung aus Rechnung Nr. <span style={{ fontWeight: 'bold' }}>{invoice.invoiceNumber}</span> vom <span style={{ fontWeight: 'bold' }}>{formatDate(invoice.issueDate)}</span> wurde trotz mehrfacher Aufforderung nicht beglichen.</>,
                    amountText: "Der neue ausstehende Betrag beläuft sich auf:",
                    closing: <>Hiermit setzen wir Sie darüber in Kenntnis, dass die Angelegenheit nun an unseren Rechtsbeistand zur Einleitung des gerichtlichen Mahnverfahrens übergeben wird. Alle damit verbundenen weiteren Kosten gehen zu Ihren Lasten. Eine letzte Möglichkeit zur Abwendung besteht in der umgehenden Zahlung des Gesamtbetrags bis zum <span style={{ fontWeight: 'bold' }}>{calculateDeadline()}</span>.</>,
                    final: ""
                };
            default:
                return { title: "", intro: "" as any, amountText: "", closing: "" as any, final: "" };
        }
    };

    const content = getContent();

    return (
        <div ref={ref} style={{
            width: '210mm',
            height: '297mm',
            flexShrink: 0,
            padding: '40px 75px 30px 75px',
            backgroundColor: 'white',
            color: '#000',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '12pt',
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
                        <img src={logoSrc} alt="Logo" style={{ maxHeight: '70px', maxWidth: '280px', objectFit: 'contain' }} />
                    ) : (
                        <>
                            <div style={{ fontSize: '28pt', fontWeight: 900, fontStyle: 'italic', color: '#111', letterSpacing: '-1px' }}>
                                <span style={{ color: '#f43f5e', marginRight: '4px' }}>//</span>{companySettings.companyName.toUpperCase()}
                            </div>
                            <div style={{ color: '#f43f5e', fontSize: '11pt', fontWeight: 'bold', marginTop: '-4px' }}>Ihr Partner für Bauprojekte</div>
                        </>
                    )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '10pt', color: '#444', borderTop: '1px solid #ddd', paddingTop: '8px', minWidth: '320px', lineHeight: '1.5' }}>
                    {companySettings.street} | {companySettings.zipCode} {companySettings.city}<br />
                    {companySettings.email} | Tel.: {companySettings.phone}
                </div>
            </div>

            {/* Recipient & Meta */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '60px', marginTop: '30px', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '12pt', lineHeight: '1.5' }}>
                    {customer?.type === 'business' ? (
                        <>{customer.name}</>
                    ) : (
                        <>{customer?.salutation || 'Herr'}<br />{customer?.name}</>
                    )}
                    <br />
                    {customer?.address.street}<br />
                    {customer?.address.zip} {customer?.address.city}<br />
                    Österreich
                </div>
                <div style={{ textAlign: 'right', fontSize: '12pt', lineHeight: '1.5' }}>
                    <div style={{ marginBottom: '4px' }}><span style={{ fontWeight: 'bold' }}>Datum:</span> {formatDate(dunningDate)}</div>
                    <div><span style={{ fontWeight: 'bold' }}>Rechnungs-Nr.:</span> {invoice.invoiceNumber}</div>
                </div>
            </div>

            {/* Title */}
            <div style={{ fontSize: '18pt', fontWeight: 'bold', marginBottom: '30px' }}>
                {content.title}
            </div>

            {/* Intro */}
            <div style={{ marginBottom: '20px' }}>
                Sehr geehrte/r Damen und Herren,
            </div>
            <div style={{ marginBottom: '30px' }}>
                {content.intro}
            </div>

            {/* Amount Section */}
            <div style={{ marginBottom: '20px' }}>
                {content.amountText}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '16pt', fontWeight: 'bold' }}>€ {newTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</div>
                {fee > 0 && (
                    <div style={{ fontSize: '11pt', marginTop: '5px' }}>(inkl. € {fee.toLocaleString('de-DE', { minimumFractionDigits: 2 })} Mahngebühr)</div>
                )}
            </div>

            {/* Closing */}
            <div style={{ marginTop: '20px', marginBottom: '30px' }}>
                {content.closing}
            </div>

            {content.final && (
                <div style={{ marginBottom: '30px' }}>
                    {content.final}
                </div>
            )}

            {/* Payment Details */}
            <div style={{ marginTop: 'auto', marginBottom: '50px', textAlign: 'center', fontSize: '12pt' }}>
                <div><span style={{ fontWeight: 'bold' }}>IBAN:</span> {companySettings.iban}</div>
                <div style={{ marginTop: '5px' }}><span style={{ fontWeight: 'bold' }}>Verwendungszweck:</span> Rechnungs-Nr: {invoice.invoiceNumber}</div>
            </div>

            {/* Signature */}
            <div style={{ fontSize: '12pt', marginBottom: '40px' }}>
                Mit freundlichen Grüßen<br /><br />
                <div style={{ fontWeight: 'bold' }}>{companySettings.ceoFirstName} {companySettings.ceoLastName}</div>
                <div>Geschäftsführer</div>
            </div>


            {/* Footer */}
            <div style={{ paddingTop: '10px', marginTop: 'auto' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10pt', textAlign: 'center', marginBottom: '15px' }}>Zahlungskondition: sofort nach Rechnungserhalt</div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '9pt', color: '#444' }}>
                    <div style={{ width: '30%' }}>
                        <span style={{ fontWeight: 'bold', color: '#000' }}>Firmenbuchgericht:</span> {companySettings.commercialCourt || 'Graz'}<br />
                        <span style={{ fontWeight: 'bold', color: '#000' }}>Firmenbuch-Nr.:</span> {companySettings.commercialRegisterNumber || '-'}
                    </div>
                    <div style={{ width: '35%', textAlign: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#000' }}>Bank:</span> {companySettings.bankName}<br />
                        <span style={{ fontWeight: 'bold', color: '#000' }}>IBAN:</span> {companySettings.iban}
                    </div>
                    <div style={{ width: '30%', textAlign: 'right' }}>
                        <span style={{ fontWeight: 'bold', color: '#000' }}>BIC:</span> {companySettings.bic}<br />
                        <span style={{ fontWeight: 'bold', color: '#000' }}>UID-Nr:</span> {companySettings.vatId}
                    </div>
                </div>
            </div>
        </div>
    );
});

DunningPDF.displayName = "DunningPDF";
