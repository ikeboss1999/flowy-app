import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Invoice } from '@/types/invoice';
import { CompanyData } from '@/types/company';
import { Customer } from '@/types/customer';

const styles = StyleSheet.create({
    page: {
        paddingTop: 38,
        paddingBottom: 70,
        paddingLeft: 50,
        paddingRight: 50,
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#000000',
        lineHeight: 1.3,
    },
    draftWatermark: {
        position: 'absolute',
        top: 360,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 82,
        fontFamily: 'Helvetica-Bold',
        color: '#94a3b8',
        opacity: 0.22,
        transform: 'rotate(-32deg)',
    },

    // ─── Header ─────────────────────────────────────
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    logoImg: {
        maxHeight: 72,       // ← Logo-HÖHE  (pt, 1mm ≈ 2.83pt)
        maxWidth: 260,       // ← Logo-BREITE
        objectFit: 'contain',
        alignSelf: 'flex-start',
        marginLeft: 0,       // ← Abstand vom linken Seitenrand (zusätzlich zu paddingLeft)
        marginTop: 0,        // ← Abstand vom oberen Seitenrand (zusätzlich zu paddingTop)
    },
    companyName: {
        fontSize: 22,
        fontFamily: 'Helvetica-BoldOblique',
        letterSpacing: -0.3,
        color: '#111111',
    },
    companySlash: {
        color: '#f43f5e',
    },
    companyTagline: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#f43f5e',
        marginTop: 3,
    },
    headerAddress: {
        textAlign: 'right',      // ← rechtsbündig (nicht ändern)
        fontSize: 10,
        color: '#333333',
        borderTopWidth: 0.5,     // ← Linienstärke (z.B. 0.5 = sehr dünn, 2 = dick)
        borderTopColor: '#111111',
        paddingTop: 8,           // ← Abstand zwischen Linie und Text
        maxWidth: 240,
        lineHeight: 1.25,
        alignSelf: 'center',     // ← vertikal mittig neben dem Logo
    },

    // ─── Recipient ───────────────────────────────────
    recipientSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 14,
        marginBottom: 12,
    },
    recipientText: {
        fontSize: 10,
        lineHeight: 1.45,
    },
    pageLabel: {
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
    },

    // ─── Zusatzinformationen ─────────────────────────
    zusatzBadge: {
        backgroundColor: '#111111',
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 16,
        paddingRight: 16,
        borderRadius: 3,
        marginBottom: 11,
        alignSelf: 'flex-start',
    },
    zusatzBadgeText: {
        color: '#ffffff',
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
    },
    zusatzGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',   // FIX: col2 wird an den rechten Rand gedrückt
        marginBottom: 14,
    },
    zusatzCol1: {
        width: '55%',
    },
    zusatzCol2: {
        width: '28%',   // FIX: schmalere Col2 + space-between = weiter rechts
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 3,
        fontSize: 9,
    },
    infoLabelWide: {
        fontFamily: 'Helvetica-Bold',
        width: 90,
        flexShrink: 0,
    },
    infoLabelShort: {
        fontFamily: 'Helvetica-Bold',
        width: 60,
        flexShrink: 0,
    },
    infoVal: {},

    // ─── Invoice title ───────────────────────────────
    invoiceTitle: {
        fontSize: 13,
        fontFamily: 'Helvetica-Bold',
        marginTop: 2,
        marginBottom: 13,
        color: '#000000',
    },

    // ─── Table ──────────────────────────────────────
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#111111',
        paddingTop: 9,
        paddingBottom: 9,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eeeeee',
        paddingTop: 6,    // FIX: kleiner Zeilenabstand
        paddingBottom: 6,
    },
    cPos: { width: '7%', textAlign: 'center', paddingLeft: 2, paddingRight: 2 },
    cDesc: { width: '41%', paddingLeft: 8 },
    cUnit: { width: '10%', textAlign: 'center' },
    cQty: { width: '10%', textAlign: 'center' },
    cPrice: { width: '16%', textAlign: 'right', paddingRight: 8 },
    cTotal: { width: '16%', textAlign: 'right', paddingRight: 8 },
    thText: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
    tdText: { fontSize: 9.5, color: '#333333' },
    tdBold: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#000000' },

    // ─── Summary ─────────────────────────────────────
    summaryOuter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 5,
        marginBottom: 16,
    },
    reverseChargeNote: {
        width: '55%',
        fontSize: 8,
        fontFamily: 'Helvetica-Bold',
        paddingTop: 8,
    },
    summaryBox: {
        width: 218,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 3,
        paddingBottom: 3,
        fontSize: 10,
    },
    summaryBold: {
        fontFamily: 'Helvetica-Bold',
    },
    summaryTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 6,
        paddingBottom: 6,
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        borderTopWidth: 1,          // FIX: dünner (war 2)
        borderTopColor: '#000000',
        marginTop: 2,               // FIX: näher an USt-Zeile (war 5)
    },

    // ─── Payment block ───────────────────────────────
    paymentBlock: {
        textAlign: 'center',
        fontSize: 9.5,
        lineHeight: 1.7,
        marginBottom: 14,
    },
    paymentRed: {
        color: '#f43f5e',
        fontFamily: 'Helvetica-Bold',
    },
    paymentBold: {
        fontFamily: 'Helvetica-Bold',
    },

    // ─── Signature ───────────────────────────────────
    signatureSection: {
        fontSize: 10,
        lineHeight: 1.4,    // FIX: enger (war 1.6)
        marginBottom: 10,
    },
    signatureName: {
        fontFamily: 'Helvetica-Bold',
    },

    // ─── Footer ──────────────────────────────────────
    paymentTermLine: {
        textAlign: 'center',
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,        // FIX: deutlichst kleiner (war 9)
        marginBottom: 8,
    },
    footer: {
        position: 'absolute',
        left: 50,
        right: 50,
        bottom: 34,
    },
    footerGrid: {
        borderTopWidth: 0.5,    // FIX: dünner (war 1)
        borderTopColor: '#000000',
        paddingTop: 7,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 7.5,
        color: '#444444',
    },
    footerColLeft: { width: '33%' },
    footerColCenter: { width: '34%', textAlign: 'center' },
    footerColRight: { width: '33%', textAlign: 'right' },
    footerBold: { fontFamily: 'Helvetica-Bold', color: '#000000' },
});

interface InvoiceReactPDFProps {
    invoice: Invoice;
    customer?: Customer;
    companySettings: CompanyData;
}

export const InvoiceReactPDF: React.FC<InvoiceReactPDFProps> = ({ invoice, customer, companySettings }) => {
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('de-DE') : '-';
    const isRC = invoice.isReverseCharge === true;
    const ceoName = `${companySettings.ceoFirstName || ''} ${companySettings.ceoLastName || ''}`.trim();
    const processor = (invoice.processor && invoice.processor !== 'Max Mustermann') ? invoice.processor : ceoName || '-';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {invoice.status === 'draft' && (
                    <Text fixed style={styles.draftWatermark}>ENTWURF</Text>
                )}

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        {companySettings.logo ? (
                            <Image src={companySettings.logo} style={styles.logoImg} />
                        ) : (
                            <View>
                                <Text style={styles.companyName}>
                                    <Text style={styles.companySlash}>//</Text>
                                    {(companySettings.companyName || 'FIRMA').toUpperCase()}
                                </Text>
                                <Text style={styles.companyTagline}>Ihr Partner für Bauprojekte</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.headerAddress}>
                        <Text>
                            {companySettings.street} | {companySettings.zipCode} {companySettings.city}
                        </Text>
                        <Text>
                            {companySettings.email} | Tel.: {companySettings.phone}
                        </Text>
                    </View>
                </View>

                {/* ── Recipient ── */}
                <View style={styles.recipientSection}>
                    <View style={styles.recipientText}>
                        {customer?.type === 'business' ? (
                            <Text>
                                {'Firma\n'}
                                {(customer.name || '') + '\n'}
                                {(customer.address?.street || '') + '\n'}
                                {(customer.address?.zip || '') + ' ' + (customer.address?.city || '')}
                            </Text>
                        ) : (
                            <Text>
                                {(customer?.salutation || 'Herr') + '\n'}
                                {(customer?.name || '') + '\n'}
                                {(customer?.address?.street || '') + '\n'}
                                {(customer?.address?.zip || '') + ' ' + (customer?.address?.city || '')}
                            </Text>
                        )}
                    </View>
                    <Text style={styles.pageLabel}>Seite 1</Text>
                </View>

                {/* ── Zusatzinformationen ── */}
                <View>
                    <View style={styles.zusatzBadge}>
                        <Text style={styles.zusatzBadgeText}>Zusatzinformationen</Text>
                    </View>
                    <View style={styles.zusatzGrid}>
                        <View style={styles.zusatzCol1}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabelWide}>Baustelle:</Text>
                                <Text style={styles.infoVal}>{invoice.constructionProject || customer?.address?.street || '-'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabelWide}>Leistungszeitraum:</Text>
                                <Text style={styles.infoVal}>
                                    {invoice.performancePeriod?.from
                                        ? `${fmt(invoice.performancePeriod.from)} - ${fmt(invoice.performancePeriod.to || '')}`
                                        : '-'}
                                </Text>
                            </View>
                            {customer?.type === 'business' && (customer as any).taxId && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabelWide}>UID-Nummer:</Text>
                                    <Text style={styles.infoVal}>{(customer as any).taxId}</Text>
                                </View>
                            )}
                            {isRC && companySettings.employerNumber && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabelWide}>Dienstgebernr.:</Text>
                                    <Text style={styles.infoVal}>{companySettings.employerNumber}</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.zusatzCol2}>
                            {([
                                ['Datum:', fmt(invoice.issueDate)],
                                ['Bearbeiter:', processor],
                                ['E-Mail:', companySettings.email || '-'],
                                ['Telefon:', companySettings.phone || '-'],
                            ] as [string, string][]).map(([label, value]) => (
                                <View key={label} style={styles.infoRow}>
                                    <Text style={styles.infoLabelShort}>{label}</Text>
                                    <Text style={styles.infoVal}>{value}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ── Invoice title ── */}
                <Text style={styles.invoiceTitle}>
                    {invoice.billingType === 'partial'
                        ? `${invoice.partialPaymentNumber || '1'}. Teilrechnungs-Nr.: ${invoice.invoiceNumber}`
                        : invoice.billingType === 'final'
                            ? `Schlussrechnungs-Nr.: ${invoice.invoiceNumber}`
                            : `Rechnungs-Nr.: ${invoice.invoiceNumber}`
                    }{invoice.subjectExtra ? ` // ${invoice.subjectExtra}` : ''}
                </Text>

                {/* ── Table ── */}
                <View>
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.cPos, styles.thText]}>Pos.</Text>
                        <Text style={[styles.cDesc, styles.thText]}>Bezeichnung</Text>
                        <Text style={[styles.cUnit, styles.thText]}>Einheit</Text>
                        <Text style={[styles.cQty, styles.thText]}>Menge</Text>
                        <Text style={[styles.cPrice, styles.thText]}>Einzelpreis</Text>
                        <Text style={[styles.cTotal, styles.thText]}>Gesamt</Text>
                    </View>
                    {(() => {
                        let pos = 0;
                        return invoice.items.map((item) => {
                            const isTitle = item.itemType === 'title' || (!item.itemType && (item as any).isTitleOnly);
                            const isInfo = item.itemType === 'info';
                            if (!isTitle && !isInfo) pos++;
                            if (isTitle) {
                                return (
                                    <View key={item.id} style={[styles.tableRow, { backgroundColor: '#f5f5f5' }]}>
                                        <Text style={[styles.cPos, styles.tdText, { color: '#aaaaaa' }]}>—</Text>
                                        <View style={{ width: '93%', paddingLeft: 8 }}>
                                            <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#111111' }}>
                                                {item.title || item.description}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            }
                            if (isInfo) {
                                return (
                                    <View key={item.id} style={styles.tableRow}>
                                        <Text style={[styles.cPos, styles.tdText, { color: '#aaaaaa' }]}>—</Text>
                                        <View style={{ width: '93%', paddingLeft: 8 }}>
                                            <Text style={{ fontSize: 9.5, color: '#333333' }}>
                                                {item.description}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            }
                            return (
                                <View key={item.id} style={styles.tableRow}>
                                    <Text style={[styles.cPos, styles.tdText]}>{pos}</Text>
                                    <View style={styles.cDesc}>
                                        {item.title ? <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#000000' }}>{item.title}</Text> : null}
                                        {item.description ? <Text style={{ fontSize: 9, color: '#555555', marginTop: item.title ? 1 : 0 }}>{item.description}</Text> : null}
                                        {!item.title && !item.description ? <Text style={{ color: '#aaaaaa' }}>—</Text> : null}
                                    </View>
                                    <Text style={[styles.cUnit, styles.tdText]}>{item.unit === 'pauschal' ? 'PA' : item.unit}</Text>
                                    <Text style={[styles.cQty, styles.tdText]}>{item.quantity}</Text>
                                    <Text style={[styles.cPrice, styles.tdText]}>
                                        {'€ ' + (Number(item.pricePerUnit) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                    </Text>
                                    <Text style={[styles.cTotal, styles.tdBold]}>
                                        {'€ ' + (Number(item.totalPrice) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            );
                        });
                    })()}
                </View>

                {/* ── Summary ── */}
                <View style={styles.summaryOuter}>
                    <View style={styles.reverseChargeNote}>
                        {isRC && (
                            <Text>Übergang der Steuerschuld für Bauleistungen gem. §19 Abs. 1a UStG</Text>
                        )}
                    </View>
                    <View style={styles.summaryBox}>
                        <View style={styles.summaryRow}>
                            <Text>{invoice.billingType === 'final' ? 'Gesamtleistung Netto:' : 'Nettobetrag:'}</Text>
                            <Text style={styles.summaryBold}>
                                {'€ ' + invoice.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text>{isRC ? '0% USt.:' : `${invoice.taxRate}% USt.:`}</Text>
                            <Text style={styles.summaryBold}>
                                {'€ ' + invoice.taxAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                        <View style={styles.summaryTotalRow}>
                            <Text>{invoice.billingType === 'final' ? 'Rest-Zahlbetrag:' : 'Bruttobetrag:'}</Text>
                            <Text>
                                {'€ ' + invoice.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Payment block ── */}
                <View style={styles.paymentBlock}>
                    <Text>
                        {'Bitte überweisen Sie den Betrag von '}
                        <Text style={styles.paymentRed}>
                            {'€ ' + invoice.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                        </Text>
                        {' an die folgende IBAN mit dem angegebenen\nVerwendungszweck:'}
                    </Text>
                    <Text>
                        <Text style={styles.paymentBold}>{'IBAN: '}</Text>
                        {companySettings.iban}
                    </Text>
                    <Text>
                        <Text style={styles.paymentBold}>{'Verwendungszweck: '}</Text>
                        {'Rechnungs-Nr: ' + invoice.invoiceNumber}
                    </Text>
                </View>

                {/* ── Signature ── */}
                <View wrap={false} style={styles.signatureSection}>
                    <Text>
                        {'Mit freundlichen Grüßen\n\n'}
                        <Text style={styles.signatureName}>{ceoName}</Text>
                        {'\nGeschäftsführer'}
                    </Text>
                </View>

                {/* ── Footer — wrap=false verhindert Split auf Seite 2 ── */}
                <View fixed style={styles.footer}>
                    <Text style={styles.paymentTermLine}>
                        {'Zahlungskondition: ' + (invoice.paymentTerms || 'sofort nach Rechnungserhalt')}
                    </Text>
                    <View style={styles.footerGrid}>
                        <View style={styles.footerColLeft}>
                            <Text>
                                <Text style={styles.footerBold}>{'Firmenbuchgericht: '}</Text>
                                {companySettings.commercialCourt || '-'}
                            </Text>
                            <Text>
                                <Text style={styles.footerBold}>{'Firmenbuch-Nr.: '}</Text>
                                {companySettings.commercialRegisterNumber || '-'}
                            </Text>
                        </View>
                        <View style={styles.footerColCenter}>
                            <Text>
                                <Text style={styles.footerBold}>{'Bank: '}</Text>
                                {companySettings.bankName}
                            </Text>
                            <Text>
                                <Text style={styles.footerBold}>{'IBAN: '}</Text>
                                {companySettings.iban}
                            </Text>
                        </View>
                        <View style={styles.footerColRight}>
                            <Text>
                                <Text style={styles.footerBold}>{'BIC: '}</Text>
                                {companySettings.bic}
                            </Text>
                            <Text>
                                <Text style={styles.footerBold}>{'UID: '}</Text>
                                {companySettings.vatId || '-'}
                            </Text>
                        </View>
                    </View>
                </View>

            </Page>
        </Document>
    );
};
