'use client';

import { useState } from 'react';
import { updateApplicationStatus, updateApplicationNotes } from '../actions';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { toast } from 'sonner';

interface Application {
    id: string;
    tckn: string;
    full_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    delivery_method?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVIEWING';
    admin_notes?: string;
    form_data?: any;
    created_at: string;
    kvkk_consent?: boolean;
    open_consent?: boolean;
}

interface ApplicationDetailModalProps {
    application: Application;
    isOpen: boolean;
    onClose: () => void;
    isCreditCampaign?: boolean;
}

export default function ApplicationDetailModal({ application, isOpen, onClose, isCreditCampaign }: ApplicationDetailModalProps) {
    const router = useRouter();
    const [status, setStatus] = useState(application.status || 'PENDING');
    const [notes, setNotes] = useState(application.admin_notes || '');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const statusRes = await updateApplicationStatus(application.id, status);
            const notesRes = await updateApplicationNotes(application.id, notes);

            if (statusRes.success && notesRes.success) {
                toast.success('Değişiklikler kaydedildi.');
                router.refresh();
                onClose();
            } else {
                toast.error('Kaydedilirken bir hata oluştu.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Beklenmedik bir hata.');
        } finally {
            setIsSaving(false);
        }
    };

    const statusColors = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        APPROVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-800',
        REVIEWING: 'bg-blue-100 text-blue-800'
    };

    const statusLabels = {
        PENDING: 'Beklemede',
        APPROVED: 'Onaylandı',
        REJECTED: 'Reddedildi',
        REVIEWING: 'İnceleniyor'
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">

                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Başvuru Detayı
                                </h3>

                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Kimlik Bilgileri */}
                                    <div className="col-span-2 sm:col-span-1">
                                        <p className="text-sm font-bold text-gray-500">TCKN</p>
                                        <p className="text-base text-gray-900">{application.tckn}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <p className="text-sm font-bold text-gray-500">Ad Soyad</p>
                                        <p className="text-base text-gray-900">{application.full_name || application.form_data?.fullName}</p>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <p className="text-sm font-bold text-gray-500">Telefon</p>
                                        <p className="text-base text-gray-900">{application.phone || application.form_data?.phone}</p>
                                    </div>
                                    {!isCreditCampaign && (
                                        <div className="col-span-2 sm:col-span-1">
                                            <p className="text-sm font-bold text-gray-500">E-posta</p>
                                            <p className="text-base text-gray-900">{application.email}</p>
                                        </div>
                                    )}

                                    {/* Kampanya Özel Alanlar */}
                                    {isCreditCampaign ? (
                                        <>
                                            <div className="col-span-2 sm:col-span-1">
                                                <p className="text-sm font-bold text-gray-500">Talep Edilen Tutar</p>
                                                <p className="text-base text-gray-900 font-semibold">{application.form_data?.requestedAmount} TL</p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1">
                                                <p className="text-sm font-bold text-gray-500">Müşteri Durumu</p>
                                                <p className="text-base text-gray-900">{application.form_data?.isDenizbankCustomer === 'yes' ? 'Evet' : 'Hayır'}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="col-span-2">
                                            <p className="text-sm font-bold text-gray-500">Adres</p>
                                            <p className="text-sm text-gray-900">{application.address}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Teslimat: {(application.delivery_method || application.form_data?.deliveryMethod) === 'branch' ? 'Şube' : 'Adres'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Onaylar */}
                                    <div className="col-span-2 border-t border-gray-100 pt-2">
                                        <p className="text-xs text-gray-400">
                                            KVKK: {application.kvkk_consent ? '✅' : '❌'} |
                                            Rıza: {application.open_consent ? '✅' : '❌'} |
                                            Kayıt: {new Date(application.created_at).toLocaleString('tr-TR')}
                                        </p>
                                    </div>

                                    {/* Dinamik Form Verileri */}
                                    {application.form_data && Object.keys(application.form_data).length > 0 && (
                                        <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
                                            <p className="text-sm font-semibold text-gray-700 mb-2">Form Verileri</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {Object.entries(application.form_data).map(([key, value]) => {
                                                    // Skip internal/already-displayed fields
                                                    if (['fullName', 'phone', 'email'].includes(key)) return null;

                                                    const label = key
                                                        .replace(/([A-Z])/g, ' $1')
                                                        .replace(/_/g, ' ')
                                                        .replace(/^./, s => s.toUpperCase())
                                                        .trim();

                                                    let displayValue: string;
                                                    if (typeof value === 'boolean') {
                                                        displayValue = value ? '✅ Evet' : '❌ Hayır';
                                                    } else if (value === null || value === undefined || value === '') {
                                                        displayValue = '-';
                                                    } else {
                                                        displayValue = String(value);
                                                    }

                                                    return (
                                                        <div key={key} className="bg-gray-50 rounded-md px-3 py-2">
                                                            <p className="text-xs font-medium text-gray-500">{label}</p>
                                                            <p className="text-sm text-gray-900 mt-0.5">{displayValue}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Admin İşlemleri */}
                                <div className="mt-6 border-t border-gray-200 pt-4 bg-gray-50 p-4 rounded-lg">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Yönetici İşlemleri</h4>

                                    {/* Status Change */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {(['PENDING', 'REVIEWING', 'APPROVED', 'REJECTED'] as const).map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() => setStatus(s)}
                                                    className={clsx(
                                                        "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                                                        status === s
                                                            ? `border-transparent ${statusColors[s]} ring-2 ring-offset-1 ring-gray-300`
                                                            : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"
                                                    )}
                                                >
                                                    {statusLabels[s]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                                        <textarea
                                            rows={3}
                                            className="shadow-sm focus:ring-[#002855] focus:border-[#002855] block w-full sm:text-sm border-gray-300 rounded-md"
                                            placeholder="Bu başvuru hakkında notlar..."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#002855] text-base font-medium text-white hover:bg-[#001f40] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#002855] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
