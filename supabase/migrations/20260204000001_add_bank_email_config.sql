-- Migration to add Bank Employee email configuration

-- Insert Custom/Bank Template
INSERT INTO email_configurations (recipient_type, recipient_email, subject_template, body_template)
VALUES (
  'custom',
  'ENTER_BANK_EMAIL_HERE', -- Placeholder updated by user request
  'Yeni TALPA Başvurusu: {{full_name}}',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Yeni Başvuru Bildirimi</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #002855; margin-top: 0;">Yeni Kampanya Başvurusu</h2>
        <p>Sisteme yeni bir başvuru kaydedildi. Başvuru sahibi detayları aşağıdadır:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; width: 150px;">Ad Soyad:</td>
                <td style="padding: 10px;">{{full_name}}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">E-posta:</td>
                <td style="padding: 10px;">{{email}}</td>
            </tr>
             <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">Tarih:</td>
                <td style="padding: 10px;">{{created_at}}</td>
            </tr>
        </table>
        
        <p style="margin-top: 20px; font-size: 12px; color: #666;">Bu e-posta otomatik olarak oluşturulmuştur.</p>
    </div>
</body>
</html>'
);
