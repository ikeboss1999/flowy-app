export type EmploymentStatus = "Vollzeit" | "Teilzeit" | "Minijob" | "Werkstudent" | "Auszubildender" | "Freelancer";

export interface EmployeeDocument {
    id: string;
    name: string;
    type: string;
    uploadDate: string;
    fileSize?: string;
    content?: string; // Base64 string for system-generated files
    category?: 'system' | 'upload';
    subType?: string; // e.g., 'passport', 'id_card', 'meldezettel', etc.
}

export interface Employee {
    id: string;
    employeeNumber: string;
    personalData: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        birthday: string;
        birthPlace: string;
        birthCountry: string;
        nationality: string;
        maritalStatus: string;
        street: string;
        city: string;
        zip: string;
        socialSecurityNumber?: string;
        taxId?: string;
        healthInsurance?: string;
    };
    bankDetails: {
        iban: string;
        bic: string;
        bankName: string;
    };
    employment: {
        position: string;
        status: EmploymentStatus;
        startDate: string;
        endDate?: string;
        salary: string;
    };
    additionalInfo: {
        emergencyContactName?: string;
        emergencyContactPhone?: string;
        notes?: string;
    };
    weeklySchedule?: {
        monday: { enabled: boolean; hours: number };
        tuesday: { enabled: boolean; hours: number };
        wednesday: { enabled: boolean; hours: number };
        thursday: { enabled: boolean; hours: number };
        friday: { enabled: boolean; hours: number };
        saturday: { enabled: boolean; hours: number };
        sunday: { enabled: boolean; hours: number };
    };
    documents: EmployeeDocument[];
    createdAt: string;
    avatar?: string; // Base64 string for profile picture
    userId?: string; // Owner of the employee data
}
