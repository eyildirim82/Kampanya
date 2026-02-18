'use client';

import React, { useState, useEffect } from 'react';
import Icon from '@/components/theme/Icon';
import Card from '@/components/theme/Card';
import Input from '@/components/theme/Input';
import Button from '@/components/theme/Button';
import Alert from '@/components/theme/Alert';
import { EmailConfig as EmailConfigType } from '@/types';
import { getEmailConfigs, saveEmailConfig } from '@/app/admin/actions';

interface EmailConfigProps {
    campaignId: string;
}

const EmailConfig: React.FC<EmailConfigProps> = ({ campaignId }) => {
    const [configs, setConfigs] = useState<EmailConfigType[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingConfig, setEditingConfig] = useState<Partial<EmailConfigType> | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    useEffect(() => {
        loadConfigs();
    }, [campaignId]);

    const loadConfigs = async () => {
        setLoading(true);
        const data = await getEmailConfigs(campaignId);
        setConfigs(data as EmailConfigType[]);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!editingConfig || !editingConfig.subjectTemplate) return;

        // Construct FormData for Server Action
        const formData = new FormData();
        if (editingConfig.id) formData.append('id', editingConfig.id);
        formData.append('campaignId', campaignId);
        formData.append('recipientType', editingConfig.recipientType || 'applicant');
        formData.append('subjectTemplate', editingConfig.subjectTemplate);
        formData.append('bodyTemplate', editingConfig.bodyTemplate || '');
        if (editingConfig.isActive) formData.append('isActive', 'on');

        const result = await saveEmailConfig(null, formData);
        if (result.success) {
            setSaveMessage(result.message || 'Kaydedildi');
            setEditingConfig(null);
            loadConfigs();
            setTimeout(() => setSaveMessage(null), 3000);
        } else {
            setSaveMessage(result.message || 'Hata oluştu');
        }
    };

    if (loading) return <div>Yükleniyor...</div>;

    return (
        <div className="space-y-6">
            {saveMessage && <Alert variant="success">{saveMessage}</Alert>}

            {!editingConfig ? (
                <>
                    <div className="grid grid-cols-1 gap-4">
                        {configs.map(config => (
                            <Card key={config.id} padding="sm" className="flex justify-between items-center">
                                <div>
                                    <h4 className="font-semibold text-slate-800">{config.subjectTemplate}</h4>
                                    <p className="text-sm text-slate-500">Alıcı: {config.recipientType === 'applicant' ? 'Başvuru Sahibi' : 'Yönetici'}</p>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => setEditingConfig(config)}>Düzenle</Button>
                            </Card>
                        ))}
                        {configs.length === 0 && (
                            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                                Henüz e-posta şablonu eklenmemiş.
                            </div>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        fullWidth
                        leftIcon={<Icon name="add" size="sm" />}
                        onClick={() => setEditingConfig({ recipientType: 'applicant', isActive: true })}
                    >
                        Yeni Şablon Ekle
                    </Button>
                </>
            ) : (
                <Card className="space-y-4 animate-in fade-in slide-in-from-right-4">
                    <h3 className="font-bold text-slate-900 border-b pb-2 mb-4">E-posta Şablonu Düzenle</h3>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Alıcı Tipi</label>
                        <select
                            className="flex h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={editingConfig.recipientType}
                            onChange={(e) => setEditingConfig({ ...editingConfig, recipientType: e.target.value as any })}
                        >
                            <option value="applicant">Başvuru Sahibi</option>
                            <option value="admin">Yönetici</option>
                        </select>
                    </div>

                    <Input
                        label="Konu Başlığı (Subject)"
                        placeholder="Örn: Başvurunuz Alındı - {{name}}"
                        value={editingConfig.subjectTemplate || ''}
                        onChange={(e) => setEditingConfig({ ...editingConfig, subjectTemplate: e.target.value })}
                        helperText="Değişkenler: {{name}}, {{tckn}}, {{date}}"
                    />

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">İçerik (HTML)</label>
                        <textarea
                            rows={6}
                            className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="<html>...</html>"
                            value={editingConfig.bodyTemplate || ''}
                            onChange={(e) => setEditingConfig({ ...editingConfig, bodyTemplate: e.target.value })}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button onClick={handleSave} leftIcon={<Icon name="save" size="sm" />}>Kaydet</Button>
                        <Button variant="ghost" onClick={() => setEditingConfig(null)}>İptal</Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default EmailConfig;
