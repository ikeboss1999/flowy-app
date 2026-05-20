import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { Letter } from '@/types/letter';
import { CompanyData } from '@/types/company';

const styles = StyleSheet.create({
    page: {
        paddingTop: 48,
        paddingBottom: 40,
        paddingLeft: 50,
        paddingRight: 50,
        backgroundColor: '#ffffff',
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#000000',
        lineHeight: 1.45,
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
        color: '#6366f1', // Indigo color for FlowY
    },
    companyTagline: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#6366f1',
        marginTop: 3,
    },
    headerAddress: {
        textAlign: 'right',
        fontSize: 9,
        color: '#444444',
        borderTopWidth: 0.5,
        borderTopColor: '#111111',
        paddingTop: 8,
        maxWidth: 240,
        lineHeight: 1.3,
    },

    // ─── Sender Underline & Recipient ───────────────────
    recipientArea: {
        marginTop: 15,
        marginBottom: 40,
        width: 280,
    },
    senderShortLine: {
        fontSize: 7.5,
        color: '#777777',
        borderBottomWidth: 0.5,
        borderBottomColor: '#bbbbbb',
        paddingBottom: 3,
        marginBottom: 8,
    },
    recipientText: {
        fontSize: 10.5,
        lineHeight: 1.4,
    },

    // ─── Date & Place ──────────────────────────────────
    datePlaceRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 25,
        fontSize: 9.5,
        color: '#333333',
    },

    // ─── Subject ──────────────────────────────────────
    subject: {
        fontSize: 12,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 20,
        color: '#111111',
    },

    // ─── Salutation & Body ─────────────────────────────
    salutation: {
        fontSize: 10,
        marginBottom: 12,
    },
    bodyText: {
        fontSize: 10,
        lineHeight: 1.5,
        marginBottom: 10,
    },
    paragraph: {
        marginBottom: 14,
    },

    // ─── Sign-Off ─────────────────────────────────────
    signOffSection: {
        marginTop: 25,
        fontSize: 10,
        lineHeight: 1.4,
    },
    signatureSpace: {
        height: 40,
    },
    companySignatureName: {
        fontFamily: 'Helvetica-Bold',
    },

    // ─── Footer ──────────────────────────────────────
    footerGrid: {
        position: 'absolute',
        bottom: 25,
        left: 50,
        right: 50,
        borderTopWidth: 0.5,
        borderTopColor: '#cccccc',
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        fontSize: 7.5,
        color: '#555555',
    },
    footerColLeft: { width: '33%' },
    footerColCenter: { width: '34%', textAlign: 'center' },
    footerColRight: { width: '33%', textAlign: 'right' },
    footerBold: { fontFamily: 'Helvetica-Bold', color: '#000000' },
});

interface LetterReactPDFProps {
    letter: Letter;
    companySettings: CompanyData;
}

export const LetterReactPDF: React.FC<LetterReactPDFProps> = ({ letter, companySettings }) => {
    const ceoName = `${companySettings.ceoFirstName || ''} ${companySettings.ceoLastName || ''}`.trim();
    const senderShort = `${companySettings.companyName || 'FlowY'}, ${companySettings.street || ''}, ${companySettings.zipCode || ''} ${companySettings.city || ''}`;

    // Split letter body text into paragraphs to render them properly
    const paragraphs = letter.bodyText ? letter.bodyText.split('\n') : [''];

    const formattedDate = letter.date 
        ? new Date(letter.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('de-DE');

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
                                <Text style={styles.companyTagline}>Ihr Partner für Service & Logistik</Text>
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

                {/* ── Recipient Area ── */}
                <View style={styles.recipientArea}>
                    <Text style={styles.senderShortLine}>{senderShort}</Text>
                    <Text style={styles.recipientText}>{letter.recipientName}</Text>
                    {letter.recipientAddress.split('\n').map((line, idx) => (
                        <Text key={idx} style={styles.recipientText}>{line}</Text>
                    ))}
                </View>

                {/* ── Date & Place ── */}
                <View style={styles.datePlaceRow}>
                    <Text>{letter.city}, am {formattedDate}</Text>
                </View>

                {/* ── Subject ── */}
                <View style={styles.subject}>
                    <Text>{letter.subject}</Text>
                </View>

                {/* ── Salutation ── */}
                <View style={styles.salutation}>
                    <Text>{letter.salutation}</Text>
                </View>

                {/* ── Body Text ── */}
                <View style={styles.bodyText}>
                    {paragraphs.map((para, idx) => (
                        <Text key={idx} style={styles.paragraph}>{para}</Text>
                    ))}
                </View>

                {/* ── Sign-Off ── */}
                <View style={styles.signOffSection} wrap={false}>
                    <Text>{letter.signOff}</Text>
                    <View style={styles.signatureSpace} />
                    <Text style={styles.companySignatureName}>{companySettings.companyName || 'FlowY'}</Text>
                    {ceoName ? <Text style={{ color: '#555555', fontSize: 9 }}>Vertreten durch {ceoName}</Text> : null}
                </View>

                {/* ── Footer ── */}
                <View style={styles.footerGrid} wrap={false}>
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
                            {companySettings.bankName || '-'}
                        </Text>
                        <Text>
                            <Text style={styles.footerBold}>{'IBAN: '}</Text>
                            {companySettings.iban || '-'}
                        </Text>
                    </View>
                    <View style={styles.footerColRight}>
                        <Text>
                            <Text style={styles.footerBold}>{'BIC: '}</Text>
                            {companySettings.bic || '-'}
                        </Text>
                        <Text>
                            <Text style={styles.footerBold}>{'UID: '}</Text>
                            {companySettings.vatId || '-'}
                        </Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};
