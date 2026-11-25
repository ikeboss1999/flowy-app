import { lookup } from "node:dns/promises";
import { ImapFlow } from "imapflow";
import { decrypt } from "@/lib/encryption";

type MailboxConnection = { host: string; port: number; username: string; passwordEncrypted: string };

function isPublicIPv4(address: string) {
    const parts = address.split(".").map(Number);
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
    const [a, b] = parts;
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
}

export async function createIncomingMailboxConnection(config: MailboxConnection) {
    const addresses = await lookup(config.host, { family: 4, all: true });
    if (!addresses.length || addresses.some(({ address }) => !isPublicIPv4(address))) throw new Error("Der IMAP-Server konnte nicht sicher erreicht werden.");
    const password = decrypt(config.passwordEncrypted);
    if (!password || password === config.passwordEncrypted) throw new Error("Das gespeicherte IMAP-Passwort konnte nicht entschlüsselt werden.");
    return new ImapFlow({ host: addresses[0].address, servername: config.host, port: config.port, secure: true, auth: { user: config.username, pass: password }, logger: false, disableAutoIdle: true, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000, tls: { rejectUnauthorized: true, servername: config.host } });
}
