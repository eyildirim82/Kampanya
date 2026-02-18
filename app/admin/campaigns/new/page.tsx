'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/theme/Icon';
import Link from 'next/link';
import Button from '@/components/theme/Button';
import Card from '@/components/theme/Card';
import Input from '@/components/theme/Input';
import Alert from '@/components/theme/Alert';
import { createCampaignAction } from '../create-action';

export default function NewCampaignPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const result = await createCampaignAction(formData);

        if (result.success) {
            router.push(`/admin/campaigns/${result.campaignId}`);
        } else {
            setError(result.message || 'Bir hata oluştu.');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/admin/campaigns" className="text-slate-500 hover:text-talpa-navy">
                    <Icon name="arrow_back" size="md" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">Yeni Kampanya Oluştur</h1>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        name="title"
                        label="Kampanya Başlığı"
                        placeholder="Örn: 2024 Özel Kredi Kampanyası"
                        required
                    />

                    <Input
                        name="campaignCode"
                        label="Kampanya Kodu (Opsiyonel)"
                        placeholder="Örn: KRD-2024-001"
                        helperText="Boş bırakılırsa otomatik oluşturulur."
                    />

                    <div className="pt-4 flex justify-end">
                        <Button
                            type="submit"
                            isLoading={loading}
                            leftIcon={<Icon name="add" size="sm" />}
                        >
                            Oluştur ve Düzenlemeye Başla
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
