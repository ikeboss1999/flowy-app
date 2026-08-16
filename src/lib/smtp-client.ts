import net from 'net';
import tls from 'tls';

interface SmtpAttachment {
    filename: string;
    contentType: string;
    content: Buffer;
}

export interface SmtpSendOptions {
    host: string;
    port: number;
    security: 'starttls' | 'ssl' | 'none';
    username: string;
    password: string;
    fromName: string;
    fromEmail: string;
    replyToEmail?: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text: string;
    html?: string;
    attachments?: SmtpAttachment[];
}

export interface SmtpConnectionOptions {
    host: string;
    port: number;
    security: 'starttls' | 'ssl' | 'none';
    username: string;
    password: string;
}

function encodeHeader(value: string) {
    if (/^[\x00-\x7F]*$/.test(value)) return value;
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function normalizeLines(value: string) {
    return value.replace(/\r?\n/g, '\r\n');
}

function formatAddress(email: string, name?: string) {
    return name ? `${encodeHeader(name)} <${email}>` : email;
}

function waitForLine(socket: net.Socket | tls.TLSSocket): Promise<string> {
    return new Promise((resolve, reject) => {
        let buffer = '';

        const cleanup = () => {
            socket.off('data', onData);
            socket.off('error', onError);
        };
        const onError = (error: Error) => {
            cleanup();
            reject(error);
        };
        const onData = (chunk: Buffer) => {
            buffer += chunk.toString('utf8');
            const lines = buffer.split(/\r?\n/).filter(Boolean);
            if (lines.length === 0) return;
            const last = lines[lines.length - 1];
            if (/^\d{3}\s/.test(last)) {
                cleanup();
                resolve(buffer);
            }
        };

        socket.on('data', onData);
        socket.on('error', onError);
    });
}

async function expect(socket: net.Socket | tls.TLSSocket, expected: number[]) {
    const response = await waitForLine(socket);
    const code = Number(response.slice(0, 3));
    if (!expected.includes(code)) {
        throw new Error(`SMTP error ${response.trim()}`);
    }
    return response;
}

async function command(socket: net.Socket | tls.TLSSocket, text: string, expected: number[]) {
    socket.write(`${text}\r\n`);
    return expect(socket, expected);
}

function connectPlain(host: string, port: number): Promise<net.Socket> {
    return new Promise((resolve, reject) => {
        const socket = net.connect(port, host, () => resolve(socket));
        socket.setTimeout(30000);
        socket.on('timeout', () => reject(new Error('SMTP connection timed out')));
        socket.on('error', reject);
    });
}

function connectTls(host: string, port: number, socket?: net.Socket): Promise<tls.TLSSocket> {
    return new Promise((resolve, reject) => {
        const secureSocket = tls.connect({
            host,
            port,
            socket,
            servername: host,
        }, () => resolve(secureSocket));
        secureSocket.setTimeout(30000);
        secureSocket.on('timeout', () => reject(new Error('SMTP TLS connection timed out')));
        secureSocket.on('error', reject);
    });
}

function buildMessage(options: SmtpSendOptions) {
    const boundary = `flowy-mixed-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const alternativeBoundary = `flowy-alt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const recipients = [
        ...options.to,
        ...(options.cc || []),
        ...(options.bcc || []),
    ];

    const headers = [
        `From: ${formatAddress(options.fromEmail, options.fromName)}`,
        `To: ${options.to.join(', ')}`,
        ...(options.cc?.length ? [`Cc: ${options.cc.join(', ')}`] : []),
        ...(options.replyToEmail ? [`Reply-To: ${options.replyToEmail}`] : []),
        `Subject: ${encodeHeader(options.subject)}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
    ];

    if (options.html) {
        headers.push(
            `--${boundary}`,
            `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`,
            '',
            `--${alternativeBoundary}`,
            'Content-Type: text/plain; charset="UTF-8"',
            'Content-Transfer-Encoding: 8bit',
            '',
            normalizeLines(options.text),
            '',
            `--${alternativeBoundary}`,
            'Content-Type: text/html; charset="UTF-8"',
            'Content-Transfer-Encoding: 8bit',
            '',
            normalizeLines(options.html),
            '',
            `--${alternativeBoundary}--`,
            '',
        );
    } else {
        headers.push(
            `--${boundary}`,
            'Content-Type: text/plain; charset="UTF-8"',
            'Content-Transfer-Encoding: 8bit',
            '',
            normalizeLines(options.text),
            '',
        );
    }

    for (const attachment of options.attachments || []) {
        headers.push(
            `--${boundary}`,
            `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
            'Content-Transfer-Encoding: base64',
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
            '',
            attachment.content.toString('base64').match(/.{1,76}/g)?.join('\r\n') || '',
            '',
        );
    }

    headers.push(`--${boundary}--`, '');

    return {
        message: headers.join('\r\n'),
        recipients,
    };
}

export async function sendSmtpMail(options: SmtpSendOptions) {
    let socket: net.Socket | tls.TLSSocket | null = null;

    try {
        socket = options.security === 'ssl'
            ? await connectTls(options.host, options.port)
            : await connectPlain(options.host, options.port);

        await expect(socket, [220]);
        await command(socket, 'EHLO flowy.local', [250]);

        if (options.security === 'starttls') {
            await command(socket, 'STARTTLS', [220]);
            socket = await connectTls(options.host, options.port, socket as net.Socket);
            await command(socket, 'EHLO flowy.local', [250]);
        }

        await command(socket, 'AUTH LOGIN', [334]);
        await command(socket, Buffer.from(options.username).toString('base64'), [334]);
        await command(socket, Buffer.from(options.password).toString('base64'), [235]);

        await command(socket, `MAIL FROM:<${options.fromEmail}>`, [250]);
        const { message, recipients } = buildMessage(options);
        for (const recipient of recipients) {
            await command(socket, `RCPT TO:<${recipient}>`, [250, 251]);
        }
        await command(socket, 'DATA', [354]);
        socket.write(`${message}\r\n.\r\n`);
        await expect(socket, [250]);
        await command(socket, 'QUIT', [221]);
    } finally {
        socket?.destroy();
    }
}

export async function verifySmtpConnection(options: SmtpConnectionOptions) {
    let socket: net.Socket | tls.TLSSocket | null = null;

    try {
        socket = options.security === 'ssl'
            ? await connectTls(options.host, options.port)
            : await connectPlain(options.host, options.port);

        await expect(socket, [220]);
        await command(socket, 'EHLO flowy.local', [250]);

        if (options.security === 'starttls') {
            await command(socket, 'STARTTLS', [220]);
            socket = await connectTls(options.host, options.port, socket as net.Socket);
            await command(socket, 'EHLO flowy.local', [250]);
        }

        await command(socket, 'AUTH LOGIN', [334]);
        await command(socket, Buffer.from(options.username).toString('base64'), [334]);
        await command(socket, Buffer.from(options.password).toString('base64'), [235]);
        await command(socket, 'QUIT', [221]);
    } finally {
        socket?.destroy();
    }
}
