import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CompanyData } from "@/types/company";
import { SubcontractorDescription } from "@/types/subcontractor-description";
import { richTextLines } from "@/lib/rich-text";

const styles = StyleSheet.create({
    page: { paddingTop: 38, paddingBottom: 25, paddingLeft: 50, paddingRight: 50, backgroundColor: "#fff", fontFamily: "Helvetica", fontSize: 10, color: "#000", lineHeight: 1.3 },
    logo: { maxHeight: 72, maxWidth: 260, objectFit: "contain", alignSelf: "flex-start" },
    companyName: { fontSize: 22, fontFamily: "Helvetica-BoldOblique", letterSpacing: -0.3, color: "#111" },
    companySlash: { color: "#f43f5e" },
    tagline: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#f43f5e", marginTop: 3 },
    headerAddress: { textAlign: "right", fontSize: 10, color: "#333", borderTopWidth: 0.5, borderTopColor: "#111", paddingTop: 8, maxWidth: 240, lineHeight: 1.25, alignSelf: "center" },
    recipient: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 14, marginBottom: 12 },
    recipientText: { fontSize: 10, lineHeight: 1.45 },
    badge: { backgroundColor: "#111", paddingTop: 5, paddingBottom: 5, paddingLeft: 16, paddingRight: 16, borderRadius: 3, marginBottom: 11, alignSelf: "flex-start" },
    badgeText: { color: "#fff", fontFamily: "Helvetica-Bold", fontSize: 10 },
    infoGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
    infoCol: { width: "45%" },
    infoColRight: { width: "32%" },
    infoRow: { flexDirection: "row", marginBottom: 3, fontSize: 9, alignItems: "flex-start" },
    infoLabel: { fontFamily: "Helvetica-Bold", width: 70, flexShrink: 0 },
    infoValue: { flex: 1 },
    title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2, marginBottom: 13 },
    intro: { fontSize: 10, lineHeight: 1.55, marginBottom: 16, color: "#222" },
    tableHeader: { flexDirection: "row", backgroundColor: "#111", paddingTop: 9, paddingBottom: 9 },
    tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#eee", paddingTop: 6, paddingBottom: 6 },
    pos: { width: "7%", textAlign: "center", paddingLeft: 2, paddingRight: 2 },
    desc: { width: "63%", paddingLeft: 8 },
    unit: { width: "15%", textAlign: "center" },
    qty: { width: "15%", textAlign: "right", paddingRight: 8 },
    th: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#fff" },
    td: { fontSize: 9.5, color: "#333" },
    tdBold: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#111" },
    notes: { backgroundColor: "#f8f8f8", borderRadius: 4, paddingTop: 10, paddingBottom: 10, paddingLeft: 14, paddingRight: 14, marginTop: 16, fontSize: 9.5, lineHeight: 1.5 },
    signature: { marginTop: 24, marginBottom: 18, fontSize: 10, lineHeight: 1.4, flexGrow: 1 },
    signatureName: { fontFamily: "Helvetica-Bold", marginTop: 22 },
    footer: { borderTopWidth: 0.5, borderTopColor: "#000", paddingTop: 7, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: "#444", marginTop: "auto" },
    footerCol: { width: "33%" },
    footerCenter: { width: "34%", textAlign: "center" },
    footerRight: { width: "33%", textAlign: "right" },
    footerBold: { fontFamily: "Helvetica-Bold", color: "#000" },
});

function RichText({ value }: { value: string }) {
    return <>{richTextLines(value).map((line, index) => <Text key={index} style={styles.td}>{line.map((segment, segmentIndex) => <Text key={segmentIndex} style={{ fontFamily: segment.bold && segment.italic ? "Helvetica-BoldOblique" : segment.bold ? "Helvetica-Bold" : segment.italic ? "Helvetica-Oblique" : "Helvetica", textDecoration: segment.underline ? "underline" : undefined }}>{segment.text}</Text>)}</Text>)}</>;
}

export function SubcontractorDescriptionReactPDF({ description, company }: { description: SubcontractorDescription; company: CompanyData }) {
    const formatDate = (value: string) => value ? new Date(value).toLocaleDateString("de-DE") : "-";
    const processor = description.processor || `${company.ceoFirstName || ""} ${company.ceoLastName || ""}`.trim() || "-";

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View fixed style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <View>{company.logo ? <Image src={company.logo} style={styles.logo} /> : <View><Text style={styles.companyName}><Text style={styles.companySlash}>//</Text>{(company.companyName || "FIRMA").toUpperCase()}</Text><Text style={styles.tagline}>Ihr Partner für Bauprojekte</Text></View>}</View>
                        <View style={styles.headerAddress}><Text>{company.street} | {company.zipCode} {company.city}</Text><Text>{company.email} | Tel.: {company.phone}</Text></View>
                    </View>
                    <View style={{ height: 30 }} />
                </View>
                <Text fixed style={{ position: "absolute", top: 125, left: 50, fontSize: 10, fontFamily: "Helvetica-Bold" }} render={(props: any) => props.pageNumber > 1 ? `Leistungsbeschreibung Nr.: ${description.documentNumber}` : ""} />
                <Text fixed style={{ position: "absolute", top: 125, right: 50, fontSize: 10, fontFamily: "Helvetica-Bold" }} render={(props: any) => props.pageNumber > 1 ? `Seite ${props.pageNumber} von ${props.totalPages}` : ""} />
                <Text fixed style={{ position: "absolute", top: 179, right: 50, fontSize: 10, fontFamily: "Helvetica-Bold" }} render={(props: any) => props.pageNumber === 1 ? `Seite ${props.pageNumber} von ${props.totalPages}` : ""} />

                <View style={styles.recipient}><View style={styles.recipientText}><Text>{"Firma\n"}{description.subcontractorName || "-"}{"\n"}{description.subcontractorStreet || ""}{"\n"}{[description.subcontractorZip, description.subcontractorCity].filter(Boolean).join(" ")}</Text></View></View>
                <View>
                    <View style={styles.badge}><Text style={styles.badgeText}>Zusatzinformationen</Text></View>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoCol}><View style={styles.infoRow}><Text style={styles.infoLabel}>Bauvorhaben:</Text><Text style={styles.infoValue}>{description.constructionProject || "-"}</Text></View>{description.showCustomer && <View style={styles.infoRow}><Text style={styles.infoLabel}>Kunde:</Text><Text style={styles.infoValue}>{description.customerName || "-"}</Text></View>}</View>
                        <View style={styles.infoColRight}><View style={styles.infoRow}><Text style={styles.infoLabel}>Datum:</Text><Text style={styles.infoValue}>{formatDate(description.issueDate)}</Text></View><View style={styles.infoRow}><Text style={styles.infoLabel}>Bearbeiter:</Text><Text style={styles.infoValue}>{processor}</Text></View></View>
                    </View>
                </View>
                <Text style={styles.title}>Leistungsbeschreibung Nr.: {description.documentNumber}</Text>
                <Text style={styles.intro}>{description.introText || "Bitte führen Sie die nachfolgend angeführten Leistungen gemäß Vereinbarung aus."}</Text>
                <View><View style={styles.tableHeader}><Text style={[styles.pos, styles.th]}>Pos.</Text><Text style={[styles.desc, styles.th]}>Bezeichnung</Text><Text style={[styles.unit, styles.th]}>Einheit</Text><Text style={[styles.qty, styles.th]}>Menge</Text></View>{description.items.map((item, index) => { const isTitle = item.itemType === "title"; return <View key={`${index}-${item.id}`} wrap={false} style={[styles.tableRow, isTitle ? { backgroundColor: "#f5f5f5" } : {}]}><Text style={[styles.pos, styles.td, { color: isTitle ? "#aaa" : "#333" }]}>{isTitle ? "—" : index + 1}</Text><View style={styles.desc}>{isTitle ? <Text style={styles.tdBold}>{item.title || item.description}</Text> : <RichText value={item.description || item.title || "Leistung"} />}</View><Text style={[styles.unit, styles.td]}>{isTitle ? "" : item.unit || ""}</Text><Text style={[styles.qty, styles.td]}>{isTitle ? "" : item.quantity ?? ""}</Text></View>; })}</View>
                {description.notes && <View wrap={false} style={styles.notes}><Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>Hinweise / Ausführungsdetails</Text><Text>{description.notes}</Text></View>}
                <View wrap={false} style={styles.signature}><Text>Mit freundlichen Grüßen</Text><Text style={styles.signatureName}>{processor}</Text><Text>Geschäftsführer</Text></View>
                <View wrap={false}><View style={styles.footer}><View style={styles.footerCol}><Text><Text style={styles.footerBold}>Firmenbuchgericht: </Text>{company.commercialCourt || "-"}</Text><Text><Text style={styles.footerBold}>Firmenbuch-Nr.: </Text>{company.commercialRegisterNumber || "-"}</Text></View><View style={styles.footerCenter}><Text><Text style={styles.footerBold}>Bank: </Text>{company.bankName || "-"}</Text><Text><Text style={styles.footerBold}>IBAN: </Text>{company.iban || "-"}</Text></View><View style={styles.footerRight}><Text><Text style={styles.footerBold}>BIC: </Text>{company.bic || "-"}</Text><Text><Text style={styles.footerBold}>UID: </Text>{company.vatId || "-"}</Text></View></View></View>
            </Page>
        </Document>
    );
}
