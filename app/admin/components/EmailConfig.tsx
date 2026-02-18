'use client';

import { useEffect, useMemo, useState } from 'react';
import { getEmailConfigs, saveEmailConfig, deleteEmailConfig, getCampaigns } from '../actions';

type EmailConfig = {
    id: string;
    campaign_id: string;
    recipient_type: 'applicant' | 'admin' | 'custom';
    recipient_email?: string;
    subject_template: string;
    body_template: string;
    trigger_event?: string;
    is_active: boolean;
    created_at: string;
};

// Campaign type removed/unused
// type Campaign = { ... }

interface EmailConfigProps {
    campaignId?: string;
}

export default function EmailConfig({ campaignId: propCampaignId }: EmailConfigProps) {
    const [configs, setConfigs] = useState<EmailConfig[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string>(propCampaignId || '');
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<EmailConfig> | null>(null);
    const [message, setMessage] = useState<string | null>(null);



    // Reload when campaign changes
    useEffect(() => {
        const loadByCampaign = async () => {
            if (!selectedCampaignId) return;
            const data = await getEmailConfigs(selectedCampaignId);
            setConfigs(data);
            setEditing(null);
            setMessage(null);
        };
        void loadByCampaign();
    }, [selectedCampaignId]);

    // Initial load
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // If embedded with a specific ID, we don't need to fetch all campaigns
            if (propCampaignId) {
                setSelectedCampaignId(propCampaignId);
                const configsData = await getEmailConfigs(propCampaignId);
                setConfigs(configsData);
                // We mock the campaign list with just one item or fetch just this one if needed for context
                // But for now, we just proceed.
            } else {
                const campaignsData = await getCampaigns();
                setCampaigns(campaignsData);

                // Default to first campaign if none selected, or keep current
                let targetId = selectedCampaignId;
                if (!targetId && campaignsData.length > 0) {
                    targetId = campaignsData[0].id;
                    setSelectedCampaignId(targetId);
                }

                if (targetId) {
                    const configsData = await getEmailConfigs(targetId);
                    setConfigs(configsData);
                }
            }
            setLoading(false);
        };

        void fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [propCampaignId]);

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        // Ensure we pass the selected campaign ID
        if (!formData.get('campaignId')) {
            formData.append('campaignId', selectedCampaignId);
        }

        if (editing?.id) formData.append('id', editing.id);

        const result = await saveEmailConfig(null, formData);
        if (result.success) {
            setMessage('Kaydedildi.');
            setEditing(null);
            // Refresh configs for current campaign
            const data = await getEmailConfigs(selectedCampaignId);
            setConfigs(data);
        } else {
            setMessage(result.message || 'Ayarlar kaydedilirken bir hata oluştu.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Silmek istediğinize emin misiniz?')) return;

        const result = await deleteEmailConfig(id);
        if (result.success) {
            const data = await getEmailConfigs(selectedCampaignId);
            setConfigs(data);
        } else {
            alert(result.message);
        }
    };

    const currentCampaign = useMemo(
        () => campaigns.find(c => c.id === selectedCampaignId),
        [campaigns, selectedCampaignId]
    );

    const isCreditCampaign = (currentCampaign?.campaign_code || '').includes('CREDIT') ||
        (currentCampaign?.name || '').toLowerCase().includes('kredi') ||
        // Fallback check if campaigns array is empty (embedded mode) can optionally check prop context if available
        // For now, default to generic if not found
        false;

    // Live Preview State
    const [activeSubject, setActiveSubject] = useState('');
    const [activeBody, setActiveBody] = useState('');

    // Sync editing state to local state
    useEffect(() => {
        if (editing) {
            setActiveSubject(editing.subject_template || '');
            setActiveBody(editing.body_template || '');
        } else {
            setActiveSubject('');
            setActiveBody('');
        }
    }, [editing]);

    // Helper to insert text at cursor position in textarea
    const insertAtCursor = (field: 'subject' | 'body', text: string) => {
        const elementId = field === 'subject' ? 'subjectInput' : 'bodyInput';
        const element = document.getElementById(elementId) as HTMLInputElement | HTMLTextAreaElement;

        if (element) {
            const start = element.selectionStart || 0;
            const end = element.selectionEnd || 0;
            const value = element.value;
            const newValue = value.substring(0, start) + text + value.substring(end);

            if (field === 'subject') {
                setActiveSubject(newValue);
            } else {
                setActiveBody(newValue);
            }

            // Restore focus and cursor (next tick)
            setTimeout(() => {
                element.focus();
                element.setSelectionRange(start + text.length, start + text.length);
            }, 0);
        }
    };

    // Generate Preview with Dummy Data
    const getPreview = (template: string) => {
        let content = template || '';

        const dummyData: Record<string, string> = {
            '{{name}}': 'Ahmet Yılmaz',
            '{{tckn}}': '12345678901',
            '{{phone}}': '0532 555 44 33',
            '{{email}}': 'ahmet@ornek.com',
            '{{address}}': 'Örnek Mah. Test Sok. No:1',
            '{{city}}': 'İstanbul',
            '{{district}}': 'Şişli',
            '{{deliveryMethod}}': 'Adres',
            '{{isDenizbankCustomer}}': 'Evet',
            '{{requestedAmount}}': '50.000 TL',
            '{{consents}}': 'KVKK: Evet',
            '{{date}}': new Date().toLocaleDateString('tr-TR'),
            '{{status}}': 'Onaylandı'
        };

        Object.keys(dummyData).forEach(key => {
            content = content.replaceAll(key, `<span class="bg-yellow-100 text-yellow-800 px-1 rounded">${dummyData[key]}</span>`);
        });

        return content;
    };

    const availableTags = isCreditCampaign
        ? ['{{name}}', '{{tckn}}', '{{phone}}', '{{requestedAmount}}', '{{isDenizbankCustomer}}', '{{date}}', '{{consents}}', '{{status}}']
        : ['{{name}}', '{{tckn}}', '{{email}}', '{{phone}}', '{{address}}', '{{city}}', '{{district}}', '{{deliveryMethod}}', '{{isDenizbankCustomer}}', '{{consents}}', '{{date}}', '{{status}}'];

    return (
        <div className="bg-white shadow sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                        E-posta Bildirim Ayarları
                    </h3>

                    {/* Campaign Selector - Only show if NO prop provided */}
                    {!propCampaignId && (
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700">Kampanya:</label>
                            <select
                                value={selectedCampaignId}
                                onChange={(e) => setSelectedCampaignId(e.target.value)}
                                className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            >
                                {campaigns.length === 0 && <option value="">Kampanya yok</option>}
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {loading && (
                    <p className="text-sm text-gray-500">Kampanya ve şablonlar yükleniyor...</p>
                )}

                <div className="space-y-4">
                    {configs.map(config => (
                        <div key={config.id} className="border rounded p-4 flex justify-between items-start bg-gray-50">
                            <div>
                                <div className="font-medium text-sm text-gray-900">
                                    {config.subject_template}
                                </div>
                                <div className="text-sm text-gray-500 mt-1 flex gap-2 items-center flex-wrap">
                                    <span className="bg-primary/10 text-talpa-navy px-2 py-0.5 rounded text-xs font-medium">
                                        Tetikleyici: {config.trigger_event || 'SUBMISSION'}
                                    </span>
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
                                        Alıcı: {config.recipient_type === 'applicant' ? 'Başvuran' : config.recipient_type === 'admin' ? 'Yönetici' : 'Özel'}
                                    </span>
                                    {config.is_active ? (
                                        <span className="text-green-600 text-xs font-bold">Aktif</span>
                                    ) : (
                                        <span className="text-red-600 text-xs font-bold">Pasif</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 text-sm">
                                <button onClick={() => setEditing(config)} className="text-primary hover:text-primary/80">Düzenle</button>
                                <button onClick={() => handleDelete(config.id)} className="text-red-600 hover:text-red-900">Sil</button>
                            </div>
                        </div>
                    ))}

                    {configs.length === 0 && !editing && (
                        <p className="text-sm text-gray-500 italic">Bu kampanya için henüz tanımlı e-posta kuralı yok.</p>
                    )}

                    {!editing && (
                        <button
                            onClick={() => {
                                const newConfig: Partial<EmailConfig> = { recipient_type: 'applicant', is_active: true, trigger_event: 'SUBMISSION', subject_template: '', body_template: '' };
                                setEditing(newConfig);
                                setActiveSubject(newConfig.subject_template || '');
                                setActiveBody(newConfig.body_template || '');
                            }}
                            className="mt-2 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-talpa-navy bg-primary/10 hover:bg-primary/15"
                        >
                            + Yeni Kural Ekle
                        </button>
                    )}
                </div>

                {editing && (
                    <div className="mt-8 border-t pt-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-6">{editing.id ? 'Kuralı Düzenle' : 'Yeni Kural'}</h4>

                        {/* Template Loader - Context Aware */}
                        <div className="mb-6 p-4 bg-primary/5 rounded-md border border-primary/15">
                            <label className="block text-sm font-bold text-talpa-navy mb-2">Hazır Şablon Yükle ({isCreditCampaign ? 'Kredi' : 'Genel'})</label>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setEditing(prev => ({
                                        ...prev,
                                        recipient_type: 'applicant',
                                        trigger_event: 'SUBMISSION',
                                        subject_template: 'Başvurunuz Alındı - {{name}}',
                                        body_template: isCreditCampaign ? `<p>Sayın <strong>{{name}}</strong>,</p>

<p>Denizbank İhtiyaç Kredisi başvurunuz başarıyla alınmıştır.</p>

<div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
    <h3 style="margin-top: 0; color: #002855; font-size: 16px;">Başvuru Detayları</h3>
    <ul style="list-style-type: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 8px;"><strong>Talep Edilen Tutar:</strong> {{requestedAmount}}</li>
        <li style="margin-bottom: 8px;"><strong>Müşteri Durumu:</strong> {{isDenizbankCustomer}}</li>
        <li style="margin-bottom: 8px;"><strong>TCKN:</strong> {{tckn}}</li>
        <li style="margin-bottom: 8px;"><strong>Telefon:</strong> {{phone}}</li>
        <li style="margin-bottom: 8px;"><strong>Tarih:</strong> {{date}}</li>
    </ul>
</div>

<p>Başvurunuz değerlendirildikten sonra tarafınıza dönüş yapılacaktır.</p>` :
                                            `<p>Sayın <strong>{{name}}</strong>,</p>

<p>TALPA & Denizbank iş birliği ile düzenlenen kampanyaya başvurunuz başarıyla sistemimize ulaşmıştır.</p>

<div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e2e8f0;">
    <h3 style="margin-top: 0; color: #002855; font-size: 16px;">Başvuru Özetiniz</h3>
    <ul style="list-style-type: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 8px;"><strong>TCKN:</strong> {{tckn}}</li>
        <li style="margin-bottom: 8px;"><strong>Telefon:</strong> {{phone}}</li>
        <li style="margin-bottom: 8px;"><strong>E-posta:</strong> {{email}}</li>
        <li style="margin-bottom: 8px;"><strong>Lokasyon:</strong> {{city}} / {{district}}</li>
        <li style="margin-bottom: 8px;"><strong>Teslimat Tercihi:</strong> {{deliveryMethod}}</li>
        <li style="margin-bottom: 8px;"><strong>Tarih:</strong> {{date}}</li>
    </ul>
</div>

<p>Başvurunuz en kısa sürede değerlendirilerek sonuç hakkında tarafınıza bilgilendirme yapılacaktır.</p>`
                                    }))}
                                    className="px-3 py-1.5 bg-white border border-primary/20 text-talpa-navy text-xs font-bold rounded hover:bg-primary/5"
                                >
                                    Başvuran: Yeni Başvuru
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEditing(prev => ({
                                        ...prev,
                                        recipient_type: 'applicant',
                                        trigger_event: 'STATUS_APPROVED',
                                        subject_template: 'Başvurunuz Onaylandı - {{name}}',
                                        body_template: `<p>Sayın <strong>{{name}}</strong>,</p>
<p>Başvurunuz incelenmiş ve <strong>ONAYLANMIŞTIR</strong>.</p>
<p>En kısa sürede işlemleriniz tamamlanacaktır.</p>`
                                    }))}
                                    className="px-3 py-1.5 bg-white border border-green-200 text-green-700 text-xs font-bold rounded hover:bg-green-50"
                                >
                                    Başvuran: Onaylandı
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setEditing(prev => ({
                                        ...prev,
                                        recipient_type: 'custom',
                                        recipient_email: 'talpa-basvuru@denizbank.com',
                                        trigger_event: 'SUBMISSION',
                                        subject_template: isCreditCampaign ? 'Kredi Başvurusu - {{name}} - {{tckn}}' : 'Yeni Müşteri Adayı - {{name}}',
                                        body_template: isCreditCampaign ? `<p>Sayın Yetkili,</p>

<p>Yeni bir kredi başvurusu alınmıştır:</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <tr><td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Ad Soyad</td><td style="padding: 10px; border: 1px solid #cbd5e1;">{{name}}</td></tr>
    <tr><td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">TCKN</td><td style="padding: 10px; border: 1px solid #cbd5e1;">{{tckn}}</td></tr>
    <tr><td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Talep</td><td style="padding: 10px; border: 1px solid #cbd5e1;">{{requestedAmount}}</td></tr>
    <tr><td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Müşteri?</td><td style="padding: 10px; border: 1px solid #cbd5e1;">{{isDenizbankCustomer}}</td></tr>
    <tr><td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold;">Telefon</td><td style="padding: 10px; border: 1px solid #cbd5e1;">{{phone}}</td></tr>
</table>
<p>Onaylar: {{consents}}</p>` :
                                            `<p>Sayın Yetkili,</p>
<p>Sistem üzerinden yeni bir kampanya başvurusu alınmıştır.</p>
<!-- Refer to Applicant Template for layout -->`
                                    }))}
                                    className="px-3 py-1.5 bg-white border border-primary/20 text-talpa-navy text-xs font-bold rounded hover:bg-primary/5"
                                >
                                    Banka: Yeni Başvuru
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <input type="hidden" name="campaignId" value={selectedCampaignId} />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900">Tetikleyici Olay</label>
                                    <select name="triggerEvent" defaultValue={editing.trigger_event || 'SUBMISSION'} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm sm:text-sm border p-2 text-gray-900">
                                        <option value="SUBMISSION">Yeni Başvuru (Submission)</option>
                                        <option value="STATUS_APPROVED">Durum: Onaylandı (Approved)</option>
                                        <option value="STATUS_REJECTED">Durum: Reddedildi (Rejected)</option>
                                    </select>
                                </div>
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
                                        {(isCreditCampaign
                                            ? ['{{name}}', '{{tckn}}', '{{phone}}', '{{requestedAmount}}', '{{isDenizbankCustomer}}', '{{date}}', '{{consents}}', '{{status}}']
                                            : ['{{name}}', '{{tckn}}', '{{email}}', '{{phone}}', '{{address}}', '{{city}}', '{{district}}', '{{deliveryMethod}}', '{{isDenizbankCustomer}}', '{{consents}}', '{{date}}', '{{status}}']
                                        ).map(tag => (
                                            <span
                                                key={tag}
                                                className="inline-block bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold text-gray-900 cursor-pointer hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors"
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
                                <input id="isActive" name="isActive" type="checkbox" defaultChecked={editing.is_active} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                                <label htmlFor="isActive" className="ml-2 block text-sm font-bold text-gray-900">Bu kural aktif</label>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">İptal</button>
                                <button
                                    type="submit"
                                    disabled={!selectedCampaignId}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-talpa-navy hover:bg-talpa-navy/80 disabled:opacity-50"
                                >
                                    Kaydet
                                </button>
                            </div>

                            {message && <p className="text-sm text-center text-primary">{message}</p>}
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

