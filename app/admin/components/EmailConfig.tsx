'use client';

import { useState, useEffect } from 'react';
import { getEmailConfigs, saveEmailConfig, deleteEmailConfig } from '../actions';

type EmailConfig = {
    id: string;
    campaign_id: string;
    recipient_type: 'applicant' | 'admin' | 'custom';
    recipient_email?: string;
    subject_template: string;
    body_template: string;
    is_active: boolean;
    created_at: string;
};

export default function EmailConfig() {
    const [configs, setConfigs] = useState<EmailConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<EmailConfig> | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const fetchConfigs = async () => {
        setLoading(true);
        // No ID needed, backend uses default
        const data = await getEmailConfigs();
        setConfigs(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        // campaignId is optional/inferred in backend now
        if (editing?.id) formData.append('id', editing.id);

        const result = await saveEmailConfig(null, formData);
        if (result.success) {
            setMessage('Kaydedildi.');
            setEditing(null);
            fetchConfigs();
        } else {
            setMessage(result.message || 'Hata oluştu.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;

        const result = await deleteEmailConfig(id);
        if (result.success) {
            fetchConfigs();
        } else {
            alert(result.message);
        }
    };

    return (
        <div className="bg-white shadow sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 border-b pb-2 mb-4">
                    E-posta Bildirim Ayarları
                </h3>

                <div className="space-y-4">
                    {configs.map(config => (
                        <div key={config.id} className="border rounded p-4 flex justify-between items-start bg-gray-50">
                            <div>
                                <div className="font-medium text-sm text-gray-900">
                                    {config.subject_template}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs mr-2">
                                        {config.recipient_type === 'applicant' ? 'Başvuran' : config.recipient_type === 'admin' ? 'Yönetici' : 'Özel'}
                                    </span>
                                    {config.is_active ? (
                                        <span className="text-green-600 text-xs">Aktif</span>
                                    ) : (
                                        <span className="text-red-600 text-xs">Pasif</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 text-sm">
                                <button onClick={() => setEditing(config)} className="text-indigo-600 hover:text-indigo-900">Düzenle</button>
                                <button onClick={() => handleDelete(config.id)} className="text-red-600 hover:text-red-900">Sil</button>
                            </div>
                        </div>
                    ))}

                    {configs.length === 0 && !editing && (
                        <p className="text-sm text-gray-500 italic">Henüz tanımlı e-posta kuralı yok.</p>
                    )}

                    {!editing && (
                        <button
                            onClick={() => setEditing({ recipient_type: 'applicant', is_active: true })}
                            className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                        >
                            + Yeni Kural Ekle
                        </button>
                    )}
                </div>

                {editing && (
                    <div className="mt-6 border-t pt-4">
                        <h4 className="text-md font-medium text-gray-900 mb-4">{editing.id ? 'Kuralı Düzenle' : 'Yeni Kural'}</h4>

                        {/* Template Loader */}
                        <div className="mb-6 p-4 bg-indigo-50 rounded-md border border-indigo-100">
                            <label className="block text-sm font-bold text-indigo-900 mb-2">Hazır Şablon Yükle</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(prev => ({
                                        ...prev,
                                        subject_template: 'Başvurunuz Alındı - {{name}}',
                                        body_template: `<p>Sayın <strong>{{name}}</strong>,</p>

<p>TALPA & Denizbank iş birliği ile düzenlenen kampanyaya başvurunuz başarıyla sistemimize ulaşmıştır.</p>

<div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
    <h3 style="margin-top: 0; color: #002855; font-size: 16px;">Başvuru Özetiniz</h3>
    <ul style="list-style-type: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 8px;"><strong>TCKN:</strong> {{tckn}}</li>
        <li style="margin-bottom: 8px;"><strong>Telefon:</strong> {{phone}}</li>
        <li style="margin-bottom: 8px;"><strong>E-posta:</strong> {{email}}</li>
        <li style="margin-bottom: 8px;"><strong>Lokasyon:</strong> {{city}} / {{district}}</li>
        <li style="margin-bottom: 8px;"><strong>Teslimat Tercihi:</strong> {{deliveryMethod}}</li>
        <li style="margin-bottom: 8px;"><strong>Denizbank Müşterisi:</strong> {{isDenizbankCustomer}}</li>
        <li style="margin-bottom: 8px;"><strong>Tarih:</strong> {{date}}</li>
    </ul>
</div>

<p>Başvurunuz en kısa sürede değerlendirilerek sonuç hakkında tarafınıza bilgilendirme yapılacaktır.</p>
<p>İlginiz için teşekkür ederiz.</p>`
                                    }))}
                                    className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-50"
                                >
                                    Başvuran Şablonu
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEditing(prev => ({
                                        ...prev,
                                        recipient_type: 'custom',
                                        recipient_email: 'talpa-basvuru@denizbank.com',
                                        subject_template: 'Yeni Müşteri Adayı - {{name}}',
                                        body_template: `<p>Sayın Yetkili,</p>

<p>Sistem üzerinden yeni bir kampanya başvurusu alınmıştır. Müşteri adayına ait detaylar aşağıdadır:</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr style="background-color: #f1f5f9;">
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; width: 40%;">Ad Soyad</td>
        <td style="padding: 10px; border: 1px solid #cbd5e1;">{{name}}</td>
    </tr>
    <tr>
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">TCKN</td>
        <td style="padding: 10px; border: 1px solid #cbd5e1;">{{tckn}}</td>
    </tr>
    <tr style="background-color: #f1f5f9;">
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Telefon</td>
        <td style="padding: 10px; border: 1px solid #cbd5e1;">{{phone}}</td>
    </tr>
    <tr>
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">E-posta</td>
        <td style="padding: 10px; border: 1px solid #cbd5e1;">{{email}}</td>
    </tr>
    <tr style="background-color: #f1f5f9;">
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">İl / İlçe</td>
        <td style="padding: 10px; border: 1px solid #cbd5e1;">{{city}} / {{district}}</td>
    </tr>
    <tr>
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Adres</td>
        <td style="padding: 10px; border: 1px solid #cbd5e1;">{{address}}</td>
    </tr>
    <tr style="background-color: #f1f5f9;">
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Teslimat</td>
        <td style="padding: 10px; border: 1px solid #cbd5e1;">{{deliveryMethod}}</td>
    </tr>
    <tr>
        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Mevcut Müşteri?</td>
        <td style="padding: 10px; border: 1px solid #cbd5e1;">{{isDenizbankCustomer}}</td>
    </tr>
</table>

<p><strong>Onay Durumları:</strong><br>
{{consents}}</p>

<p>Lütfen gerekli aksiyonları alınız.</p>`
                                    }))}
                                    className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-50"
                                >
                                    Banka Şablonu
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEditing(prev => ({
                                        ...prev,
                                        subject_template: 'Başvuru Kaydı - {{tckn}} - {{name}}',
                                        body_template: `<h3>Yeni Başvuru Kaydı</h3>

<p><strong>Zaman:</strong> {{date}}</p>
<hr>

<p><strong>Kişisel Bilgiler:</strong></p>
<p>
Ad Soyad: {{name}}<br>
TCKN: {{tckn}}<br>
Tel: {{phone}}<br>
Email: {{email}}
</p>

<p><strong>Teslimat Bilgileri:</strong></p>
<p>
Yöntem: {{deliveryMethod}}<br>
Adres: {{address}}<br>
Lokasyon: {{district}}, {{city}}
</p>

<div style="font-size: 12px; color: #666; margin-top: 20px;">
    <strong>Yasal Onaylar:</strong><br>
    {{consents}}
</div>`
                                    }))}
                                    className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded hover:bg-indigo-50"
                                >
                                    Yönetici Şablonu
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900">Alıcı Tipi</label>
                                    <select name="recipientType" defaultValue={editing.recipient_type} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm border p-2 text-gray-900">
                                        <option value="applicant">Başvuran Kişi</option>
                                        <option value="admin">Yönetici (Sabit)</option>
                                        <option value="custom">Özel E-posta</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-900">Özel E-posta (Opsiyonel)</label>
                                    <input type="email" name="recipientEmail" defaultValue={editing.recipient_email} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm border p-2 text-gray-900" placeholder="Sadece 'Özel' seçiliyse..." />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900">Konu Şablonu</label>
                                <input type="text" name="subjectTemplate" required defaultValue={editing.subject_template} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm border p-2 text-gray-900" placeholder="Örn: Başvurunuz Alındı - {{name}}" />

                                <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                                    <p className="text-xs font-bold text-gray-900 mb-2">Kullanılabilir Değişkenler (Kopyalamak için tıklayın):</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['{{name}}', '{{tckn}}', '{{email}}', '{{phone}}', '{{address}}', '{{city}}', '{{district}}', '{{deliveryMethod}}', '{{isDenizbankCustomer}}', '{{consents}}', '{{date}}'].map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-block bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold text-gray-900 cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                                                onClick={() => navigator.clipboard.writeText(tag)}
                                                title="Kopyala"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-900">İçerik Şablonu</label>
                                <textarea name="bodyTemplate" required rows={4} defaultValue={editing.body_template} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm border p-2 text-gray-900" placeholder="Merhaba {{name}}, başvurunuz başarıyla alınmıştır..." />
                            </div>

                            <div className="flex items-center">
                                <input id="isActive" name="isActive" type="checkbox" defaultChecked={editing.is_active} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                                <label htmlFor="isActive" className="ml-2 block text-sm font-bold text-gray-900">Bu kural aktif</label>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">İptal</button>
                                <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Kaydet</button>
                            </div>

                            {message && <p className="text-sm text-center text-indigo-600">{message}</p>}
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
