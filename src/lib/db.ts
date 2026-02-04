import sqliteDb from './sqlite';
import { User, VerificationToken } from './types';

// Wrapper to make SQLite behave like the old JSON db adapter
// This unifies the persistence layer so Auth uses the same DB as the rest of the app.

export const db = {
    // Users
    getUsers: (): User[] => {
        try {
            return sqliteDb.prepare('SELECT * FROM users').all() as User[];
        } catch (error) {
            console.error('SQLite: Failed to get users', error);
            return [];
        }
    },

    addUser: (user: User) => {
        try {
            const stmt = sqliteDb.prepare(`
                INSERT INTO users (id, email, passwordHash, name, role, isVerified, createdAt, updatedAt)
                VALUES (@id, @email, @passwordHash, @name, @role, @isVerified, @createdAt, @updatedAt)
            `);
            // Convert boolean to integer for SQLite
            const sqlUser = { ...user, isVerified: user.isVerified ? 1 : 0 };
            stmt.run(sqlUser);
            return user;
        } catch (error) {
            console.error('SQLite: Failed to add user', error);
            throw error;
        }
    },

    findUserByEmail: (email: string): User | undefined => {
        try {
            const user = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
            if (!user) return undefined;
            // Convert integer back to boolean
            return { ...user, isVerified: !!user.isVerified };
        } catch (error) {
            console.error('SQLite: Failed to find user by email', error);
            return undefined;
        }
    },

    findUserById: (id: string): User | undefined => {
        try {
            const user = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
            if (!user) return undefined;
            return { ...user, isVerified: !!user.isVerified };
        } catch (error) {
            console.error('SQLite: Failed to find user by id', error);
            return undefined;
        }
    },

    updateUser: (id: string, updates: Partial<User>) => {
        try {
            // Validate user exists
            const existing = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
            if (!existing) return null;

            const fields = Object.keys(updates).filter(k => k !== 'id');
            if (fields.length === 0) return existing;

            const setClause = fields.map(f => `${f} = @${f}`).join(', ');
            const stmt = sqliteDb.prepare(`UPDATE users SET ${setClause}, updatedAt = @updatedAt WHERE id = @id`);

            const updateData: any = { ...updates, id, updatedAt: new Date().toISOString() };
            if (typeof updateData.isVerified === 'boolean') {
                updateData.isVerified = updateData.isVerified ? 1 : 0;
            }

            stmt.run(updateData);

            // Return updated user
            const updated = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
            return { ...updated, isVerified: !!updated.isVerified };
        } catch (error) {
            console.error('SQLite: Failed to update user', error);
            return null;
        }
    },

    deleteUser: (id: string) => {
        try {
            const deleteTokens = sqliteDb.prepare('DELETE FROM tokens WHERE userId = ?');
            const deleteUser = sqliteDb.prepare('DELETE FROM users WHERE id = ?');

            const transaction = sqliteDb.transaction(() => {
                deleteTokens.run(id);
                return deleteUser.run(id);
            });

            const result = transaction();
            return result.changes > 0;
        } catch (error) {
            console.error('SQLite: Failed to delete user', error);
            return false;
        }
    },

    // Tokens
    addToken: (token: VerificationToken) => {
        try {
            // Remove existing tokens of same type for user
            sqliteDb.prepare('DELETE FROM tokens WHERE userId = ? AND type = ?').run(token.userId, token.type);

            const stmt = sqliteDb.prepare(`
                INSERT INTO tokens (id, userId, token, type, expiresAt, createdAt)
                VALUES (@id, @userId, @token, @type, @expiresAt, @createdAt)
            `);
            stmt.run(token);
            return token;
        } catch (error) {
            console.error('SQLite: Failed to add token', error);
            throw error;
        }
    },

    findToken: (tokenString: string): VerificationToken | undefined => {
        try {
            const token = sqliteDb.prepare('SELECT * FROM tokens WHERE token = ?').get(tokenString) as VerificationToken;
            return token || undefined;
        } catch (error) {
            console.error('SQLite: Failed to find token', error);
            return undefined;
        }
    },

    deleteToken: (id: string) => {
        try {
            sqliteDb.prepare('DELETE FROM tokens WHERE id = ?').run(id);
        } catch (error) {
            console.error('SQLite: Failed to delete token', error);
        }
    },

    cleanupTokens: () => {
        try {
            const now = Date.now();
            sqliteDb.prepare('DELETE FROM tokens WHERE expiresAt < ?').run(now);
        } catch (error) {
            console.error('SQLite: Failed to cleanup tokens', error);
        }
    }
};
