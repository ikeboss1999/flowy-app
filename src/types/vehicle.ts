export type VehicleStatus = "Bereit" | "In Benutzung" | "Werkstatt" | "Außer Betrieb";

export interface VehicleDocument {
    id: string;
    name: string;
    type: string;
    uploadDate: string;
    fileSize?: string;
}

export interface Vehicle {
    id: string;
    basicInfo: {
        make: string;
        model: string;
        licensePlate: string;
        year: string;
        vin: string; // Fahrzeugidentifikationsnummer
        color?: string;
    };
    fleetDetails: {
        assignedEmployeeId?: string;
        fuelCardNumber?: string;
        currentMileage: number;
        status: VehicleStatus;
    };
    maintenance: {
        nextTUV: string;
        lastService: string;
        nextService?: string;
        tireChangeDue?: "Sommer" | "Winter" | "Allwetter";
    };
    leasing?: {
        provider: string;
        monthlyRate: string;
        startDate: string;
        endDate: string;
    };
    documents: VehicleDocument[];
    createdAt: string;
    userId?: string; // Owner of the vehicle
}
