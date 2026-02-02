export interface CompanyData {
    // Firmendaten & Logo
    logo?: string;
    companyName: string;
    email?: string;

    // Adresse
    street: string;
    zipCode: string;
    city: string;
    country: string;

    // Geschäftsführung
    ceoFirstName: string;
    ceoLastName: string;

    // Kontakt & Steuern
    phone: string;
    website?: string;
    vatId?: string;
    commercialRegisterNumber?: string;
    commercialCourt?: string;
    employerNumber?: string;

    // Bankverbindung
    bankName: string;
    bic: string;
    iban: string;
}
