'use client';

import { useState, useEffect } from 'react';
import { getCampaignById, updateCampaignConfig } from '../../../actions';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import FormBuilder, { FormField } from '../../../../components/FormBuilder';
import { Trash, Plus, LayoutTemplate, FileText, Mail } from 'lucide-react';
import EmailConfig from '../../components/EmailConfig';

// Define Feature type
interface ContentFeature {
    title: string;
    description: string;
}

export default function CampaignEditPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();


    const [campaignId, setCampaignId] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [campaign, setCampaign] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'form' | 'email'>('details');

    // Form State
    const [slug, setSlug] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(false);

    // Page Content Fields (Friendly UI)
    const [heroTitle, setHeroTitle] = useState('');
    const [heroSubtitle, setHeroSubtitle] = useState('');
    const [bannerImage, setBannerImage] = useState('');
    const [longDescription, setLongDescription] = useState('');
    const [features, setFeatures] = useState<ContentFeature[]>([]);

    // Page Content JSON (Advanced / Fallback)
    const [pageContentJson, setPageContentJson] = useState('{}');
    const [showRawContentJson, setShowRawContentJson] = useState(false);

    // Form Schema — visual builder state
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [showRawFormJson, setShowRawFormJson] = useState(false);
    const [formSchemaJson, setFormSchemaJson] = useState('[]');

    useEffect(() => {
        const unwrapParams = async () => {
            const resolvedParams = await params;
            setCampaignId(resolvedParams.id);
        };
        unwrapParams();
    }, [params]);

    useEffect(() => {
        if (!campaignId) return;

        const loadCampaign = async () => {
            setIsLoading(true);
            const data = await getCampaignById(campaignId);
            if (data) {
                setCampaign(data);
                setSlug(data.slug || '');
                setTitle(data.name || data.title || '');
                setDescription(data.description || '');
                setIsActive(data.is_active || false);

                // Initialize Content Fields
                const content = data.page_content || {};
                setPageContentJson(JSON.stringify(content, null, 2));

                setHeroTitle(content.heroTitle || '');
                setHeroSubtitle(content.heroSubtitle || '');
                setBannerImage(content.bannerImage || '');
                setLongDescription(content.longDescription || '');
                setFeatures(Array.isArray(content.features) ? content.features : []);

                const schema = data.form_schema || [];
                setFormFields(schema);
                setFormSchemaJson(JSON.stringify(schema, null, 2));
            } else {
                toast.error('Kampanya bulunamadı.');
                router.push('/admin/campaigns');
            }
            setIsLoading(false);
        };
        loadCampaign();
    }, [campaignId, router]);

    // Sync Friendly UI -> JSON
    useEffect(() => {
        if (!showRawContentJson) {
            const newContent = {
                heroTitle,
                heroSubtitle,
                bannerImage,
                longDescription,
                features
            };
            setPageContentJson(JSON.stringify(newContent, null, 2));
        }
    }, [heroTitle, heroSubtitle, bannerImage, longDescription, features, showRawContentJson]);

    // Sync JSON -> Friendly UI (when JSON is edited manually)
    const handleContentJsonChange = (json: string) => {
        setPageContentJson(json);
        try {
            const parsed = JSON.parse(json);
            setHeroTitle(parsed.heroTitle || '');
            setHeroSubtitle(parsed.heroSubtitle || '');
            setBannerImage(parsed.bannerImage || '');
            setLongDescription(parsed.longDescription || '');
            if (Array.isArray(parsed.features)) {
                setFeatures(parsed.features);
            }
        } catch {
            // Invalid JSON, ignore sync
        }
    };

    // Sync visual builder → JSON
    const handleFieldsChange = (fields: FormField[]) => {
        setFormFields(fields);
        setFormSchemaJson(JSON.stringify(fields, null, 2));
    };

    // Sync JSON → visual builder
    const handleFormJsonChange = (json: string) => {
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

    // Feature Management
    const addFeature = () => {
        setFeatures([...features, { title: '', description: '' }]);
    };

    const updateFeature = (index: number, key: keyof ContentFeature, value: string) => {
        const newFeatures = [...features];
        newFeatures[index][key] = value;
        setFeatures(newFeatures);
    };

    const removeFeature = (index: number) => {
        setFeatures(features.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (!campaignId) return;
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

            const res = await updateCampaignConfig(campaignId, {
                slug,
                name: title,
                description,
                is_active: isActive,
                page_content: parsedPageContent,
                form_schema: formFields
            }, campaign?.slug ?? null);

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

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'details'
                            ? 'border-[#002855] text-[#002855]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <LayoutTemplate className="w-4 h-4" />
                        Kampanya Detayları
                    </button>
                    <button
                        onClick={() => setActiveTab('form')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'form'
                            ? 'border-[#002855] text-[#002855]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Başvuru Formu
                    </button>
                    <button
                        onClick={() => setActiveTab('email')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'email'
                            ? 'border-[#002855] text-[#002855]'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Mail className="w-4 h-4" />
                        E-posta Ayarları
                    </button>
                </nav>
            </div>

            <div className="bg-white rounded-lg shadow p-6 min-h-[500px]">
                {/* Details Tab */}
                <div className={activeTab === 'details' ? 'block' : 'hidden'}>
                    <div className="grid grid-cols-1 gap-8">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold border-b pb-2">Temel Bilgiler</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Kampanya Başlığı (Admin)</label>
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
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Kısa Açıklama (SEO)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={2}
                                    className="mt-1 w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="active_check"
                                    checked={isActive}
                                    readOnly
                                    disabled
                                    className="w-5 h-5 text-gray-400 rounded bg-gray-100"
                                />
                                <label htmlFor="active_check" className="font-medium text-gray-500">
                                    Kampanya Aktif (Durum değiştirmek için Kampanya Listesi sayfasını kullanınız)
                                </label>
                            </div>
                        </div>

                        {/* Page Content Editor */}
                        <div className="space-y-4 border-t pt-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Sayfa İçeriği</h3>
                                <button
                                    onClick={() => setShowRawContentJson(!showRawContentJson)}
                                    className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50"
                                >
                                    {showRawContentJson ? 'Form Görünümüne Dön' : 'Gelişmiş JSON Editörü'}
                                </button>
                            </div>

                            {showRawContentJson ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">JSON Verisi</label>
                                    <textarea
                                        value={pageContentJson}
                                        onChange={(e) => handleContentJsonChange(e.target.value)}
                                        rows={15}
                                        className="w-full border rounded-lg px-3 py-2 font-mono text-xs bg-gray-50 focus:bg-white transition-colors"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Banner Görsel Linki</label>
                                            <input
                                                type="text"
                                                value={bannerImage}
                                                onChange={(e) => setBannerImage(e.target.value)}
                                                placeholder="https://..."
                                                className="mt-1 w-full border rounded-lg px-3 py-2"
                                            />
                                            {bannerImage && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={bannerImage} alt="Banner Preview" className="mt-2 h-20 w-auto object-cover rounded border" />
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Hero Başlık (Büyük Yazı)</label>
                                            <input
                                                type="text"
                                                value={heroTitle}
                                                onChange={(e) => setHeroTitle(e.target.value)}
                                                className="mt-1 w-full border rounded-lg px-3 py-2"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Hero Alt Başlık</label>
                                            <input
                                                type="text"
                                                value={heroSubtitle}
                                                onChange={(e) => setHeroSubtitle(e.target.value)}
                                                className="mt-1 w-full border rounded-lg px-3 py-2"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700">Detaylı Açıklama (HTML Destekli)</label>
                                            <textarea
                                                value={longDescription}
                                                onChange={(e) => setLongDescription(e.target.value)}
                                                rows={4}
                                                className="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm"
                                                placeholder="<p>Kampanya detayları...</p>"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-sm font-medium text-gray-700">Öne Çıkan Özellikler (Kutu Kutu Gözüken)</label>
                                        {features.map((feature, idx) => (
                                            <div key={idx} className="flex gap-4 items-start p-4 border rounded-lg bg-gray-50">
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        placeholder="Özellik Başlığı (örn: Ücretsiz Kargo)"
                                                        value={feature.title}
                                                        onChange={(e) => updateFeature(idx, 'title', e.target.value)}
                                                        className="w-full border rounded px-2 py-1 text-sm font-semibold"
                                                    />
                                                    <textarea
                                                        placeholder="Açıklama"
                                                        value={feature.description}
                                                        onChange={(e) => updateFeature(idx, 'description', e.target.value)}
                                                        rows={2}
                                                        className="w-full border rounded px-2 py-1 text-sm"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeFeature(idx)}
                                                    className="text-red-500 hover:text-red-700 p-1"
                                                    title="Sil"
                                                >
                                                    <Trash className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={addFeature}
                                            type="button"
                                            className="flex items-center gap-2 text-[#002855] font-medium text-sm hover:underline"
                                        >
                                            <Plus className="w-4 h-4" />
                                            + Özellik Ekle
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Form Tab */}
                <div className={activeTab === 'form' ? 'block' : 'hidden'}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Form Alanları</h3>
                            <button
                                onClick={() => setShowRawFormJson(!showRawFormJson)}
                                className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                {showRawFormJson ? '🎨 Görsel Editör' : '{ } Ham JSON'}
                            </button>
                        </div>

                        {showRawFormJson ? (
                            <textarea
                                value={formSchemaJson}
                                onChange={(e) => handleFormJsonChange(e.target.value)}
                                rows={15}
                                className="w-full border rounded-lg px-3 py-2 font-mono text-xs bg-gray-50 focus:bg-white transition-colors"
                            />
                        ) : (
                            <FormBuilder fields={formFields} onChange={handleFieldsChange} />
                        )}
                    </div>
                </div>

                {/* Email Tab */}
                <div className={activeTab === 'email' ? 'block' : 'hidden'}>
                    {campaignId && <EmailConfig campaignId={campaignId} />}
                    {!campaignId && <div className="text-center text-gray-500">Önce kampanyayı kaydediniz.</div>}
                </div>
            </div>
        </div>
    );
}
