'use client';

import { useState, useEffect } from 'react';
import { getCampaignById, updateCampaignConfig } from '../../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import FormBuilder, { FormField } from '../../components/FormBuilder';

export default function CampaignEditPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [campaign, setCampaign] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [slug, setSlug] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(false);

    // Page Content JSON
    const [pageContentJson, setPageContentJson] = useState('{}');

    // Form Schema — visual builder state
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [showRawJson, setShowRawJson] = useState(false);
    const [formSchemaJson, setFormSchemaJson] = useState('[]');

    useEffect(() => {
        loadCampaign();
    }, [params.id]);

    const loadCampaign = async () => {
        setIsLoading(true);
        const data = await getCampaignById(params.id);
        if (data) {
            setCampaign(data);
            setSlug(data.slug || '');
            setTitle(data.name || data.title || '');
            setDescription(data.description || '');
            setIsActive(data.is_active || false);
            setPageContentJson(JSON.stringify(data.page_content || {}, null, 2));
            const schema = data.form_schema || [];
            setFormFields(schema);
            setFormSchemaJson(JSON.stringify(schema, null, 2));
        } else {
            toast.error('Kampanya bulunamadı.');
            router.push('/admin/campaigns');
        }
        setIsLoading(false);
    };

    // Sync visual builder → JSON
    const handleFieldsChange = (fields: FormField[]) => {
        setFormFields(fields);
        setFormSchemaJson(JSON.stringify(fields, null, 2));
    };

    // Sync JSON → visual builder
    const handleJsonChange = (json: string) => {
        setFormSchemaJson(json);
        try {
            const parsed = JSON.parse(json);
            if (Array.isArray(parsed)) {
                setFormFields(parsed);
            }
        } catch {
            // Invalid JSON, don't update visual builder
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            let parsedPageContent;
            try {
                parsedPageContent = JSON.parse(pageContentJson);
            } catch {
                toast.error('Sayfa İçeriği JSON formatı hatalı.');
                setIsSaving(false);
                return;
            }

            const res = await updateCampaignConfig(params.id, {
                slug,
                name: title,
                description,
                is_active: isActive,
                page_content: parsedPageContent,
                form_schema: formFields
            });

            if (res.success) {
                toast.success('Kampanya güncellendi.');
                router.refresh();
            } else {
                toast.error('Hata: ' + res.message);
            }
        } catch (error) {
            console.error(error);
            toast.error('Bir hata oluştu.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center">Yükleniyor...</div>;
    if (!campaign) return <div className="p-10 text-center">Bulunamadı.</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/admin/campaigns" className="text-gray-500 hover:text-gray-900">&larr; Geri</Link>
                    <h1 className="text-2xl font-bold text-gray-900">Kampanya Düzenle: {campaign.name}</h1>
                </div>
                <div className="flex gap-2">
                    <Link href={`/kampanya/${slug}`} target="_blank" className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">
                        Önizle
                    </Link>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-[#002855] text-white px-6 py-2 rounded-lg hover:bg-[#003366] disabled:opacity-50"
                    >
                        {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Temel Bilgiler</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Kampanya Başlığı</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 w-full border rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Slug (URL)</label>
                            <div className="flex items-center">
                                <span className="text-gray-500 bg-gray-50 border border-r-0 rounded-l-lg px-3 py-2 text-sm">/kampanya/</span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    className="mt-1 w-full border rounded-r-lg px-3 py-2"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="mt-1 w-full border rounded-lg px-3 py-2"
                            />
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="active_check"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="w-5 h-5 text-[#002855] rounded"
                            />
                            <label htmlFor="active_check" className="font-medium text-gray-700">Kampanya Aktif</label>
                        </div>
                    </div>

                    {/* Page Content JSON */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">İçerik Editörü (JSON)</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                                <span>Sayfa İçeriği (Banner, Özellikler)</span>
                                <span className="text-xs text-gray-500 font-normal">heroTitle, heroSubtitle, bannerImage, features...</span>
                            </label>
                            <textarea
                                value={pageContentJson}
                                onChange={(e) => setPageContentJson(e.target.value)}
                                rows={10}
                                className="w-full border rounded-lg px-3 py-2 font-mono text-xs bg-gray-50 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Form Builder */}
                <div className="space-y-4 border-t pt-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Form Alanları</h3>
                        <button
                            onClick={() => setShowRawJson(!showRawJson)}
                            className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
                        >
                            {showRawJson ? '🎨 Görsel Editör' : '{ } Ham JSON'}
                        </button>
                    </div>

                    {showRawJson ? (
                        <textarea
                            value={formSchemaJson}
                            onChange={(e) => handleJsonChange(e.target.value)}
                            rows={15}
                            className="w-full border rounded-lg px-3 py-2 font-mono text-xs bg-gray-50 focus:bg-white transition-colors"
                        />
                    ) : (
                        <FormBuilder fields={formFields} onChange={handleFieldsChange} />
                    )}
                </div>
            </div>
        </div>
    );
}
