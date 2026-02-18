'use client';

interface CampaignStat {
    id: string;
    name: string;
    code: string;
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    conversionRate: string;
}

export default function CampaignStats({ stats }: { stats: CampaignStat[] }) {
    if (!stats || stats.length === 0) return null;

    const topCampaign = stats[0];
    const highestConversion = [...stats].sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate))[0];

    return (
        <div className="space-y-6 mb-8">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Kampanya Raporları</h3>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-primary">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">En Çok Başvuru</dt>
                        <dd className="mt-1 text-2xl font-semibold text-gray-900">{topCampaign.name}</dd>
                        <dd className="text-sm text-gray-600">{topCampaign.total} Başvuru</dd>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-green-500">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">En Yüksek Onay Oranı</dt>
                        <dd className="mt-1 text-2xl font-semibold text-gray-900">{highestConversion.name}</dd>
                        <dd className="text-sm text-gray-600">%{highestConversion.conversionRate} Onay</dd>
                    </div>
                </div>
            </div>

            {/* Comparison Table */}
            <div className="flex flex-col">
                <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Kampanya
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Toplam Başvuru
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Onaylanan
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Reddedilen
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            İncelenen
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Performans / Onay %
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stats.map((stat) => (
                                        <tr key={stat.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{stat.name}</div>
                                                <div className="text-sm text-gray-500">{stat.code}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {stat.total}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                                                {stat.approved}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                                                {stat.rejected}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                                                {stat.pending}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap align-middle">
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-200 max-w-[140px]">
                                                    <div
                                                        className="bg-green-600 h-2.5 rounded-full"
                                                        style={{ width: `${stat.conversionRate}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs text-gray-500 mt-1 inline-block">%{stat.conversionRate}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
