import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Offer, OfferSettings } from '@/types/offer';
import { CompanyData } from '@/types/company';
import { Customer } from '@/types/customer';

const styles = StyleSheet.create({
    page: {
        paddingTop: 48,
        paddingBottom: 25,
        paddingLeft: 50,
        paddingRight: 50,
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#000000',
        lineHeight: 1.3,
    },

    // ─── Header ─────────────────────────────────────
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 35,
    },
    logoImg: {
        maxHeight: 72,
        maxWidth: 260,
        objectFit: 'contain',
        alignSelf: 'flex-start',
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
        textAlign: 'right',
        fontSize: 10,
        color: '#333333',
        borderTopWidth: 0.5,
        borderTopColor: '#111111',
        paddingTop: 8,
        maxWidth: 240,
        lineHeight: 1.25,
        alignSelf: 'center',
    },

    // ─── Recipient ───────────────────────────────────
    recipientSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: 24,
        marginBottom: 14,
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
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    zusatzCol1: {
        width: '25%',
    },
    zusatzCol2: {
        width: '25%',
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

    // ─── Intro text ──────────────────────────────────
    introText: {
        fontSize: 10,
        lineHeight: 1.55,
        marginBottom: 16,
        color: '#222222',
    },

    // ─── Offer title ─────────────────────────────────
    offerTitle: {
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
        paddingTop: 6,
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
        borderTopWidth: 1,
        borderTopColor: '#000000',
        marginTop: 2,
    },

    // ─── Validity block ───────────────────────────────
    validityBlock: {
        fontSize: 9.5,
        lineHeight: 1.7,
        marginBottom: 20,
        backgroundColor: '#f8f8f8',
        borderRadius: 4,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 14,
        paddingRight: 14,
    },
    validityBold: {
        fontFamily: 'Helvetica-Bold',
    },

    // ─── Signature ───────────────────────────────────
    signatureSection: {
        fontSize: 10,
        lineHeight: 1.4,
        flexGrow: 1,
    },
    signatureName: {
        fontFamily: 'Helvetica-Bold',
        marginTop: 13,
    },

    // ─── Footer ──────────────────────────────────────
    validityLine: {
        textAlign: 'center',
        fontFamily: 'Helvetica-Bold',
        fontSize: 8,
        marginBottom: 8,
    },
    footerGrid: {
        borderTopWidth: 0.5,
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

interface OfferReactPDFProps {
    offer: Offer;
    customer?: Customer;
    companySettings: CompanyData;
    offerSettings?: OfferSettings;
}

export const OfferReactPDF: React.FC<OfferReactPDFProps> = ({ offer, customer, companySettings, offerSettings }) => {
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('de-DE') : '-';
    const isRC = offer.isReverseCharge || (customer?.type === 'business' && (customer as any)?.reverseChargeEnabled);
    const ceoName = `${companySettings.ceoFirstName || ''} ${companySettings.ceoLastName || ''}`.trim();
    const processor = (offer.processor && offer.processor !== 'Max Mustermann') ? offer.processor : ceoName || '-';

    const getSalutation = () => {
        if (customer?.type === 'business') return 'Sehr geehrte Damen und Herren,';
        const lastName = customer?.name?.split(' ').pop() || '';
        if (customer?.salutation === 'Frau') return `Sehr geehrte Frau ${lastName},`;
        if (customer?.salutation === 'Herr') return `Sehr geehrter Herr ${lastName},`;
        return 'Sehr geehrte Damen und Herren,'; // Fallback
    };

    return (
        <Document>
            <Page size="A4" style={styles.page}>

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

                {/* ── Zusatzinformationen (bereinigt) ── */}
                <View>
                    <View style={styles.zusatzBadge}>
                        <Text style={styles.zusatzBadgeText}>Zusatzinformationen</Text>
                    </View>
                    <View style={styles.zusatzGrid}>
                        {/* Col 1: Baustelle + Gültig bis */}
                        <View style={styles.zusatzCol1}>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabelWide}>Baustelle:</Text>
                                <Text style={styles.infoVal}>{offer.constructionProject || customer?.address?.street || '-'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabelWide}>Gültig bis:</Text>
                                <Text style={styles.infoVal}>{offer.validUntil ? fmt(offer.validUntil) : `${offerSettings?.defaultValidityDays || 20} Tage ab Ausstellungsdatum`}</Text>
                            </View>
                        </View>
                        {/* Col 2: Datum + Bearbeiter */}
                        <View style={styles.zusatzCol2}>
                            {([
                                ['Datum:', fmt(offer.issueDate)],
                                ['Bearbeiter:', processor],
                            ] as [string, string][]).map(([label, value]) => (
                                <View key={label} style={styles.infoRow}>
                                    <Text style={styles.infoLabelShort}>{label}</Text>
                                    <Text style={styles.infoVal}>{value}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ── Offer title ── */}
                <Text style={styles.offerTitle}>
                    {`Angebots-Nr.: ${offer.offerNumber}`}
                    {offer.subjectExtra ? ` // ${offer.subjectExtra}` : ''}
                </Text>

                {/* ── Intro Text ── */}
                <Text style={styles.introText}>
                    {getSalutation() + '\n\n'}
                    {offer.introText || ''}
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
                        return offer.items.map((item) => {
                            const isTitle = item.itemType === 'title' || (!item.itemType && (item as any).isTitleOnly);
                            if (!isTitle) pos++;
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
                            <Text>Nettobetrag:</Text>
                            <Text style={styles.summaryBold}>
                                {'€ ' + offer.subtotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text>{isRC ? '0% USt.:' : `${offer.taxRate}% USt.:`}</Text>
                            <Text style={styles.summaryBold}>
                                {'€ ' + offer.taxAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                        <View style={styles.summaryTotalRow}>
                            <Text>Angebotssumme:</Text>
                            <Text>
                                {'€ ' + offer.totalAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Signature ── */}
                <View style={styles.signatureSection}>
                    <Text>Mit freundlichen Grüßen</Text>
                    <Text style={styles.signatureName}>{ceoName}</Text>
                    <Text>Geschäftsführer</Text>
                </View>

                {/* ── Footer ── */}
                <View wrap={false}>
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
