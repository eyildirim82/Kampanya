'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { deleteApplication, getAllApplicationsForExport, bulkUpdateApplicationStatus } from '../actions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { toast } from 'sonner';

export default function ApplicationTable({
    applications,
    totalCount,
    currentPage,
    campaignId,
    isCreditCampaign
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applications: Record<string, any>[],
    totalCount: number,
    currentPage: number,
    campaignId?: string,
    isCreditCampaign?: boolean
}) {
    const router = useRouter();

    const [isExporting, setIsExporting] = useState(false);
    const [isPdfExporting, setIsPdfExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const filteredApps = applications.filter(app =>
        app.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.tckn?.includes(searchTerm) ||
        app.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const [showExportModal, setShowExportModal] = useState(false);
    const [exportFilters, setExportFilters] = useState({
        startDate: '',
        endDate: '',
        unmask: false
    });

    const handleExport = async (type: 'excel' | 'pdf') => {
        try {
            if (type === 'excel') setIsExporting(true);
            else setIsPdfExporting(true);

            const filters = {
                campaignId, // From props
                startDate: exportFilters.startDate || undefined,
                endDate: exportFilters.endDate || undefined,
                unmask: exportFilters.unmask
            };

            const result = await getAllApplicationsForExport(filters);

            if (!result.success || !result.data) {
                toast.error(result.message || 'Veri alınamadı.');
                return;
            }

            const allApps = result.data;

            if (type === 'excel') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const worksheet = XLSX.utils.json_to_sheet(allApps.map((app: Record<string, any>) => ({
                    'TCKN': app.tckn,
                    'Ad Soyad': app.full_name || app.form_data?.fullName,
                    'Telefon': app.phone || app.form_data?.phone,
                    'E-posta': app.email,
                    'Adres': app.address,
                    'Teslim Yöntemi': (app.delivery_method || app.form_data?.deliveryMethod) === 'branch' ? 'Şube' : (app.delivery_method || app.form_data?.deliveryMethod) === 'address' ? 'Adres' : '-',
                    'Kredi Tutarı': app.form_data?.requestedAmount ? (app.form_data.requestedAmount === 'other' ? 'Diğer' : `${app.form_data.requestedAmount} TL`) : '-',
                    'Müşteri Durumu': app.form_data?.isDenizbankCustomer === 'yes' ? 'Müşteri' : app.form_data?.isDenizbankCustomer === 'no' ? 'Değil' : '-',
                    'İletişim İzni': app.form_data?.phoneSharingConsent ? 'Evet' : '-',
                    'TCKN İzni': app.form_data?.tcknSharingConsent ? 'Evet' : '-',
                    'KVKK Onayı': app.kvkk_consent ? 'Evet' : 'Hayır',
                    'Açık Rıza': app.open_consent ? 'Evet' : 'Hayır',
                    'Durum': app.status,
                    'Başvuru Tarihi': new Date(app.created_at).toLocaleString('tr-TR'),
                })));

                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Basvurular");
                XLSX.writeFile(workbook, `Basvurular_${new Date().toISOString().slice(0, 10)}.xlsx`);
            } else {
                // PDF Export
                const jsPDF = (await import('jspdf')).default;
                await import('jspdf-autotable');

                const doc = new jsPDF();
                doc.setFontSize(18);
                doc.text("Başvuru Listesi", 14, 22);
                doc.setFontSize(11);
                doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);
                if (exportFilters.unmask) {
                    doc.setTextColor(255, 0, 0);
                    doc.text("DİKKAT: BU BELGE HASSAS PII İÇERMEKTEDİR", 14, 36);
                    doc.setTextColor(0, 0, 0);
                }

                const tableColumn = ["Tarih", "Ad Soyad", "TCKN", "Durum", "Telefon"];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const tableRows: any[] = [];

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                allApps.forEach((app: any) => {
                    const appData = [
                        new Date(app.created_at).toLocaleDateString('tr-TR'),
                        app.full_name || app.form_data?.fullName || '-',
                        app.tckn || '-',
                        app.status,
                        app.phone || app.form_data?.phone || '-',
                    ];
                    tableRows.push(appData);
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (doc as any).autoTable({
                    head: [tableColumn],
                    body: tableRows,
                    startY: 40,
                });

                doc.save(`Basvurular_${new Date().toISOString().slice(0, 10)}.pdf`);
            }

            toast.success(`${type === 'excel' ? 'Excel' : 'PDF'} başarıyla oluşturuldu.`);
            setShowExportModal(false);

        } catch (error) {
            console.error('Export Failed:', error);
            toast.error('Dışa aktarma başarısız oldu.');
        } finally {
            setIsExporting(false);
            setIsPdfExporting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bu başvuruyu silmek istediğinize emin misiniz?')) {
            const res = await deleteApplication(id);
            if (res.success) {
                toast.success('Başvuru silindi.');
                router.refresh();
            } else {
                toast.error('Silme işlemi başarısız: ' + res.message);
            }
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = filteredApps.map(app => app.id);
            setSelectedIds(allIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkAction = async (status: string) => {
        if (!confirm(`${selectedIds.length} başvuru için durum "${status}" olarak güncellenecek. Emin misiniz?`)) return;

        setIsBulkUpdating(true);
        try {
            const res = await bulkUpdateApplicationStatus(selectedIds, status);
            if (res.success) {
                toast.success(res.message);
                setSelectedIds([]);
                router.refresh();
            } else {
                toast.error('Güncelleme başarısız: ' + res.message);
            }
        } catch (error) {
            console.error(error);
            toast.error('Bir hata oluştu.');
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams();
        params.set('page', String(newPage));
        if (campaignId) {
            params.set('campaignId', campaignId);
        }
        router.push(`?${params.toString()}`);
    };

    const pageSize = 50;
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Sayfada Ara (İsim, TCKN)..."
                    className="px-4 py-2 border rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-[#002855] outline-none text-gray-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                        Toplam Kayıt: {totalCount} | Sayfa: {currentPage}/{totalPages}
                    </span>
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Dışa Aktar
                    </button>
                </div>
            </div>

            {/* Export Modal */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Dışa Aktarma Seçenekleri</h3>
                            <button onClick={() => setShowExportModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih Aralığı (Opsiyonel)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="date"
                                        className="border rounded p-2 text-sm"
                                        value={exportFilters.startDate}
                                        onChange={e => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                                    />
                                    <input
                                        type="date"
                                        className="border rounded p-2 text-sm"
                                        value={exportFilters.endDate}
                                        onChange={e => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Belirtilmezse tüm zamanlar dahil edilir.</p>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded text-red-600 focus:ring-red-500"
                                        checked={exportFilters.unmask}
                                        onChange={e => setExportFilters({ ...exportFilters, unmask: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-red-700">Hassas Verileri Göster (Maskelemeyi Kaldır)</span>
                                </label>
                                <p className="text-xs text-yellow-700 mt-1 ml-6">
                                    Bu seçenek işaretlendiğinde TCKN ve diğer kişisel veriler açık şekilde indirilecektir. Bu işlem güvenlik günlüğüne kaydedilir.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => handleExport('excel')}
                                    disabled={isExporting}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium text-sm flex justify-center items-center"
                                >
                                    {isExporting ? '...' : 'Excel İndir'}
                                </button>
                                <button
                                    onClick={() => handleExport('pdf')}
                                    disabled={isPdfExporting}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium text-sm flex justify-center items-center"
                                >
                                    {isPdfExporting ? '...' : 'PDF İndir'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Bulk Actions Toolbar */}
            {
                selectedIds.length > 0 && (
                    <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                        <span className="text-sm font-semibold text-blue-800">
                            {selectedIds.length} başvuru seçildi
                        </span>
                        <div className="h-4 w-px bg-blue-300 mx-2" />
                        <button
                            onClick={() => handleBulkAction('APPROVED')}
                            disabled={isBulkUpdating}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            Onayla
                        </button>
                        <button
                            onClick={() => handleBulkAction('REJECTED')}
                            disabled={isBulkUpdating}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                            Reddet
                        </button>
                        <button
                            onClick={() => handleBulkAction('REVIEWING')}
                            disabled={isBulkUpdating}
                            className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 disabled:opacity-50"
                        >
                            İncelemeye Al
                        </button>
                    </div>
                )
            }

            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={filteredApps.length > 0 && selectedIds.length === filteredApps.length}
                                    className="w-4 h-4 rounded border-gray-300 text-[#002855] focus:ring-[#002855]"
                                />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TCKN</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>

                            {isCreditCampaign ? (
                                <>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri?</th>
                                </>
                            ) : (
                                <>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teslim</th>
                                </>
                            )}

                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredApps.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                                    Bu sayfada kayıt bulunamadı.
                                </td>
                            </tr>
                        ) : (
                            filteredApps.map((app) => (
                                <tr key={app.id} className={clsx("hover:bg-gray-50 transition-colors", selectedIds.includes(app.id) && "bg-blue-50")}>
                                    <td className="px-4 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(app.id)}
                                            onChange={() => handleSelectRow(app.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-[#002855] focus:ring-[#002855]"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(app.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {app.tckn || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {app.full_name || app.form_data?.fullName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {app.phone || app.form_data?.phone}
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={clsx(
                                            "px-2 py-1 text-xs font-medium rounded-full",
                                            app.status === 'APPROVED' ? "bg-green-100 text-green-800" :
                                                app.status === 'REJECTED' ? "bg-red-100 text-red-800" :
                                                    app.status === 'REVIEWING' ? "bg-yellow-100 text-yellow-800" :
                                                        "bg-gray-100 text-gray-800"
                                        )}>
                                            {app.status === 'APPROVED' ? 'Onaylandı' :
                                                app.status === 'REJECTED' ? 'Reddedildi' :
                                                    app.status === 'REVIEWING' ? 'İnceleniyor' :
                                                        'Bekliyor'}
                                        </span>
                                    </td>

                                    {isCreditCampaign ? (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                                {app.form_data?.requestedAmount
                                                    ? `${parseInt(app.form_data.requestedAmount).toLocaleString('tr-TR')} TL`
                                                    : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {app.form_data?.isDenizbankCustomer === 'yes' ? 'Evet' : 'Hayır'}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                                                <div className="truncate" title={app.address}>{app.address || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {(app.delivery_method || app.form_data?.deliveryMethod) === 'branch' ? 'Şube' : (app.delivery_method || app.form_data?.deliveryMethod) === 'address' ? 'Adres' : '-'}
                                            </td>
                                        </>
                                    )}

                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDelete(app.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Sil
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {
                totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Önceki
                            </button>
                            <button
                                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Sonraki
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Toplam <span className="font-medium">{totalCount}</span> kayıttan <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> ile <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> arası gösteriliyor
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Önceki</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                        {currentPage}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Sonraki</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
