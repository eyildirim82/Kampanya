import React from 'react';
import Link from 'next/link';
import Icon from './Icon';

interface FooterProps {
    variant?: 'full' | 'minimal';
}

const Footer: React.FC<FooterProps> = ({ variant = 'full' }) => {
    if (variant === 'minimal') {
        return (
            <footer className="bg-background-dark border-t border-white/5 py-8 px-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 opacity-40 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                        <div className="flex items-center gap-2 text-white">
                            <Icon name="flight_takeoff" size="sm" />
                            <span className="text-sm font-bold">TALPA</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400">&copy; 2026 TALPA. Tüm hakları saklıdır.</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <Link href="#" className="hover:text-primary transition-colors">KVKK</Link>
                        <Link href="#" className="hover:text-primary transition-colors">Kullanım Koşulları</Link>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="bg-background-dark border-t border-white/10 pt-20 pb-10 mt-auto relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 blur-[100px] pointer-events-none rounded-full" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-3 mb-4 text-white">
                            <div className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Icon name="flight_takeoff" className="text-white" />
                            </div>
                            <span className="font-bold text-lg tracking-tight font-display">TALPA</span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
                            Türkiye Havayolu Pilotları Derneği üyeleri için hazırlanan özel kampanya ve ayrıcalıklar portalı.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-white font-bold mb-6 text-xs uppercase tracking-widest">Hızlı Erişim</h4>
                        <ul className="space-y-4 text-sm">
                            <li><Link href="/" className="text-slate-500 hover:text-primary transition-colors">Kampanyalar</Link></li>
                            <li><Link href="#" className="text-slate-500 hover:text-primary transition-colors">SSS</Link></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-white font-bold mb-6 text-xs uppercase tracking-widest">Yasal</h4>
                        <ul className="space-y-4 text-sm">
                            <li><Link href="#" className="text-slate-500 hover:text-primary transition-colors">Kullanım Koşulları</Link></li>
                            <li><Link href="#" className="text-slate-500 hover:text-primary transition-colors">Gizlilik Politikası</Link></li>
                            <li><Link href="#" className="text-slate-500 hover:text-primary transition-colors">KVKK Aydınlatma Metni</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-white font-bold mb-6 text-xs uppercase tracking-widest">İletişim</h4>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-center gap-2 text-slate-500">
                                <Icon name="location_on" size="sm" className="text-slate-400" />
                                İstanbul, Türkiye
                            </li>
                            <li className="flex items-center gap-2 text-slate-500">
                                <Icon name="alternate_email" size="sm" className="text-slate-400" />
                                info@talpa.org
                            </li>
                            <li className="flex items-center gap-2 text-slate-500">
                                <Icon name="public" size="sm" className="text-slate-400" />
                                www.talpa.org
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-slate-400">&copy; 2026 TALPA. Tüm hakları saklıdır.</p>
                    {/* Social */}
                    <div className="flex items-center gap-3">
                        {['mail', 'public', 'share'].map((iconName) => (
                            <a
                                key={iconName}
                                href="#"
                                className="size-10 rounded-full border border-white/10 flex items-center justify-center text-slate-500 hover:text-white hover:border-primary/50 hover:bg-primary/10 transition-all"
                            >
                                <Icon name={iconName} size="sm" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
