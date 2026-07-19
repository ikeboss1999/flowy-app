import crypto from 'crypto';
import { Employee } from '@/types/employee';

const GCM_IV_LENGTH = 12;

function getEncryptionKey(requireDedicatedKey = false): Buffer {
    const rawKey = process.env.ENCRYPTION_KEY;

    if (!rawKey && (requireDedicatedKey || process.env.NODE_ENV === 'production')) {
        throw new Error('ENCRYPTION_KEY environment variable is required for encryption.');
    }

    const fallbackKey = process.env.JWT_SECRET || 'development-only-flowy-encryption-fallback';
    return crypto.createHash('sha256').update(rawKey || fallbackKey).digest();
}

function getLegacyEncryptionKeys(): Buffer[] {
    const keys = [
        process.env.ENCRYPTION_KEY,
        process.env.JWT_SECRET,
        'default-secret-key-32-chars-minimum-length-flowy!',
    ].filter((key): key is string => Boolean(key));

    return Array.from(new Set(keys)).map((key) => crypto.createHash('sha256').update(key).digest());
}

export function encrypt(text: string): string {
    if (!text) return '';
    if (/^gcm:v1:[0-9a-fA-F]+:[0-9a-fA-F]+:[0-9a-fA-F]+$/.test(text)) {
        return text;
    }
    if (/^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/.test(text)) {
        return text;
    }

    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `gcm:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text: string): string {
    if (!text) return '';
    try {
        if (text.startsWith('gcm:v1:')) {
            const parts = text.split(':');
            if (parts.length !== 5) return text;

            const iv = Buffer.from(parts[2], 'hex');
            const authTag = Buffer.from(parts[3], 'hex');
            const encryptedText = Buffer.from(parts[4], 'hex');
            const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
            decipher.setAuthTag(authTag);
            return Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString('utf8');
        }

        if (!text.includes(':')) {
            return text; // Return plain text for legacy records
        }
        const parts = text.split(':');
        if (parts.length !== 2 || parts[0].length !== 32) {
            return text; // Return plain text if it doesn't match the IV:ciphertext pattern
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = Buffer.from(parts[1], 'hex');

        for (const legacyKey of getLegacyEncryptionKeys()) {
            try {
                const decipher = crypto.createDecipheriv('aes-256-cbc', legacyKey, iv);
                const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
                return decrypted.toString('utf8');
            } catch {
                // Try next legacy key.
            }
        }

        return text;
    } catch (e) {
        // Fallback for legacy unencrypted data
        return text;
    }
}

// Fields to encrypt in personalData
const PERSONAL_DATA_KEYS: (keyof NonNullable<Employee['personalData']>)[] = [
    'socialSecurityNumber',
    'taxId',
    'healthInsurance',
    'birthday',
    'birthPlace',
    'birthCountry',
    'nationality',
    'maritalStatus'
];

// Fields to encrypt in bankDetails
const BANK_DETAILS_KEYS: (keyof NonNullable<Employee['bankDetails']>)[] = [
    'iban',
    'bic'
];

// Fields to encrypt in employment
const EMPLOYMENT_KEYS: (keyof NonNullable<Employee['employment']>)[] = [
    'salary'
];

// Fields to encrypt in additionalInfo
const ADDITIONAL_INFO_KEYS: (keyof NonNullable<Employee['additionalInfo']>)[] = [
    'emergencyContactName',
    'emergencyContactPhone'
];

export function encryptEmployee(employee: Partial<Employee>): Partial<Employee> {
    if (!employee) return employee;
    const result = { ...employee };

    if (result.personalData) {
        const pd = { ...result.personalData } as any;
        PERSONAL_DATA_KEYS.forEach(key => {
            if (pd[key] !== undefined && pd[key] !== null) {
                pd[key] = encrypt(String(pd[key]));
            }
        });
        result.personalData = pd;
    }

    if (result.bankDetails) {
        const bd = { ...result.bankDetails } as any;
        BANK_DETAILS_KEYS.forEach(key => {
            if (bd[key] !== undefined && bd[key] !== null) {
                bd[key] = encrypt(String(bd[key]));
            }
        });
        result.bankDetails = bd;
    }

    if (result.employment) {
        const emp = { ...result.employment } as any;
        EMPLOYMENT_KEYS.forEach(key => {
            if (emp[key] !== undefined && emp[key] !== null) {
                emp[key] = encrypt(String(emp[key]));
            }
        });
        result.employment = emp;
    }

    if (result.additionalInfo) {
        const ai = { ...result.additionalInfo } as any;
        ADDITIONAL_INFO_KEYS.forEach(key => {
            if (ai[key] !== undefined && ai[key] !== null) {
                ai[key] = encrypt(String(ai[key]));
            }
        });
        result.additionalInfo = ai;
    }

    // Also encrypt any pending changes if present
    if (result.pendingChanges) {
        result.pendingChanges = encryptEmployee(result.pendingChanges);
    }

    return result;
}

export function decryptEmployee(employee: Employee): Employee {
    if (!employee) return employee;
    const result = { ...employee };

    if (result.personalData) {
        const pd = { ...result.personalData } as any;
        PERSONAL_DATA_KEYS.forEach(key => {
            if (pd[key]) {
                pd[key] = decrypt(String(pd[key]));
            }
        });
        result.personalData = pd;
    }

    if (result.bankDetails) {
        const bd = { ...result.bankDetails } as any;
        BANK_DETAILS_KEYS.forEach(key => {
            if (bd[key]) {
                bd[key] = decrypt(String(bd[key]));
            }
        });
        result.bankDetails = bd;
    }

    if (result.employment) {
        const emp = { ...result.employment } as any;
        EMPLOYMENT_KEYS.forEach(key => {
            if (emp[key]) {
                emp[key] = decrypt(String(emp[key]));
            }
        });
        result.employment = emp;
    }

    if (result.additionalInfo) {
        const ai = { ...result.additionalInfo } as any;
        ADDITIONAL_INFO_KEYS.forEach(key => {
            if (ai[key]) {
                ai[key] = decrypt(String(ai[key]));
            }
        });
        result.additionalInfo = ai;
    }

    // Also decrypt any pending changes if present
    if (result.pendingChanges) {
        result.pendingChanges = decryptEmployee(result.pendingChanges as Employee);
    }

    return result;
}
