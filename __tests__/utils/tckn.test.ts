import { validateTckn } from '../../lib/tckn';
import crypto from 'crypto';

/**
 * TCKN hashleme fonksiyonu
 */

/**
 * TCKN hashleme fonksiyonu
 */
function hashTCKN(tckn: string, salt: string): string {
    return crypto.createHash('sha256').update(tckn + salt).digest('hex');
}

/**
 * İsim maskeleme fonksiyonu
 */
function maskName(name: string): string {
    return name
        .split(' ')
        .map(part => part.length > 3 ? part.charAt(0) + '***' : part)
        .join(' ');
}

describe('TCKN Utilities', () => {
    describe('validateTCKN', () => {
        it('should validate correct TCKN format', () => {
            // Real TCKN checksum valid example: 16049008266
            expect(validateTckn('16049008266')).toBe(true);
        });

        it('should reject TCKN with wrong length', () => {
            expect(validateTckn('1604900826')).toBe(false);
            expect(validateTckn('160490082666')).toBe(false);
        });

        it('should reject TCKN starting with 0', () => {
            expect(validateTckn('06049008266')).toBe(false);
        });

        it('should reject non-numeric TCKN', () => {
            expect(validateTckn('1604900826a')).toBe(false);
        });
    });

    describe('hashTCKN', () => {
        it('should hash TCKN with salt', () => {
            const tckn = '12345678901';
            const salt = 'test_salt';
            const hash = hashTCKN(tckn, salt);

            expect(hash).toBeDefined();
            expect(hash.length).toBe(64); // SHA-256 produces 64 char hex string
            expect(typeof hash).toBe('string');
        });

        it('should produce different hashes for different salts', () => {
            const tckn = '12345678901';
            const hash1 = hashTCKN(tckn, 'salt1');
            const hash2 = hashTCKN(tckn, 'salt2');

            expect(hash1).not.toBe(hash2);
        });

        it('should produce same hash for same input', () => {
            const tckn = '12345678901';
            const salt = 'test_salt';
            const hash1 = hashTCKN(tckn, salt);
            const hash2 = hashTCKN(tckn, salt);

            expect(hash1).toBe(hash2);
        });
    });

    describe('maskName', () => {
        it('should mask names correctly', () => {
            expect(maskName('Ahmet Yılmaz')).toBe('A*** Y***');
            expect(maskName('Ayşe')).toBe('A***');
        });

        it('should handle short names', () => {
            expect(maskName('Ali')).toBe('Ali');
            expect(maskName('Ay')).toBe('Ay');
        });

        it('should handle multiple words', () => {
            expect(maskName('Mehmet Ali Demir')).toBe('M*** Ali D***');
        });
    });
});
