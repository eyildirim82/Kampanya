# Flow 01: Ana Sayfa ve Kampanya Listesi

**Amaç:** Kullanıcının siteye girişi, aktif kampanyaları görmesi ve bir kampanyanın detay sayfasına (başvuru/talep akışına) geçmesi.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rota** | `/` (ana sayfa) |
| **Bileşen** | `app/page.tsx` (Server Component) |
| **Veri kaynağı** | `getActiveCampaigns()` – `app/basvuru/campaign.ts` |

Bu akış **sadece görüntüleme ve yönlendirme** içerir; form veya kimlik doğrulama yok.

---

## 2. Adım Adım Akış

### 2.1 Ana sayfa yüklenmesi

1. Kullanıcı `/` adresine gider.
2. Next.js `app/page.tsx` içindeki `Home` server component’ini çalıştırır.
3. `noStore()` ile cache devre dışı bırakılır; `getActiveCampaigns()` çağrılır.

**getActiveCampaigns:**

- Supabase `campaigns` tablosundan `is_active = true` olan kayıtlar çekilir.
- `created_at` azalan sırayla sıralanır.
- Dönüş: `CampaignRecord[]` (id, is_active, campaign_code, slug, name, title, page_content, extra_fields_schema vb.).

4. Sayfa render edilir:
   - **Hero:** Lacivert arka plan (#002855), "Türkiye Havayolu Pilotları Derneği", "Üyelerimize özel ayrıcalıklı dünyayı keşfedin."
   - **Kampanya kartları:** Grid (1/2/3 sütun responsive). Her kampanya için:
     - `page_content.bannerImage` veya placeholder görsel
     - `page_content.heroTitle` veya `campaign.title` / `campaign.name`
     - `page_content.heroSubtitle` veya "Detaylar için tıklayınız."
     - **Link:** `href={/kampanya/${slug}}` — slug: `campaign.slug` veya `slugify(campaign.campaign_code || campaign.name || '')`
   - **Kampanya yoksa:** Tek kart içinde "Aktif Kampanya Bulunmuyor" mesajı.
5. Sayfa altında footer (copyright).

### 2.2 Kampanya detay sayfasına geçiş

1. Kullanıcı bir kampanya kartındaki **"Başvuru Yap &rarr;"** linkine tıklar.
2. Tarayıcı `/kampanya/[slug]` sayfasına gider (örn. `/kampanya/private-kart`).
3. **Kampanya başvuru akışı** (Flow 02 – Genel kampanya başvuru) devreye girer; tüm kampanyalar aynı form yapısını (CampaignFormWrapper + DynamicForm) kullanır.

---

## 3. Veri ve Yardımcılar

### 3.1 getActiveCampaigns

- **Dosya:** `app/basvuru/campaign.ts`
- **Davranış:** `campaigns` tablosu, `is_active = true`, `order('created_at', { ascending: false })`.
- **Kullanıldığı yerler:** Ana sayfa (`app/page.tsx`), başvuru sayfası varsayılan kampanya seçimi (`app/basvuru/page.tsx`).

### 3.2 slugify

- **Dosya:** `app/basvuru/campaign.ts`
- **Davranış:** Metni Türkçe küçük harfe çevirir, alfanumerik olmayan karakterleri `-` yapar, baştaki/sondaki tireleri temizler. Slug yoksa kampanya adı/kodu bu fonksiyonla slug’a dönüştürülür.

### 3.3 Kampanya kartı veri eşlemesi

| Alan | Kaynak |
|------|--------|
| Başlık | `content.heroTitle` \|\| `campaign.title` \|\| `campaign.name` \|\| 'Kampanya' |
| Alt metin | `content.heroSubtitle` \|\| 'Detaylar için tıklayınız.' |
| Görsel | `content.bannerImage` \|\| placeholder URL |
| Slug | `campaign.slug` \|\| `slugify(campaign.campaign_code \|\| campaign.name \|\| '')` |

---

## 4. Hata ve Özel Durumlar

- **Aktif kampanya yok:** Kartlar yerine tek bir bilgi kartı gösterilir; başvuru linki sunulmaz.
- **Geçersiz slug:** Kullanıcı elle `/kampanya/olmayan-slug` yazarsa `/kampanya/[slug]/page.tsx` içinde `getCampaignBySlug(slug)` null döner ve `notFound()` çağrılır → 404 sayfası.

---

## 5. İlgili Akışlar

- **Flow 02:** Kampanya başvuru (`/kampanya/[slug]`) → CampaignFormWrapper + DynamicForm.
- **Flow 03:** Doğrudan başvuru sayfası (`/basvuru`, `/basvuru/[slug]`) — ana sayfadan link yok; kullanıcı doğrudan URL ile veya login sonrası yönlendirme ile gelir.

---

## 6. Özet Diyagram

```
[Kullanıcı] → GET /
       ↓
[getActiveCampaigns()] → Supabase: campaigns (is_active=true)
       ↓
[Render] Hero + Kampanya Kartları (link: /kampanya/{slug})
       ↓
[Kullanıcı] "Başvuru Yap" tıklar → GET /kampanya/[slug]
       ↓
[Kampanya başvuru] → Flow 02 (CampaignFormWrapper + DynamicForm)
```
