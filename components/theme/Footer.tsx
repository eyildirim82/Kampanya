import React from 'react';
import { Plane } from 'lucide-react';
import Link from 'next/link';

const Footer: React.FC = () => {
    return (
        <footer className="bg-[#00152e] text-slate-300 py-12 mt-auto border-t border-white/5 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-blue-600/5 blur-[100px] pointer-events-none rounded-full"></div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4 text-white">
                            <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                <Plane className="h-5 w-5 transform -rotate-45" />
                            </div>
                            <span className="font-bold text-lg tracking-tight">TALPA</span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-xs font-light">
                            Türkiye Havayolu Pilotları Derneği üyeleri için hazırlanan özel kampanya ve ayrıcalıklar portalı.
                        </p>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4 text-xs uppercase tracking-widest">Hızlı Erişim</h4>
                        <ul className="space-y-2 text-sm font-medium">
                            <li><Link href="/" className="text-slate-500 hover:text-talpa-accent transition-colors">Kampanyalar</Link></li>
                            <li><Link href="#" className="text-slate-500 hover:text-talpa-accent transition-colors">SSS</Link></li>
                            <li><Link href="#" className="text-slate-500 hover:text-talpa-accent transition-colors">İletişim</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-4 text-xs uppercase tracking-widest">Yasal</h4>
                        <ul className="space-y-2 text-sm font-medium">
                            <li><Link href="#" className="text-slate-500 hover:text-talpa-accent transition-colors">Kullanım Koşulları</Link></li>
                            <li><Link href="#" className="text-slate-500 hover:text-talpa-accent transition-colors">Gizlilik Politikası</Link></li>
                            <li><Link href="#" className="text-slate-500 hover:text-talpa-accent transition-colors">KVKK Aydınlatma Metni</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-slate-600 font-mono">© 2026 TALPA. Tüm hakları saklıdır.</p>
                    <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">System Operational</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
