# Trigger URL Yapılandırması

`applications` ve `interests` tablolarındaki INSERT tetikleyicileri, e-posta gönderimi için Edge Function (`process-email`) URL’ine ihtiyaç duyar.

## Production

URL’i **sabit kodda bırakmamak** için aşağıdaki ayarlardan birini kullanın:

```sql
-- Seçenek 1: Supabase proje URL’i (fonksiyon yolu otomatik eklenir)
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT_REF.supabase.co';

-- Seçenek 2: Tam Edge Function URL’i
ALTER DATABASE postgres SET app.settings.edge_function_url = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-email';
```

Tetikleyiciler önce `get_edge_function_url()` fonksiyonunu kullanır; bu fonksiyon sırayla `app.settings.edge_function_url` ve `app.settings.supabase_url` değerlerine bakar.

## Yerel Geliştirme

Supabase CLI ile çalışırken tetikleyici içinde `http://127.0.0.1:54321/functions/v1/process-email` varsayılan olarak kullanılır. Bu adres yalnızca ayar **tanımlı değilse** devreye girer; production’da mutlaka yukarıdaki ayarlardan biri yapılmalıdır.

## Vault (opsiyonel)

Supabase Vault’ta saklanan bir secret’ı tetikleyicide doğrudan okumak için ek bir wrapper fonksiyon ve migration gerekir; şu an önerilen yöntem `app.settings` ile veritabanı seviyesinde ayarlamaktır.
