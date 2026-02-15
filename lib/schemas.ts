import { z } from 'zod';
import { validateTckn } from '@/lib/tckn';

/** TCKN: 11 hane, Mod10/Mod11 (lib/tckn ile uyumlu) */
export const tcknSchema = z
  .string()
  .length(11, 'TCKN 11 haneli olmalıdır.')
  .regex(/^[1-9][0-9]*$/, 'Geçerli bir TCKN giriniz.')
  .refine((val) => validateTckn(val), 'Geçersiz T.C. Kimlik Numarası.');

/** Telefon: 10 hane, başında 0 olmadan */
export const phoneSchema = z
  .string()
  .length(10, 'Telefon numarası 10 haneli olmalıdır (başında 0 olmadan).')
  .regex(/^[1-9][0-9]{9}$/, 'Telefon numarası başında 0 olmadan yazılmalıdır.');

/** E-posta (opsiyonel boş string ile) */
export const emailSchemaOptional = z.string().email('Geçerli bir e-posta adresi giriniz.').optional().or(z.literal(''));

/** Ad soyad minimum 2 karakter */
export const fullNameSchema = z.string().min(2, 'Ad Soyad en az 2 karakter olmalıdır.');

/** TCKN + telefon + e-posta (sorgula vb. kısa formlar) */
export const tcknPhoneSchema = z.object({
  tckn: tcknSchema,
  phone: z.string().min(10, 'Telefon numarası giriniz.'),
});
