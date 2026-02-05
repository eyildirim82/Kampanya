'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { deleteApplication } from '../actions';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

export default function ApplicationTable({ applications }: { applications: any[] }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredApps = applications.filter(app =>
        app.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.tckn?.includes(searchTerm) ||
        app.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const worksheet = XLSX.utils.json_to_sheet(applications.map(app => ({
            'TCKN': app.tckn,
            'Ad Soyad': app.full_name,
            'Telefon': app.phone,
            'E-posta': app.email,
            'Adres': app.address,
            'Teslim Yöntemi': (app.delivery_method || app.form_data?.deliveryMethod) === 'branch' ? 'Şube' : (app.delivery_method || app.form_data?.deliveryMethod) === 'address' ? 'Adres' : '-',
            'KVKK Onayı': app.kvkk_consent ? 'Evet' : 'Hayır',
            'Açık Rıza': app.open_consent ? 'Evet' : 'Hayır',
            'Başvuru Tarihi': new Date(app.created_at).toLocaleString('tr-TR'),
        })));

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Basvurular");
        XLSX.writeFile(workbook, "Uyelik_Basvurulari.xlsx");
    };



    const handleDelete = async (id: string) => {
        if (confirm('Bu başvuruyu silmek istediğinize emin misiniz?')) {
            setIsLoading(true);
            const res = await deleteApplication(id);
            if (res.success) {
                // Refresh data
                router.refresh();
            } else {
                alert('Silme işlemi başarısız: ' + res.message);
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <input
                    type="text"
                    placeholder="Ara (İsim, TCKN, E-posta)..."
                    className="px-4 py-2 border rounded-lg w-full sm:w-64 focus:ring-2 focus:ring-[#002855] outline-none text-gray-900"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors text-sm font-medium"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Excel'e Aktar
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adres</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teslim</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onaylar</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredApps.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                                    Başvuru bulunamadı.
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
                                        {app.full_name}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <div>{app.phone}</div>
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
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            // Demo button for Edit - ideally opens a modal
                                            onClick={() => alert(`Düzenleme Modu: ${app.full_name}`)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            Düzenle
                                        </button>
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
        </div>
    );
}
