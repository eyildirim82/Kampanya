# Top 5 UI Risks – Denetim Özeti ve Önerilen Düzeltmeler

**Bağlam:** Next.js 16 (App Router) + Tailwind 4 + Shadcn/UI  
**Kapsam:** `components/` ve `app/` klasörleri  
**Tarih:** Şubat 2025

---

## 1. Loading / Skeleton durumlarının eksikliği (CLS & UX)

**Risk:** Server Action veya async sayfa yüklenirken ne loading ne de skeleton var. Kullanıcı boş ekran veya ani içerik sıçraması (CLS) görebilir.

**Etkilenen yerler:**
- `app/kampanya/[slug]/page.tsx` – async Server Component, `getCampaignBySlug` beklerken UI boş
- `app/talep/[slug]/page.tsx` – aynı durum
- `app/admin/campaigns/[id]/page.tsx` – client-side `useEffect` ile fetch, ilk render boş

**Yapılan düzeltmeler:**
- `app/kampanya/[slug]/loading.tsx` eklendi – kampanya hero + form alanı iskeleti
- `app/talep/[slug]/loading.tsx` eklendi – talep formu iskeleti
- `app/admin/campaigns/[id]/loading.tsx` eklendi – sekme + form alanı iskeleti

Bu sayfalarda artık route değişiminde Next.js otomatik olarak ilgili `loading.tsx` ile skeleton gösterecek.

---

## 2. Erişilebilirlik: Input bileşeninde label–input ilişkisi

**Risk:** `components/ui/Input.tsx` içinde `label` var ama input’a `id` verilmiyor ve label’da `htmlFor` yok. Ekran okuyucu kullanıcıları hangi etiketin hangi alana ait olduğunu anlayamıyor.

**Yapılan düzeltmeler:**
- `useId()` ile benzersiz `id` üretildi; `props.id` gelirse o kullanılıyor.
- Label’a `htmlFor={inputId}` verildi, input’a `id={inputId}` verildi.
- Hata/yardım metinleri için `id={`${inputId}-error`}` ve `id={`${inputId}-helper`}` eklendi; input’ta `aria-describedby` ile bağlandı.
- Hata durumunda `aria-invalid={!!error}` eklendi.
- Hata metni `role="alert"` ile işaretlendi; dekoratif ikon `aria-hidden` aldı.

---

## 3. Erişilebilirlik: Error sayfaları ve dil

**Risk:** `app/error.tsx` ve `app/admin/error.tsx` içindeki buton/link’lerde yeterli aria açıklaması ve odak stili yok; `<html lang="en">` kullanılırken uygulama Türkçe.

**Yapılan düzeltmeler:**
- "Tekrar Dene" butonuna `type="button"` ve `aria-label="Hatayı düzeltmek için tekrar dene"` eklendi.
- "Ana Sayfa" / "Panele Dön" link’lerine `aria-label` eklendi.
- Buton ve link’lere `focus-visible:ring-2 focus-visible:ring-[#002855] focus-visible:ring-offset-2` ile görünür odak halkası verildi.
- `app/layout.tsx` içinde `<html lang="en">` → `<html lang="tr">` olarak güncellendi.

---

## 4. DynamicForm: key ve checkbox id tutarlılığı

**Risk:** Schema’da `id` opsiyonel; `key={field.id}` veya `id={\`field_${field.id}\`}` kullanıldığında `id` yoksa `undefined` string’e dönüp React key çakışması veya yanlış label–input eşleşmesi oluşabilir.

**Yapılan düzeltmeler:**
- Liste öğesi: `key={field.id}` → `key={field.id ?? field.name}`.
- Checkbox input ve label: `field_${field.id}` → `field_${field.id ?? field.name}`.

Böylece `id` tanımlı olmasa bile `name` ile tutarlı key ve id kullanılıyor.

---

## 5. Form UX: Sunucu (Zod) alan hatalarının alanlara yansımaması

**Risk:** `app/talep/[slug]/form.tsx` içinde Server Action `submitInterest` döndüğünde `result.errors` (Zod `flatten().fieldErrors`) kullanılmıyor; sadece `result.message` toast ve `serverError` state’e yazılıyor. Kullanıcı hangi alanın hatalı olduğunu göremiyor.

**Yapılan düzeltmeler:**
- `useForm`’dan `setError` alındı.
- `result.success === false` ve `result.errors` dolu olduğunda, her alan için `setError(field, { type: 'server', message: msg })` çağrılıyor.
- Sadece formda tanımlı alanlar için setError yapılsın diye `INTEREST_FORM_KEYS` (fullName, email, phone, tckn, note) ile filtreleme eklendi.

Aynı pattern’i `app/basvuru/form.tsx` için de düşünebilirsiniz; `submitApplication` da `errors` dönüyorsa orada da alan bazlı `setError` uygulanabilir.

---

## Ek notlar

- **Tailwind 4:** Proje `@import "tailwindcss"` ve `@theme inline` kullanıyor; yapı v4 ile uyumlu. `sorgula/page.tsx` içinde `indigo-*` kullanımı marka rengi (#002855) ile tutarlılık için ileride `#002855` / talpa-navy token’larına çekilebilir.
- **`use client` kullanımı:** Formlar, admin tab’lı sayfalar ve `useActionState` kullanan sorgula sayfası için `'use client'` gerekli. Sorgula sayfası ileride layout (Server) + sadece form wrapper (Client) olarak bölünebilir; şu anki yapı da çalışır durumda.
- **Responsiveness:** Kritik layout shift veya mobil kırılma tespit edilmedi; grid ve max-width kullanımı makul. İsteğe bağlı olarak görsellerde `width`/`height` veya `aspect-ratio` ile CLS daha da azaltılabilir.

Bu dokümandaki tüm “Yapılan düzeltmeler” ilgili dosyalara uygulanmış durumdadır.
