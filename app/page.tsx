import { unstable_noStore as noStore } from 'next/cache';
import { getActiveCampaigns, slugify } from './basvuru/campaign';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  noStore();
  const campaigns = await getActiveCampaigns();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-[#002855] text-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            Türkiye Havayolu Pilotları Derneği
          </h1>
          <p className="text-xl md:text-2xl text-gray-100 max-w-2xl mx-auto font-medium">
            Üyelerimize özel ayrıcalıklı dünyayı keşfedin.
          </p>
        </div>
      </div>

      {/* Campaigns Grid */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-10 mb-20">
        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.map((campaign) => {
              const content = campaign.page_content || {};
              const title = content.heroTitle || campaign.title || campaign.name || 'Kampanya';
              const subtitle = content.heroSubtitle || 'Detaylar için tıklayınız.';
              const image = content.bannerImage || 'https://placehold.co/600x300/e2e8f0/1e293b?text=TALPA+Kampanya';
              const slug = campaign.slug || slugify(campaign.campaign_code || campaign.name || '');

              return (
                <div key={campaign.id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col">
                  {/* Image */}
                  <div className="h-48 bg-gray-200 relative overflow-hidden group">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-grow flex flex-col">
                    <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {title}
                    </h2>
                    <p className="text-gray-800 mb-6 line-clamp-3 text-sm flex-grow">
                      {subtitle}
                    </p>

                    <Link
                      href={`/kampanya/${slug}`}
                      className="block w-full py-3 bg-[#002855] text-white text-center rounded-lg font-semibold hover:bg-[#003366] transition-colors shadow-lg shadow-indigo-900/20"
                    >
                      Başvuru Yap &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-2xl shadow-lg text-center max-w-lg mx-auto mt-10">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aktif Kampanya Bulunmuyor</h3>
            <p className="text-gray-700">
              Şu anda aktif bir kampanya bulunmamaktadır. Lütfen daha sonra tekrar kontrol ediniz.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 text-center text-gray-700 text-sm">
        <p>&copy; {new Date().getFullYear()} Türkiye Havayolu Pilotları Derneği. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
