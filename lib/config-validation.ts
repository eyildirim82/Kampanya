/**
 * Konfigürasyon Doğrulama
 * 
 * Uygulama başlangıcında ortam değişkenlerinin eksik veya hatalı olması durumunda
 * erken hata veren bir kontrol katmanı.
 */

interface ConfigValidation {
  key: string;
  required: boolean;
  validator?: (value: string) => boolean;
  errorMessage?: string;
}

const configValidations: ConfigValidation[] = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    validator: (value) => value.startsWith('https://') || value.startsWith('http://'),
    errorMessage: 'NEXT_PUBLIC_SUPABASE_URL geçerli bir URL olmalıdır',
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    validator: (value) => value.length > 20,
    errorMessage: 'NEXT_PUBLIC_SUPABASE_ANON_KEY geçerli bir anahtar olmalıdır',
  },
  {
    key: 'SECRET_SALT',
    required: false, // Uygulama içinde kullanılmıyorsa opsiyonel
    validator: (value) => {
      if (value === 'default_salt_change_me_in_prod') return false;
      return value.length >= 32;
    },
    errorMessage: 'SECRET_SALT en az 32 karakter olmalı ve default değer kullanılmamalıdır',
  },
  // TCKN artık plain saklandığı için şifreleme anahtarı zorunlu değil (legacy/env uyumu için opsiyonel bırakıldı)
  {
    key: 'TCKN_ENCRYPTION_KEY',
    required: false,
    validator: (value) => value !== 'mysecretkey' && (value?.length ?? 0) >= 16,
    errorMessage: 'TCKN_ENCRYPTION_KEY en az 16 karakter olmalı (kullanılıyorsa)',
  },
  {
    key: 'SESSION_SECRET',
    required: true,
    validator: (value) => value !== 'temp_secret_change_me_in_prod' && (value?.length ?? 0) >= 16,
    errorMessage: 'SESSION_SECRET production\'da zorunludur ve en az 16 karakter olmalıdır',
  },
  {
    key: 'RESEND_API_KEY',
    required: false, // Demo modda opsiyonel
    validator: (value) => value.startsWith('re_'),
    errorMessage: 'RESEND_API_KEY geçerli bir Resend API anahtarı olmalıdır',
  },
  {
    key: 'ADMIN_EMAIL',
    required: false,
    validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    errorMessage: 'ADMIN_EMAIL geçerli bir e-posta adresi olmalıdır',
  },
];

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';
  const isDemo = process.env.DEMO_MODE === 'true';

  for (const validation of configValidations) {
    const value = process.env[validation.key];

    // Required kontrolü
    if (validation.required && !value) {
      errors.push(`${validation.key} zorunludur`);
      continue;
    }

    // Demo modda bazı değerler opsiyonel olabilir
    if (!validation.required && !value) {
      continue;
    }

    // Validator kontrolü
    if (value && validation.validator) {
      // Production'da daha sıkı kontroller
      if (isProduction && !validation.validator(value)) {
        errors.push(validation.errorMessage || `${validation.key} geçersiz`);
      } else if (!isProduction && !isDemo && !validation.validator(value)) {
        // Development'ta da uyarı ver ama hata olarak işaretleme
        console.warn(`Uyarı: ${validation.errorMessage || `${validation.key} geçersiz görünüyor`}`);
      }
    }
  }

  // Production'da kritik kontroller
  if (isProduction) {
    if (process.env.SESSION_SECRET === 'temp_secret_change_me_in_prod' || !process.env.SESSION_SECRET) {
      errors.push('SESSION_SECRET production ortamında zorunludur ve default değer kullanılamaz');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Uygulama başlangıcında çağrılmalıdır
 */
export function ensureConfigValid(): void {
  const { valid, errors } = validateConfig();
  
  if (!valid) {
    console.error('Konfigürasyon hataları:');
    errors.forEach((error) => console.error(`  - ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Konfigürasyon hataları nedeniyle uygulama başlatılamadı');
    } else {
      console.warn('Uyarı: Konfigürasyon hataları var, ancak development modunda devam ediliyor');
    }
  }
}
