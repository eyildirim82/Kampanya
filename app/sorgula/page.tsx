'use client';

import { useState } from 'react';
import { queryApplicationStatus } from '@/app/actions';
import { Input } from '@/components/theme/Input';
import { Button } from '@/components/theme/Button';
import { Card } from '@/components/theme/Card';
import { Badge } from '@/components/theme/Badge';

export default function InquiryPage() {
    const [tckn, setTckn] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await queryApplicationStatus(tckn, phone);
            if (response.success) {
                setResult(response.applications);
            } else {
                setError(response.message);
            }
        } catch {
            setError('Bir hata oluştu. Lütfen tekrar deneyiniz.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge variant="success">Onaylandı</Badge>;
            case 'REJECTED': return <Badge variant="danger">Reddedildi</Badge>;
            case 'PENDING': return <Badge variant="warning">Onay Bekliyor</Badge>;
            case 'REVIEWING': return <Badge variant="info">İnceleniyor</Badge>;
            default: return <Badge variant="default">{status}</Badge>;
        }
    };

    return (
        <div className="min-h-screen bg-talpa-bg flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 animate-fade-in-up">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-2">Başvuru Sorgulama</h1>
                    <p className="text-slate-400">Başvurunuzun güncel durumunu öğrenin</p>
                </div>

                <Card className="p-6 md:p-8 bg-white shadow-xl rounded-2xl">
                    <form onSubmit={handleQuery} className="space-y-4">
                        <Input
                            id="tckn"
                            label="T.C. Kimlik Numarası"
                            value={tckn}
                            onChange={(e) => setTckn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                            maxLength={11}
                            placeholder="11 haneli numaranız"
                            required
                        />
                        <Input
                            id="phone"
                            label="Telefon Numarası"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="05xxxxxxxxx"
                            hint="Başvuruda kullandığınız numara"
                            required
                        />

                        <Button
                            type="submit"
                            fullWidth
                            isLoading={loading}
                            disabled={tckn.length !== 11 || !phone}
                        >
                            Sorgula
                        </Button>
                    </form>

                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {result && (
                        <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <h3 className="font-semibold text-talpa-navy border-b border-slate-100 pb-2">Sonuçlar</h3>
                            {result.map((app: any) => (
                                <div key={app.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center group hover:border-talpa-blue-200 transition-colors">
                                    <div>
                                        <p className="font-medium text-slate-700">{app.campaignName}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(app.createdAt).toLocaleDateString('tr-TR')}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        {getStatusBadge(app.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <div className="text-center">
                    <a href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
                        ← Ana Sayfaya Dön
                    </a>
                </div>
            </div>
        </div>
    );
}
