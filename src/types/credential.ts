export interface Credential {
    id: string;
    title: string;
    url?: string;
    username: string;
    password?: string; // Cleartext password (only decrypted in API/client side)
    notes?: string;
    tags: string[];
    userId: string;
    createdAt?: string;
    updatedAt?: string;
}
