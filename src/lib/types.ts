export type UserRole = 'user' | 'admin';

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
}

export type TokenType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export interface VerificationToken {
    id: string;
    userId: string;
    token: string;
    type: TokenType;
    expiresAt: number; // Timestamp
    createdAt: string;
}

export interface DbSchema {
    users: User[];
    tokens: VerificationToken[];
}
