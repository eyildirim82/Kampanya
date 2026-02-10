'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCampaigns, getEmailConfigs, sendTestEmail } from '../actions';

type Campaign = {
    id: string;
    name?: string;
    title?: string;
    campaign_code?: string;
};

type EmailConfig = {
    id: string;
    campaign_id: string;
    subject_template: string;
    body_template: string;
    recipient_type: 'applicant' | 'admin' | 'custom';
};

const demoPayload = {
    name: 'Ahmet Yilmaz',
    full_name: 'Ahmet Yilmaz',
    email: 'ahmet@example.com',
    tckn: '12345678901',
    phone: '5551234567',
    address: 'Bakirkoy / Istanbul',
    city: 'Istanbul',
    district: 'Bakirkoy',
    deliveryMethod: 'Subeden Teslim',
    requestedAmount: '2.000.000 TL',
    isDenizbankCustomer: 'Evet',
    consents: 'KVKK ve acik riza onaylandi',
    date: new Date().toLocaleDateString('tr-TR')
};

function compileTemplate(source: string, payload: Record<string, string>) {
    return Object.entries(payload).reduce((acc, [key, value]) => {
        return acc
            .replaceAll(`{{${key}}}`, value)
            .replaceAll(`{{${key.toLowerCase()}}}`, value);
    }, source || '');
}

export default function TemplateTester() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [campaignId, setCampaignId] = useState('');
    const [configs, setConfigs] = useState<EmailConfig[]>([]);
    const [templateId, setTemplateId] = useState('');
    const [testRecipient, setTestRecipient] = useState('');
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await getCampaigns();
            setCampaigns(data);
            if (data.length > 0) {
                setCampaignId(data[0].id);
            }
        };
        void load();
    }, []);

    useEffect(() => {
        const loadConfigs = async () => {
            if (!campaignId) {
                setConfigs([]);
                return;
            }
            const data = await getEmailConfigs(campaignId);
            setConfigs(data);
            setTemplateId((prev) => prev || (data[0]?.id ?? ''));
        };
        void loadConfigs();
    }, [campaignId]);

    const selectedTemplate = useMemo(
        () => configs.find((item) => item.id === templateId),
        [configs, templateId]
    );

    const previewSubject = useMemo(() => {
        return compileTemplate(selectedTemplate?.subject_template || '', demoPayload);
    }, [selectedTemplate]);

    const previewBody = useMemo(() => {
        return compileTemplate(selectedTemplate?.body_template || '', demoPayload);
    }, [selectedTemplate]);

    const handleSend = async () => {
        setStatusMessage(null);

        if (!campaignId || !templateId || !testRecipient) {
            setStatusMessage('Kampanya, şablon ve test alıcısı zorunludur.');
            return;
        }

        setIsSending(true);
        const result = await sendTestEmail({
            campaignId,
            templateId,
            testRecipient
        });
        setIsSending(false);
        setStatusMessage(result.message || (result.success ? 'Test gönderimi başarılı.' : 'Test gönderimi başarısız.'));
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Kampanya</label>
                    <select
                        value={campaignId}
                        onChange={(e) => setCampaignId(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    >
                        {campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                                {campaign.name || campaign.title || campaign.campaign_code || campaign.id}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Şablon</label>
                    <select
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    >
                        {configs.map((config) => (
                            <option key={config.id} value={config.id}>
                                {config.subject_template}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Test Alıcı E-posta</label>
                    <input
                        type="email"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        placeholder="test@example.com"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
                    />
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-800">Önizleme</h3>
                <p className="mt-2 text-xs text-gray-500">
                    Aşağıdaki içerik örnek veri ile render edilir. Gerçek test gönderimi seçtiğiniz şablonun güncel halini kullanır.
                </p>
                <div className="mt-4 space-y-3">
                    <div>
                        <p className="text-xs font-semibold text-gray-600">Konu</p>
                        <p className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-900">{previewSubject || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-600">İçerik</p>
                        <div
                            className="rounded bg-gray-50 px-3 py-2 text-sm text-gray-900"
                            dangerouslySetInnerHTML={{ __html: previewBody || '<p>-</p>' }}
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handleSend}
                    disabled={isSending}
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                    {isSending ? 'Gönderiliyor...' : 'Test E-postası Gönder'}
                </button>
                {statusMessage && <p className="text-sm text-indigo-700">{statusMessage}</p>}
            </div>
        </div>
    );
}
