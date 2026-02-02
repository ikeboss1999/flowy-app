import fs from 'fs';
import path from 'path';
import { DbSchema, User, VerificationToken } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB state
const initialDb: DbSchema = {
    users: [],
    tokens: []
};

// Initialize DB file if it doesn't exist
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2));
}

function readDb(): DbSchema {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading DB:', error);
        return initialDb;
    }
}

function writeDb(data: DbSchema): void {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing DB:', error);
    }
}

export const db = {
    getUsers: () => readDb().users,
    addUser: (user: User) => {
        const data = readDb();
        data.users.push(user);
        writeDb(data);
        return user;
    },
    findUserByEmail: (email: string) => {
        const users = readDb().users;
        return users.find(u => u.email === email);
    },
    findUserById: (id: string) => {
        const users = readDb().users;
        return users.find(u => u.id === id);
    },
    updateUser: (id: string, updates: Partial<User>) => {
        const data = readDb();
        const index = data.users.findIndex(u => u.id === id);
        if (index !== -1) {
            data.users[index] = { ...data.users[index], ...updates, updatedAt: new Date().toISOString() };
            writeDb(data);
            return data.users[index];
        }
        return null;
    },
    deleteUser: (id: string) => {
        const data = readDb();
        const initialCount = data.users.length;
        data.users = data.users.filter(u => u.id !== id);
        // Also clean up tokens for this user
        data.tokens = data.tokens.filter(t => t.userId !== id);
        if (data.users.length !== initialCount) {
            writeDb(data);
            return true;
        }
        return false;
    },

    // Tokens
    addToken: (token: VerificationToken) => {
        const data = readDb();
        // Remove existing tokens of same type for user to avoid clutter
        data.tokens = data.tokens.filter(t => !(t.userId === token.userId && t.type === token.type));
        data.tokens.push(token);
        writeDb(data);
        return token;
    },
    findToken: (tokenString: string) => {
        const tokens = readDb().tokens;
        return tokens.find(t => t.token === tokenString);
    },
    deleteToken: (id: string) => {
        const data = readDb();
        data.tokens = data.tokens.filter(t => t.id !== id);
        writeDb(data);
    },
    cleanupTokens: () => {
        const data = readDb();
        const now = Date.now();
        data.tokens = data.tokens.filter(t => t.expiresAt > now);
        writeDb(data);
    }
};
