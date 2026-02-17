import { unstable_noStore as noStore } from 'next/cache';
import { getActiveCampaigns, slugify } from './basvuru/campaign';
import Link from 'next/link';
import { Plane } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  noStore();
  const campaigns = await getActiveCampaigns();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[500px] flex items-center justify-center overflow-hidden">
        {/* Background Base */}
        <div className="absolute inset-0 bg-talpa-bg"></div>

        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-radar opacity-20 animate-radar-sweep"></div>

        {/* Glowing Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-talpa-accent/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-deniz-red/10 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-talpa-accent text-xs font-mono tracking-widest uppercase mb-4 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-deniz-red animate-pulse"></span>
            Kampanya Portalı
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6 drop-shadow-2xl animate-fade-in-up stagger-1">
            <span className="gradient-text-hero">TÜRKİYE HAVAYOLU</span>
            <br />
            <span className="text-white">PİLOTLARI DERNEĞİ</span>
          </h1>

          <p className="text-lg md:text-2xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed animate-fade-in-up stagger-2">
            DenizBank ayrıcalıkları ile üyelerimize özel fırsatlar,
            <br className="hidden md:block" />
            prestijli dünyanıza değer katan avantajlar.
          </p>
        </div>

        {/* Bottom Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </section>

      {/* Campaigns Grid */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 pb-20">
        {campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.map((campaign, index) => {
              const content = campaign.page_content || {};
              const title = content.heroTitle || campaign.title || campaign.name || 'Kampanya';
              const subtitle = content.heroSubtitle || 'Detaylar için tıklayınız.';
              const image = content.bannerImage || 'https://placehold.co/600x300/00152e/e2e8f0?text=TALPA+Kampanya';
              const slug = campaign.slug || slugify(campaign.campaign_code || campaign.name || '');

              return (
                <div
                  key={campaign.id}
                  className={`group bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 flex flex-col border border-slate-100 animate-fade-in-up`}
                  style={{ animationDelay: `${(index + 3) * 100}ms` }}
                >
                  {/* Image */}
                  <div className="h-56 bg-slate-200 relative overflow-hidden">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-talpa-bg/90 via-talpa-bg/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-300"></div>

                    {/* Badge */}
                    <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      AKTİF
                    </div>

                    {/* Logo Overlay */}
                    <div className="absolute bottom-4 left-4 text-white opacity-90 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <Plane className="h-8 w-8 text-white/50 mb-1" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8 flex-grow flex flex-col">
                    <h2 className="text-2xl font-bold text-talpa-navy mb-3 line-clamp-2 leading-tight group-hover:text-deniz-red transition-colors">
                      {title}
                    </h2>
                    <p className="text-slate-600 mb-8 line-clamp-3 text-sm leading-relaxed flex-grow">
                      {subtitle}
                    </p>

                    <Link
                      href={`/kampanya/${slug}`}
                      className="block w-full py-4 bg-talpa-bg text-white text-center rounded-xl font-bold tracking-wide hover:bg-deniz-red transition-all shadow-lg shadow-talpa-navy/20 group-hover:shadow-deniz-red/30 relative overflow-hidden"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        BAŞVURU YAP <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-12 rounded-3xl shadow-talpa text-center max-w-lg mx-auto mt-10 border border-slate-100 animate-fade-in-up">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full border border-slate-100 animate-ping opacity-20"></div>
              <Plane className="w-10 h-10 text-slate-300 transform -rotate-45" />
            </div>
            <h3 className="text-2xl font-bold text-talpa-navy mb-3">Aktif Kampanya Bulunmuyor</h3>
            <p className="text-slate-500 leading-relaxed">
              Şu anda aktif bir kampanya bulunmamaktadır. <br />
              Yeni fırsatlar için lütfen daha sonra tekrar kontrol ediniz.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
