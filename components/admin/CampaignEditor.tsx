'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/theme/Icon';
import { Campaign, FormField } from '@/types';
import Button from '@/components/theme/Button';
import Card from '@/components/theme/Card';
import Input from '@/components/theme/Input';
import CampaignFormBuilder from './CampaignFormBuilder';
import EmailConfig from './EmailConfig';
import { updateCampaignConfigAction } from '@/app/admin/actions';

type Tab = 'details' | 'form' | 'email';

interface CampaignEditorProps {
    campaign: Campaign;
}

const CampaignEditor: React.FC<CampaignEditorProps> = ({ campaign }) => {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('details');
    const [saving, setSaving] = useState(false);

    // Editable Fields
    const [title, setTitle] = useState(campaign.title || campaign.name || '');
    const [slug, setSlug] = useState(campaign.slug || '');
    const [description, setDescription] = useState(campaign.description || '');
    const [formFields, setFormFields] = useState<FormField[]>(campaign.formSchema || []);

    // Page Content
    const [heroTitle, setHeroTitle] = useState(campaign.pageContent?.heroTitle || '');
    const [heroSubtitle, setHeroSubtitle] = useState(campaign.pageContent?.heroSubtitle || '');
    const [bannerImage, setBannerImage] = useState(campaign.pageContent?.bannerImage || '');

    const handleSave = async () => {
        setSaving(true);

        // We'll pass everything as JSON to server action
        const payload = {
            title,
            slug,
            description,
            formSchema: formFields, // This will be JSON
            pageContent: {
                heroTitle,
                heroSubtitle,
                bannerImage
            }
        };

        const result = await updateCampaignConfigAction(campaign.id, payload);

        if (result.success) {
            alert('Değişiklikler kaydedildi.');
            router.refresh(); // Refresh server data
        } else {
            alert('Hata: ' + result.message);
        }
        setSaving(false);
    };

    return (
        <div className="flex flex-col space-y-6">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/admin/campaigns" className="text-slate-500 hover:text-talpa-navy transition-colors">
                        <Icon name="arrow_back" size="sm" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{title || 'Kampanya Düzenle'}</h1>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 font-mono">{campaign.campaignCode}</span>
                            <span className={`px-2 py-0.5 rounded-full ${campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                                {campaign.status}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    {campaign.slug && (
                        <a href={`/kampanya/${campaign.slug}`} target="_blank" rel="noreferrer">
                            <Button variant="secondary" leftIcon={<Icon name="visibility" size="sm" />}>Önizle</Button>
                        </a>
                    )}
                    <Button onClick={handleSave} isLoading={saving} leftIcon={<Icon name="save" size="sm" />}>
                        Kaydet
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-1 inline-flex w-fit">
                <button
                    onClick={() => setActiveTab('details')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'details' ? 'bg-talpa-navy text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    <Icon name="dashboard" size="sm" /> Detaylar & İçerik
                </button>
                <button
                    onClick={() => setActiveTab('form')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'form' ? 'bg-talpa-navy text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    <Icon name="description" size="sm" /> Başvuru Formu
                </button>
                <button
                    onClick={() => setActiveTab('email')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'email' ? 'bg-talpa-navy text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    <Icon name="mail" size="sm" /> E-posta Ayarları
                </button>
            </div>

            {/* Content */}
            <div className="w-full">
                {activeTab === 'details' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2">
                        <Card className="space-y-4">
                            <h3 className="font-bold text-slate-900 border-b pb-2">Temel Bilgiler</h3>
                            <Input label="Kampanya Başlığı" value={title} onChange={(e) => setTitle(e.target.value)} />
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-slate-700">Slug (URL)</label>
                                <div className="flex items-center">
                                    <span className="bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg px-3 py-2.5 text-slate-500 text-sm">/kampanya/</span>
                                    <input
                                        className="flex-1 rounded-r-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Kısa Açıklama</label>
                                <textarea
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                        </Card>

                        <Card className="space-y-4">
                            <h3 className="font-bold text-slate-900 border-b pb-2">Sayfa İçeriği</h3>
                            <Input label="Hero Başlık" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} />
                            <Input label="Hero Alt Başlık" value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} />
                            <Input label="Banner Görsel URL" value={bannerImage} onChange={(e) => setBannerImage(e.target.value)} />
                            {bannerImage && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 h-32 bg-slate-100 relative group">
                                    <img src={bannerImage} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-bold bg-black/50 px-2 py-1 rounded">Önizleme</span>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {activeTab === 'form' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="font-bold text-slate-900">Form Alanları ({formFields.length})</h3>
                            <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">Sürükle bırak özelliği için okları kullanın.</div>
                        </div>
                        <CampaignFormBuilder fields={formFields} onChange={setFormFields} />
                    </div>
                )}

                {activeTab === 'email' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <EmailConfig campaignId={campaign.id} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CampaignEditor;
