'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { deleteApplication, getAllApplicationsForExport, bulkUpdateApplicationStatus } from '../actions';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { toast } from 'sonner';
import { Modal } from '@/components/theme/Modal';
import { Card } from '@/components/theme/Card';
import { Button } from '@/components/theme/Button';
import { Input } from '@/components/theme/Input';
import { Badge } from '@/components/theme/Badge';
import { Pagination } from '@/components/theme/Pagination';
import Icon from '@/components/theme/Icon';

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

    const statusVariant = (status: string) =>
        status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : status === 'REVIEWING' ? 'warning' : 'default';

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <Input
                    type="text"
                    placeholder="Sayfada Ara (İsim, TCKN)..."
                    className="w-full sm:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Sayfada ara"
                />
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                        Toplam Kayıt: {totalCount} | Sayfa: {currentPage}/{totalPages}
                    </span>
                    <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Icon name="download" size="sm" />}
                        onClick={() => setShowExportModal(true)}
                    >
                        Dışa Aktar
                    </Button>
                </div>
            </div>

            <Modal
                open={showExportModal}
                onClose={() => setShowExportModal(false)}
                title="Dışa Aktarma Seçenekleri"
                footer={
                    <>
                        <Button variant="secondary" size="sm" onClick={() => setShowExportModal(false)}>
                            İptal
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            isLoading={isExporting}
                            leftIcon={isExporting ? undefined : <Icon name="download" size="sm" />}
                            onClick={() => handleExport('excel')}
                        >
                            Excel İndir
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            isLoading={isPdfExporting}
                            disabled={isExporting}
                            onClick={() => handleExport('pdf')}
                        >
                            PDF İndir
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tarih Aralığı (Opsiyonel)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                value={exportFilters.startDate}
                                onChange={e => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                            />
                            <input
                                type="date"
                                className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                value={exportFilters.endDate}
                                onChange={e => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Belirtilmezse tüm zamanlar dahil edilir.</p>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
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
                </div>
            </Modal>


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

            <Card variant="default" padding="none" className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200" role="table">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        onChange={handleSelectAll}
                                        checked={filteredApps.length > 0 && selectedIds.length === filteredApps.length}
                                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                </th>
                                <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                                <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TCKN</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                                <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>

                                {isCreditCampaign ? (
                                    <>
                                        <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                                        <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri?</th>
                                    </>
                                ) : (
                                    <>
                                        <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
                                        <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teslim</th>
                                    </>
                                )}

                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
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
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(app.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {app.tckn || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {app.full_name || app.form_data?.fullName}
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-500">
                                            {app.phone || app.form_data?.phone}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <Badge variant={statusVariant(app.status)} size="sm">
                                                {app.status === 'APPROVED' ? 'Onaylandı' :
                                                    app.status === 'REJECTED' ? 'Reddedildi' :
                                                        app.status === 'REVIEWING' ? 'İnceleniyor' :
                                                            'Bekliyor'}
                                            </Badge>
                                        </td>

                                        {isCreditCampaign ? (
                                            <>
                                                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                                    {app.form_data?.requestedAmount
                                                        ? `${parseInt(app.form_data.requestedAmount).toLocaleString('tr-TR')} TL`
                                                        : '-'}
                                                </td>
                                                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {app.form_data?.isDenizbankCustomer === 'yes' ? 'Evet' : 'Hayır'}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="hidden md:table-cell px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                                                    <div className="truncate" title={app.address}>{app.address || '-'}</div>
                                                </td>
                                                <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalCount={totalCount}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    ariaLabel="Başvuru listesi sayfalama"
                />
            </Card>
        </div>
    );
}
