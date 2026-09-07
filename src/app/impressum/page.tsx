import content from '../../../content/public-site.json';
import { LegalPageLayout } from '@/components/public/LegalPageLayout';

export default function ImpressumPage() {
    const company = content.company;
    return <LegalPageLayout title="Impressum" subtitle="Informationen gemäß § 5 ECG, § 14 UGB, § 63 GewO und Offenlegung gemäß § 25 MedienG.">
        <article className="border-amber-400/20 bg-amber-400/[0.06]"><h2 className="text-amber-300">Musterangaben – vor Veröffentlichung ersetzen</h2><p>{content.editingNote}</p></article>
        <article><h2>Diensteanbieter und Medieninhaber</h2><p><strong className="text-white">{company.legalName}</strong><br />Inhaber: {company.ownerName}<br />{company.street}<br />{company.postalCode} {company.city}<br />{company.country}</p></article>
        <article><h2>Kontakt</h2><p>Telefon: <a href={`tel:${company.phone.replace(/\s/g, '')}`}>{company.phone}</a><br />E-Mail: <a href={`mailto:${company.email}`}>{company.email}</a></p></article>
        <article><h2>Unternehmensangaben</h2><ul><li>UID-Nummer: {company.vatId}</li><li>Firmenbuchnummer: {company.companyRegisterNumber}</li><li>Firmenbuchgericht: {company.companyRegisterCourt}</li><li>Gewerbebehörde: {company.tradeAuthority}</li><li>Mitgliedschaft: {company.chamber}</li><li>Fachgruppe: {company.professionalGroup}</li></ul><p className="mt-4">Anwendbare gewerberechtliche Vorschriften sind insbesondere über das <a href="https://www.ris.bka.gv.at/" target="_blank" rel="noreferrer">Rechtsinformationssystem des Bundes</a> abrufbar.</p></article>
        <article><h2>Unternehmensgegenstand</h2><p>{company.businessPurpose}</p></article>
        <article><h2>Offenlegung gemäß § 25 MedienG</h2><p>Medieninhaber und Herausgeber: {company.mediaOwner}, Anschrift wie oben.<br />Grundlegende Richtung des Mediums: {company.mediaDirection}.</p></article>
        <article><h2>Haftung und Urheberrecht</h2><p>Die Inhalte dieser Website werden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität kann dennoch keine uneingeschränkte Gewähr übernommen werden. Verlinkte externe Inhalte liegen in der Verantwortung ihrer jeweiligen Betreiber.</p><p className="mt-4">Inhalte, Gestaltung und Softwarebestandteile dieser Website sind urheberrechtlich geschützt. Jede Nutzung außerhalb der gesetzlichen Grenzen bedarf der vorherigen Zustimmung des jeweiligen Rechteinhabers.</p></article>
    </LegalPageLayout>;
}
