'use client';

import { useTransition, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Institution = {
    id: string;
    name: string;
    code: string;
};

type CampaignData = {
    id?: string;
    name?: string;
    campaign_code?: string;
    description?: string;
    institution_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    max_quota?: number | null;
    form_schema?: object;
    page_content?: object;
};

type Props = {
    institutions: Institution[];
    defaultValues?: CampaignData;
    mode: 'create' | 'edit';
    submitAction: (formData: FormData) => Promise<{ success: boolean; message: string }>;
};

export default function CampaignForm({ institutions, defaultValues, mode, submitAction }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);

        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const result = await submitAction(formData);
            if (result.success) {
                toast.success(result.message);
                router.push('/admin/campaigns');
                router.refresh();
            } else {
                setError(result.message);
                toast.error(result.message);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow sm:rounded-lg p-6">
            {error && (
                <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Campaign Name */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Kampanya Adı <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    defaultValue={defaultValues?.name || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                    placeholder="ör. DenizBank Private Card Kampanyası"
                />
            </div>

            {/* Campaign Code */}
            <div>
                <label htmlFor="campaignCode" className="block text-sm font-medium text-gray-700">
                    Kampanya Kodu
                </label>
                <input
                    type="text"
                    name="campaignCode"
                    id="campaignCode"
                    defaultValue={defaultValues?.campaign_code || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border font-mono"
                    placeholder="Boş bırakılırsa addan otomatik üretilir"
                />
                <p className="mt-1 text-xs text-gray-500">ör. PRIVATE_CARD_2026</p>
            </div>

            {/* Institution */}
            <div>
                <label htmlFor="institutionId" className="block text-sm font-medium text-gray-700">
                    Kurum
                </label>
                <select
                    name="institutionId"
                    id="institutionId"
                    defaultValue={defaultValues?.institution_id || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                >
                    <option value="">— Kurum seçin —</option>
                    {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                            {inst.name} ({inst.code})
                        </option>
                    ))}
                </select>
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Açıklama
                </label>
                <textarea
                    name="description"
                    id="description"
                    rows={3}
                    defaultValue={defaultValues?.description || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                    placeholder="Kampanya açıklaması (isteğe bağlı)"
                />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                        Başlangıç Tarihi
                    </label>
                    <input
                        type="date"
                        name="startDate"
                        id="startDate"
                        defaultValue={defaultValues?.start_date || ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                    />
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                        Bitiş Tarihi
                    </label>
                    <input
                        type="date"
                        name="endDate"
                        id="endDate"
                        defaultValue={defaultValues?.end_date || ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                    />
                </div>
            </div>

            {/* Max Quota */}
            <div>
                <label htmlFor="maxQuota" className="block text-sm font-medium text-gray-700">
                    Maksimum Kota
                </label>
                <input
                    type="number"
                    name="maxQuota"
                    id="maxQuota"
                    min="1"
                    defaultValue={defaultValues?.max_quota || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                    placeholder="Boş bırakılırsa sınırsız"
                />
                <p className="mt-1 text-xs text-gray-500">Maksimum başvuru sayısı. Boş = sınırsız.</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <Link
                    href="/admin/campaigns"
                    className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                    ← İptal
                </Link>
                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#002855] hover:bg-[#003a75] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                >
                    {isPending ? 'Kaydediliyor...' : mode === 'create' ? 'Kampanya Oluştur' : 'Güncelle'}
                </button>
            </div>
        </form>
    );
}
