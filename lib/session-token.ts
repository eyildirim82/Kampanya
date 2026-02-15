import crypto from 'crypto';

const DEFAULT_SECRET = 'temp_secret_change_me_in_prod';
const FORBIDDEN_LITERAL = 'DEFAULT_SECRET';

function getSessionSecret(): string {
    const raw = process.env.SESSION_SECRET;
    if (process.env.NODE_ENV === 'production') {
        if (!raw || raw.trim() === '') {
            throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET is not set in production environment.');
        }
        if (raw === FORBIDDEN_LITERAL || raw === DEFAULT_SECRET) {
            throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET must not be a default or placeholder value in production.');
        }
        return raw;
    }
    return raw && raw !== FORBIDDEN_LITERAL && raw !== DEFAULT_SECRET ? raw : DEFAULT_SECRET;
}

export interface SessionTokenPayload {
    tckn: string;
    exp: number;
    campaignId?: string;
    purpose?: string;
}

const TTL_MS = 15 * 60 * 1000; // 15 dakika

/**
 * HMAC imzalı session token üretir. Kampanya/akış scope'u için campaignId veya purpose eklenebilir.
 * Başvuru akışında campaignId verilirse imzaya dahil edilir (payload JSON'unun tamamı HMAC ile imzalanır).
 */
export function createSessionToken(
    tckn: string,
    options?: { campaignId?: string; purpose?: string }
): string {
    const secret = getSessionSecret();
    const payload: SessionTokenPayload = {
        tckn,
        exp: Date.now() + TTL_MS,
        ...(options?.campaignId && { campaignId: options.campaignId }),
        ...(options?.purpose && { purpose: options.purpose }),
    };
    const data = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return `${Buffer.from(data).toString('base64')}.${signature}`;
}

/**
 * Token'ı doğrular; geçerliyse payload'taki tckn döner. options.campaignId verilirse payload'taki campaignId ile eşleşmeli (başvuru akışında zorunlu).
 */
export function verifySessionToken(
    token: string,
    options?: { campaignId?: string; purpose?: string }
): string | null {
    try {
        const secret = getSessionSecret();
        const [b64Data, signature] = token.split('.');
        if (!b64Data || !signature) return null;

        const data = Buffer.from(b64Data, 'base64').toString();
        const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex');
        if (signature !== expectedSignature) return null;

        const payload = JSON.parse(data) as SessionTokenPayload;
        if (Date.now() > payload.exp) return null;

        if (options?.campaignId && payload.campaignId !== undefined && payload.campaignId !== options.campaignId) return null;
        if (options?.purpose && payload.purpose !== undefined && payload.purpose !== options.purpose) return null;

        return payload.tckn;
    } catch {
        return null;
    }
}
