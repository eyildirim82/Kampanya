# Docker ile Test Ortamı

Uygulamayı Docker içinde test ortamında çalıştırmak için adımlar.

## Gereksinimler

- Docker ve Docker Compose kurulu
- Supabase projesi (URL ve anon key)

## Adımlar

### 1. Ortam dosyasını oluşturun

```powershell
copy .env.test.example .env.test
```

`.env.test` dosyasını açıp en az şu değerleri doldurun:

- `NEXT_PUBLIC_SUPABASE_URL` – Supabase proje URL’iniz
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon key
- `SESSION_SECRET` – En az 16 karakter (test için örnek: `test_secret_en_az_16_karakter`)

### 2. Konteyneri derleyip çalıştırın

```powershell
docker compose up --build
```

İlk seferde image build edilir, ardından Next.js dev sunucusu başlar.

### 3. Tarayıcıdan test edin

- Adres: **http://localhost:3000**
- Kampanya sayfası, başvuru formu ve admin panelini bu adres üzerinden test edebilirsiniz.

### 4. Durdurmak

`Ctrl+C` ile durdurun. Konteyneri ve volume’ları kaldırmak için:

```powershell
docker compose down
```

## Notlar

- `NODE_ENV=development` kullanıldığı için test ortamında `SESSION_SECRET` için fallback geçerlidir; yine de `.env.test` içinde tanımlı olması önerilir.
- Kod değişiklikleri volume mount sayesinde konteyner içine yansır; sayfayı yenileyerek test edebilirsiniz.
- `.env.test` dosyasını git’e eklemeyin (hassas bilgiler içerir).
