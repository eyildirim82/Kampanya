-- Migration to seed email templates for 'applicant' and 'admin'

-- Clear existing configs for 'applicant' (optional, to avoid duplicates if re-run, though ID generation usually prevents collision, logic might rely on singular rows)
DELETE FROM email_configurations WHERE recipient_type IN ('applicant', 'admin');

-- Insert Applicant Template
INSERT INTO email_configurations (recipient_type, subject_template, body_template)
VALUES (
  'applicant',
  'TALPA Başvuru Onayı',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TALPA Başvuru Onayı</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f6f8; font-family: ''Helvetica Neue'', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-top: 40px; margin-bottom: 40px; }
        .header { background-color: #002855; padding: 30px 20px; text-align: center; }
        .header img { max-height: 60px; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }
        .content { padding: 40px 30px; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .button { display: inline-block; padding: 12px 24px; background-color: #002855; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>TALPA</h1>
        </div>
        <div class="content">
            <h2 style="color: #1e293b; margin-top: 0;">Başvurunuz Alındı</h2>
            <p>Sayın <strong>{{full_name}}</strong>,</p>
            <p>Kampanya başvurunuz başarıyla sistemimize kaydedilmiştir.</p>
            <p>Başvurunuz değerlendirildikten sonra gerekli bilgilendirmeler tarafınıza yapılacaktır.</p>
            <p>TALPA ailesi olarak ilginiz için teşekkür ederiz.</p>
        </div>
        <div class="footer">
            <p>© 2026 TALPA - Türkiye Havayolu Pilotları Derneği</p>
            <p>Bu e-posta otomatik olarak oluşturulmuştur, lütfen yanıtlamayınız.</p>
        </div>
    </div>
</body>
</html>'
);
