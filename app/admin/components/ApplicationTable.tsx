'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { deleteApplication, getAllApplicationsForExport } from '../actions';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

export default function ApplicationTable({
    applications,
    totalCount,
    currentPage,
    campaignId,
    isCreditCampaign
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applications: any[],
    totalCount: number,
    currentPage: number,
    campaignId?: string,
    isCreditCampaign?: boolean
}) {
    const router = useRouter();

    const [isExporting, setIsExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredApps = applications.filter(app =>
        app.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.tckn?.includes(searchTerm) ||
        app.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = async () => {
        try {
            setIsExporting(true);
            // Fetch ALL data for export
            const allApps = await getAllApplicationsForExport(campaignId);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const worksheet = XLSX.utils.json_to_sheet(allApps.map((app: any) => ({
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
                'Başvuru Tarihi': new Date(app.created_at).toLocaleString('tr-TR'),
            })));

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Basvurular");
            XLSX.writeFile(workbook, "Uyelik_Basvurulari.xlsx");
        } catch (error) {
            console.error('Export Failed:', error);
            alert('Excel dışa aktarma başarısız oldu.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bu başvuruyu silmek istediğinize emin misiniz?')) {
            // setIsLoading(true);
            const res = await deleteApplication(id);
            if (res.success) {
                router.refresh();
            } else {
                alert('Silme işlemi başarısız: ' + res.message);
            }
            // setIsLoading(false);
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TCKN</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ad Soyad</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>

                            {isCreditCampaign ? (
                                <>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutar</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri?</th>
                                </>
                            ) : (
                                <>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teslim</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onaylar</th>
                                </>
                            )}

                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredApps.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                                    Bu sayfada kayıt bulunamadı.
                                </td>
                            </tr>
                        ) : (
                            filteredApps.map((app) => (
                                <tr key={app.id} className="hover:bg-gray-50 transition-colors">
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

                                    {isCreditCampaign ? (
                                        <>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                                    Başvuru Alındı
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                                {app.form_data?.requestedAmount
                                                    ? `${parseInt(app.form_data.requestedAmount).toLocaleString('tr-TR')} TL`
                                                    : '-'}
                                                {app.form_data?.requestedAmount === 'other' && ' (Diğer)'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {app.form_data?.isDenizbankCustomer === 'yes' ? (
                                                    <span className="text-green-600 font-medium">Evet</span>
                                                ) : (
                                                    <span className="text-gray-500">Hayır</span>
                                                )}
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="text-xs text-gray-400">{app.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-[250px]">
                                                <div className="truncate" title={app.address}>{app.address || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded text-xs",
                                                    (app.delivery_method || app.form_data?.deliveryMethod) === 'branch' ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                                                )}>
                                                    {(app.delivery_method || app.form_data?.deliveryMethod) === 'branch' ? 'Şube' : (app.delivery_method || app.form_data?.deliveryMethod) === 'address' ? 'Adres' : '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={clsx("px-2 py-1 rounded text-xs", app.kvkk_consent ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>KVKK</span>
                                                <span className={clsx("px-2 py-1 rounded text-xs ml-1", app.open_consent ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>Rıza</span>
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

                                {/* Simple Page Numbers: 1 ... Current ... Last */}
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
