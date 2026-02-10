// const TALPA_LOGO_URL = 'https://talpa.org/wp-content/uploads/2023/12/Talpa-Logo.png';
// Let's use a nice extensive HTML structure.

const getSharedLayout = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 40px; margin-bottom: 40px; }
        .header { background-color: #002855; padding: 30px 20px; text-align: center; }
        .header img { max-height: 60px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
        .content { padding: 40px 30px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .button { display: inline-block; padding: 12px 24px; background-color: #002855; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
        .code-block { background-color: #f1f5f9; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 24px; letter-spacing: 5px; text-align: center; margin: 20px 0; color: #002855; font-weight: bold; border: 1px dashed #cbd5e1; }
        .info-row { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
        .info-label { font-weight: 600; color: #475569; width: 140px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <!-- Ideally an IMG tag here if we have a stable URL -->
            <h1>TALPA</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>© ${new Date().getFullYear()} TALPA - Türkiye Havayolu Pilotları Derneği</p>
            <p>Bu e-posta otomatik olarak oluşturulmuştur, lütfen yanıtlamayınız.</p>
        </div>
    </div>
</body>
</html>
`;

export const getOtpEmailTemplate = (code: string) => {
    const content = `
        <h2 style="color: #1e293b; margin-top: 0;">Doğrulama Kodu</h2>
        <p>Sayın Üyemiz,</p>
        <p>TALPA Kampanya Başvuru işleminize devam etmek için aşağıdaki doğrulama kodunu kullanınız:</p>
        
        <div class="code-block">${code}</div>
        
        <p style="font-size: 14px; color: #64748b;">Bu kod 5 dakika süreyle geçerlidir. Eğer bu işlemi siz yapmadıysanız, lütfen bu e-postayı dikkate almayınız.</p>
    `;
    return getSharedLayout(content, 'TALPA Doğrulama Kodu');
};

export const getUserEmailTemplate = (name: string) => {
    const content = `
        <h2 style="color: #1e293b; margin-top: 0;">Başvurunuz Alındı</h2>
        <p>Sayın <strong>${name}</strong>,</p>
        <p>Kampanya başvurunuz başarıyla sistemimize kaydedilmiştir.</p>
        <p>Başvurunuz değerlendirildikten sonra gerekli bilgilendirmeler tarafınıza yapılacaktır.</p>
        <p>TALPA ailesi olarak ilginiz için teşekkür ederiz.</p>
    `;
    return getSharedLayout(content, 'TALPA Başvuru Onayı');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getAdminEmailTemplate = (data: any) => {
    const content = `
        <h2 style="color: #1e293b; margin-top: 0;">Yeni Kampanya Başvurusu</h2>
        <p>Sisteme yeni bir başvuru kaydedildi. Başvuru detayları aşağıdadır:</p>
        
        <div style="margin-top: 25px;">
            <div class="info-row">
                <span class="info-label">Ad Soyad:</span> ${data.full_name}
            </div>
            <div class="info-row">
                <span class="info-label">TCKN:</span> ${data.tckn || '***'}
            </div>
            <div class="info-row">
                <span class="info-label">Telefon:</span> ${data.phone}
            </div>
            <div class="info-row">
                <span class="info-label">E-posta:</span> ${data.email}
            </div>
            <div class="info-row">
                <span class="info-label">İl/İlçe:</span> ${data.city} / ${data.district}
            </div>
            ${data.address ? `
            <div class="info-row">
                <span class="info-label">Adres:</span> ${data.address}
            </div>` : ''}
             <div class="info-row">
                <span class="info-label">Denizbank Müşterisi:</span> ${data.isDenizbankCustomer === 'yes' ? 'Evet' : 'Hayır'}
            </div>
             <div class="info-row">
                <span class="info-label">Teslimat:</span> ${data.deliveryMethod === 'address' ? 'Adrese Teslim' : 'Şubeden Teslim'}
            </div>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <h3 style="font-size: 16px; margin-bottom: 15px;">Onay Bilgileri</h3>
            
            <div class="info-row">
                <span class="info-label">KVKK Onayı:</span> ${data.kvkkConsent ? 'Evet' : 'Hayır'}
            </div>
            <div class="info-row">
                <span class="info-label">Açık Rıza:</span> ${data.openConsent ? 'Evet' : 'Hayır'}
            </div>
            <div class="info-row">
                <span class="info-label">İletişim İzni:</span> ${data.communicationConsent ? 'Evet' : 'Hayır'}
            </div>
            <div class="info-row">
                <span class="info-label">Denizbank Paylaşım:</span> ${data.denizbankConsent ? 'Evet' : 'Hayır'}
            </div>
            <div class="info-row">
                <span class="info-label">Sorumluluk Reddi:</span> ${data.talpaDisclaimer ? 'Evet' : 'Hayır'}
            </div>
        </div>
        
        <a href="${process.env.NEXT_PUBLIC_APP_URL || '#'}/admin" class="button">Yönetim Paneline Git</a>
    `;
    return getSharedLayout(content, 'Yeni Başvuru Bildirimi');
};

export const getGenericEmailTemplate = (title: string, bodyContent: string) => {
    return getSharedLayout(bodyContent, title);
};
