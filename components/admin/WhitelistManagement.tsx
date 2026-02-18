'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/theme/Icon';
import { WhitelistMember } from '@/types';
import Button from '@/components/theme/Button';
import Card from '@/components/theme/Card';
import Input from '@/components/theme/Input';
import Alert from '@/components/theme/Alert';
import {
    uploadWhitelist,
    uploadDebtorList,
    addWhitelistMember,
    updateWhitelistMember, // This expects (id, isActive)
    deleteWhitelistMember
} from '@/app/admin/actions';

interface WhitelistManagementProps {
    initialMembers: WhitelistMember[];
}

const WhitelistManagement: React.FC<WhitelistManagementProps> = ({ initialMembers }) => {
    const router = useRouter();
    const [members, setMembers] = useState<WhitelistMember[]>(initialMembers);
    const [filteredMembers, setFilteredMembers] = useState<WhitelistMember[]>(initialMembers);
    const [searchTerm, setSearchTerm] = useState('');

    // Status
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [debtorUploading, setDebtorUploading] = useState(false);
    const [adding, setAdding] = useState(false);

    // UI State
    const [showAddForm, setShowAddForm] = useState(false);

    // Refs
    const whitelistFileRef = useRef<HTMLInputElement>(null);
    const debtorFileRef = useRef<HTMLInputElement>(null);
    const addFormRef = useRef<HTMLFormElement>(null);

    // New Member Data
    const [newMemberData, setNewMemberData] = useState({ tckn: '', name: '', isActive: true });

    React.useEffect(() => {
        setMembers(initialMembers);
    }, [initialMembers]);

    useEffect(() => {
        const term = searchTerm.toLowerCase();
        setFilteredMembers(
            members.filter(m =>
                (m.tckn || '').includes(term) ||
                (m.fullName || m.maskedName || '').toLowerCase().includes(term)
            )
        );
    }, [searchTerm, members]);

    const handleWhitelistUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        const file = whitelistFileRef.current?.files?.[0];
        if (!file) {
            setMessage({ text: 'Lütfen bir dosya seçiniz.', type: 'error' });
            return;
        }

        setUploading(true);
        setMessage(null);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadWhitelist(null, formData);
            setMessage({ text: result.message, type: result.success ? 'success' : 'error' });

            if (result.success) {
                if (whitelistFileRef.current) whitelistFileRef.current.value = '';
                router.refresh();
            }
        } catch (err: any) {
            setMessage({ text: 'Yükleme sırasında hata oluştu: ' + err.message, type: 'error' });
        } finally {
            setUploading(false);
        }
    };

    const handleDebtorUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        const file = debtorFileRef.current?.files?.[0];
        if (!file) {
            setMessage({ text: 'Lütfen bir dosya seçiniz.', type: 'error' });
            return;
        }

        setDebtorUploading(true);
        setMessage(null);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const result = await uploadDebtorList(null, formData);
            setMessage({ text: result.message, type: result.success ? 'success' : 'error' });

            if (result.success) {
                if (debtorFileRef.current) debtorFileRef.current.value = '';
                router.refresh();
            }
        } catch (err: any) {
            setMessage({ text: 'Yükleme sırasında hata oluştu: ' + err.message, type: 'error' });
        } finally {
            setDebtorUploading(false);
        }
    };

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        setMessage(null);
        try {
            const formData = new FormData();
            formData.append('tckn', newMemberData.tckn);
            formData.append('name', newMemberData.name);
            if (newMemberData.isActive) formData.append('is_active', 'on');

            const result = await addWhitelistMember(null, formData);
            setMessage({ text: result.message, type: result.success ? 'success' : 'error' });

            if (result.success) {
                setNewMemberData({ tckn: '', name: '', isActive: true });
                setShowAddForm(false);
                router.refresh();
            }
        } catch (err: any) {
            setMessage({ text: 'Üye eklenirken hata oluştu.', type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        // Optimistic
        setMembers(prev => prev.map(m => m.id === id ? { ...m, isActive: !currentStatus } : m));

        const result = await updateWhitelistMember(id, !currentStatus);
        if (!result.success) {
            alert(result.message);
            router.refresh(); // Revert
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bu üyeyi silmek istediğinize emin misiniz?')) return;

        // Optimistic
        setMembers(prev => prev.filter(m => m.id !== id));

        const result = await deleteWhitelistMember(id);
        if (!result.success) {
            alert(result.message);
            router.refresh();
        }
    };

    const handleRefresh = () => {
        router.refresh();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Whitelist Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-1">Üye listesini güncelleyin ve yetkileri yönetin.</p>
                </div>
                <Button onClick={handleRefresh} variant="ghost" size="sm" leftIcon={<Icon name="refresh" size="sm" />}>
                    Yenile
                </Button>
            </div>

            {message && (
                <Alert variant={message.type === 'success' ? 'success' : 'error'}>
                    {message.text}
                </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Whitelist Upload */}
                <Card className="border-t-4 border-t-talpa-navy shadow-md">
                    <div className="flex items-start gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-talpa-navy rounded-lg">
                            <Icon name="description" size="sm" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Whitelist Yükle</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Normal üye listesini güncellemek için CSV yükleyin.</p>
                        </div>
                    </div>

                    <form onSubmit={handleWhitelistUpload} className="flex gap-3 items-end mt-4">
                        <div className="flex-1">
                            <input
                                type="file"
                                accept=".csv"
                                ref={whitelistFileRef}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-talpa-navy hover:file:bg-blue-100"
                            />
                        </div>
                        <Button type="submit" isLoading={uploading} size="sm" leftIcon={<Icon name="upload" size="sm" />}>
                            Yükle
                        </Button>
                    </form>
                </Card>

                {/* Debtor Upload */}
                <Card className="border-t-4 border-t-red-600 shadow-md">
                    <div className="flex items-start gap-3 mb-2">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg">
                            <Icon name="warning" size="sm" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Borçlu Listesi Yükle</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Borcu olan üyeleri işaretle (Başvuruları engellenecek).</p>
                        </div>
                    </div>

                    <form onSubmit={handleDebtorUpload} className="flex gap-3 items-end mt-4">
                        <div className="flex-1">
                            <input
                                type="file"
                                accept=".csv"
                                ref={debtorFileRef}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                            />
                        </div>
                        <Button type="submit" variant="danger" size="sm" isLoading={debtorUploading} leftIcon={<Icon name="upload" size="sm" />}>
                            İşaretle
                        </Button>
                    </form>
                </Card>
            </div>

            {/* Member List Header & Add Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-72">
                    <input
                        type="text"
                        placeholder="TCKN veya İsim ile ara..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Icon name="search" size="sm" className="absolute left-3 top-2.5 text-slate-400" />
                </div>

                <Button variant="secondary" size="sm" onClick={() => setShowAddForm(!showAddForm)} leftIcon={<Icon name="person_add" size="sm" />}>
                    {showAddForm ? 'İptal' : 'Yeni Üye Ekle'}
                </Button>
            </div>

            {/* Manual Add Form */}
            {showAddForm && (
                <Card className="animate-in fade-in slide-in-from-top-2 border border-slate-200 shadow-md">
                    <h3 className="font-bold text-slate-900 mb-4 text-sm">Manuel Üye Kaydı</h3>
                    <form onSubmit={handleAddMember} ref={addFormRef} className="flex flex-col md:flex-row gap-4 items-end">
                        <Input
                            label="T.C. Kimlik No"
                            placeholder="11111111111"
                            maxLength={11}
                            required
                            value={newMemberData.tckn}
                            onChange={(e) => setNewMemberData({ ...newMemberData, tckn: e.target.value.replace(/\D/g, '') })}
                            className="flex-1"
                        />
                        <Input
                            label="İsim Soyisim (Opsiyonel)"
                            placeholder="Ad Soyad"
                            value={newMemberData.name}
                            onChange={(e) => setNewMemberData({ ...newMemberData, name: e.target.value })}
                            className="flex-1"
                        />
                        <div className="mb-3 h-11 flex items-center">
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    className="rounded text-talpa-navy focus:ring-primary h-4 w-4"
                                    checked={newMemberData.isActive}
                                    onChange={(e) => setNewMemberData({ ...newMemberData, isActive: e.target.checked })}
                                />
                                <span className="text-sm text-slate-700 font-medium">Aktif Durumda</span>
                            </label>
                        </div>
                        <Button type="submit" isLoading={adding}>Kaydet</Button>
                    </form>
                </Card>
            )}

            {/* Table */}
            <Card padding="none" className="overflow-hidden border border-slate-200 shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">TCKN</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">İsim Soyisim</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Son Güncelleme</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {filteredMembers.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Kayıt bulunamadı.</td></tr>
                            ) : (
                                filteredMembers.slice(0, 50).map((member) => (
                                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-mono text-slate-600 font-medium">
                                            {member.tckn}
                                            {member.isDebtor && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">
                                                    BORÇLU
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{member.fullName || member.maskedName || '-'}</td>
                                        <td className="px-6 py-4">
                                            {member.isActive ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                    <Icon name="check_circle" size="xs" /> Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                    <Icon name="power_settings_new" size="xs" /> Pasif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500">
                                            {member.updatedAt ? new Date(member.updatedAt).toLocaleString('tr-TR') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleToggleStatus(member.id, member.isActive)}
                                                    className={`p-2 rounded-lg transition-colors ${member.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                                                    title={member.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                                                >
                                                    <Icon name="power_settings_new" size="sm" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(member.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
                                                    <Icon name="delete" size="sm" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filteredMembers.length > 50 && (
                    <div className="px-6 py-3 border-t border-slate-100 text-center text-xs text-slate-500 bg-slate-50/30">
                        Performans için sadece ilk 50 kayıt gösteriliyor. Tam liste için arama yapınız.
                    </div>
                )}
            </Card>
        </div>
    );
};

export default WhitelistManagement;
