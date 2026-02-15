'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { toast } from 'sonner';
import { deleteInterest } from '../actions';

export default function InterestTable({
    interests,
    totalCount,
    currentPage,
    campaignId
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interests: Record<string, any>[],
    totalCount: number,
    currentPage: number,
    campaignId?: string
}) {
    const router = useRouter();
    const [isExporting, setIsExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const filteredInterests = interests.filter(item =>
        item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.tckn && item.tckn.includes(searchTerm))
    );

    const handleExport = () => {
        try {
            setIsExporting(true);
            const worksheet = XLSX.utils.json_to_sheet(filteredInterests.map(item => ({
                'Kampanya': item.campaigns?.name || '-',
                'Ad Soyad': item.full_name,
                'E-posta': item.email,
                'Telefon': item.phone || '-',
                'TCKN': item.tckn || '-',
                'Not': item.note || '-',
                'Tarih': new Date(item.created_at).toLocaleString('tr-TR')
            })));

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Talepler");
            XLSX.writeFile(workbook, "Talepler.xlsx");
        } catch (error) {
            console.error('Export Failed:', error);
            toast.error('Excel dışa aktarma başarısız oldu.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportPDF = async () => {
        try {
            // Dynamic import
            const jsPDF = (await import('jspdf')).default;
            await import('jspdf-autotable');

            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.text("Ön Talep Listesi", 14, 22);
            doc.setFontSize(11);
            doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);

            const tableColumn = ["Tarih", "Kampanya", "Ad Soyad", "E-posta", "Telefon", "TCKN"];
            const tableRows: any[] = [];

            filteredInterests.forEach(item => {
                const itemData = [
                    new Date(item.created_at).toLocaleDateString('tr-TR'),
                    item.campaigns?.name || '-',
                    item.full_name,
                    item.email,
                    item.phone || '-',
                    item.tckn || '-'
                ];
                tableRows.push(itemData);
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (doc as any).autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 40,
            });

            doc.save("On_Talep_Listesi.pdf");
            toast.success('PDF raporu indirildi.');

        } catch (error) {
            console.error('PDF Export Failed:', error);
            toast.error('PDF oluşturma başarısız oldu.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bu talebi silmek istediğinize emin misiniz?')) {
            const res = await deleteInterest(id);
            if (res.success) {
                toast.success('Talep silindi.');
                router.refresh();
            } else {
                toast.error('Silme işlemi başarısız: ' + res.message);
            }
        }
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams();
        params.set('page', String(newPage));
        if (campaignId) params.set('campaignId', campaignId);
        router.push(`?${params.toString()}`);
    };

    const pageSize = 50;
    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Ara (İsim, E-posta, TCKN)..."
                    className="px-4 py-2 border rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-[#002855] outline-none text-gray-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                        Toplam: {totalCount}
                    </span>
                    <button
                        onClick={handleExportPDF}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        PDF İndir
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className={clsx(
                            "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors text-sm font-medium",
                            isExporting && "opacity-75 cursor-wait"
                        )}
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        {isExporting ? 'Hazırlanıyor...' : "Excel'e Aktar"}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kampanya</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Not</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredInterests.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                    Kayıt bulunamadı.
                                </td>
                            </tr>
                        ) : (
                            filteredInterests.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                        {item.campaigns?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.full_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.phone || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={item.note}>
                                        {item.note || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleDelete(item.id)}
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
            {totalPages > 1 && (
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
            )}
        </div>
    );
}
