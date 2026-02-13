import { getCampaigns, getInterests } from '../actions';
import InterestTable from '../components/InterestTable';
import CampaignSelector from '../components/CampaignSelector';

export const dynamic = 'force-dynamic';

export default async function AdminInterestsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const campaignId = (params.campaignId as string) || 'all';
    const page = parseInt((params.page as string) || '1');

    // Parallel Fetch
    const [campaigns, { data: interests, count }] = await Promise.all([
        getCampaigns(),
        getInterests(campaignId, page)
    ]);

    return (
        <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Talep Yönetimi</h1>
                    <p className="text-gray-500 mt-1">
                        Kampanyalar için oluşturulan ön talepleri buradan yönetebilirsiniz.
                    </p>
                </div>

                <div className="w-full md:w-64">
                    <CampaignSelector
                        campaigns={campaigns}
                    />
                </div>
            </div>

            <InterestTable
                interests={interests}
                totalCount={count}
                currentPage={page}
                campaignId={campaignId}
            />
        </div>
    );
}
