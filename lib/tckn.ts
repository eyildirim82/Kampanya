/**
 * TCKN (T.C. Kimlik Numarası) validasyonu - Mod10/Mod11 algoritması.
 * Tüm Server Action'larda tek kaynak olarak kullanılır.
 */
export function validateTckn(tckn: string): boolean {
    if (!tckn || tckn.length !== 11) return false;
    if (!/^[1-9][0-9]*$/.test(tckn)) return false;

    const digits = tckn.split('').map(Number);

    const current13579 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const current2468 = digits[1] + digits[3] + digits[5] + digits[7];

    const digit10 = ((current13579 * 7) - current2468) % 10;
    if (digit10 !== digits[9]) return false;

    let total10 = 0;
    for (let i = 0; i < 10; i++) total10 += digits[i];
    if (total10 % 10 !== digits[10]) return false;

    return true;
}
