import crypto from 'crypto';

/**
 * TCKN doğrulama fonksiyonu
 */
function validateTCKN(tckn: string): boolean {
    if (!tckn || tckn.length !== 11) {
        return false;
    }
    
    // Sadece rakam kontrolü
    if (!/^\d+$/.test(tckn)) {
        return false;
    }
    
    // İlk hane 0 olamaz
    if (tckn[0] === '0') {
        return false;
    }
    
    // Basit algoritma kontrolü (gerçek TCKN algoritması daha karmaşık)
    const digits = tckn.split('').map(Number);
    const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
    
    const check1 = (sum1 * 7 - sum2) % 10;
    const check2 = (sum1 + sum2 + digits[9]) % 10;
    
    return check1 === digits[9] && check2 === digits[10];
}

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
        .map(part => part.length > 2 ? part.charAt(0) + '***' : part)
        .join(' ');
}

describe('TCKN Utilities', () => {
    describe('validateTCKN', () => {
        it('should validate correct TCKN format', () => {
            // Demo TCKN'lerden biri (basit format kontrolü için)
            expect(validateTCKN('12345678901')).toBe(true);
        });

        it('should reject TCKN with wrong length', () => {
            expect(validateTCKN('1234567890')).toBe(false);
            expect(validateTCKN('123456789012')).toBe(false);
        });

        it('should reject TCKN starting with 0', () => {
            expect(validateTCKN('01234567890')).toBe(false);
        });

        it('should reject non-numeric TCKN', () => {
            expect(validateTCKN('1234567890a')).toBe(false);
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
