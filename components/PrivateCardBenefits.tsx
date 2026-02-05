import React from 'react';
import { Card } from './ui/Card';

interface DiscountCategoryProps {
    percentage: string;
    title: string;
    minSpend: string;
    maxDiscount: string;
    color?: 'blue' | 'green' | 'gray';
}

const DiscountCategory: React.FC<DiscountCategoryProps> = ({
    percentage,
    title,
    minSpend,
    maxDiscount,
    color = 'blue'
}) => {
    const colors = {
        blue: 'text-blue-600',
        green: 'text-green-600',
        gray: 'text-gray-600',
    };

    const maxColors = {
        blue: 'text-blue-700',
        green: 'text-green-700',
        gray: 'text-gray-700',
    };

    return (
        <Card variant="elevated" padding="sm" hoverable className="transition-all duration-300">
            <div className={`font-bold text-2xl mb-1 ${colors[color]}`}>{percentage}</div>
            <div className="text-gray-800 font-semibold text-sm mb-3">{title}</div>
            <div className="space-y-1">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider">Minimum Harcama</div>
                <div className="text-xs font-medium text-gray-600">{minSpend}</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-2">Maksimum İndirim</div>
                <div className={`text-xs font-medium ${maxColors[color]}`}>{maxDiscount}</div>
            </div>
        </Card>
    );
};

export const PrivateCardBenefits: React.FC = () => {
    return (
        <div className="max-w-6xl mx-auto">
            <Card className="overflow-hidden border border-gray-100">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#1e293b] to-[#334155] p-8 text-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold mb-2">Private Kart Avantajları</h2>
                            <p className="text-gray-300 text-sm md:text-base max-w-xl leading-relaxed">
                                TALPA ve DenizBank iş birliği ile havacılık profesyonellerine özel, en yüksek portföy
                                ayrıcalıklarıyla donatılmış Private Kart hizmetinizde.
                            </p>
                        </div>
                        <div className="bg-yellow-500/20 border border-yellow-500/50 px-4 py-2 rounded-full">
                            <span className="text-yellow-400 font-semibold text-sm">Üyelere Özel: Yıllık Kart Ücreti Yok!</span>
                        </div>
                    </div>
                </div>

                {/* Discount Categories */}
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                        Harcama İndirimleri ve Limitler
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DiscountCategory
                            percentage="%15"
                            title="Restoran & Kafe"
                            minSpend="4.000 TL"
                            maxDiscount="6.000 TL / Ay"
                            color="blue"
                        />

                        <DiscountCategory
                            percentage="%15"
                            title="Tüm Oteller"
                            minSpend="25.000 TL"
                            maxDiscount="4.000 TL / Ay"
                            color="blue"
                        />

                        <DiscountCategory
                            percentage="%25"
                            title="Kuru Temizleme"
                            minSpend="1.500 TL"
                            maxDiscount="600 TL / Ay"
                            color="green"
                        />

                        <DiscountCategory
                            percentage="%15"
                            title="Kozmetik"
                            minSpend="1.500 TL"
                            maxDiscount="600 TL / Ay"
                            color="blue"
                        />

                        <DiscountCategory
                            percentage="%10"
                            title="Güzellik & Kuaför"
                            minSpend="1.500 TL"
                            maxDiscount="600 TL / Ay"
                            color="gray"
                        />

                        <DiscountCategory
                            percentage="%10"
                            title="Sinema & Tiyatro"
                            minSpend="1.500 TL"
                            maxDiscount="600 TL / Ay"
                            color="gray"
                        />

                        <DiscountCategory
                            percentage="%10"
                            title="Araç Kiralama"
                            minSpend="2.000 TL"
                            maxDiscount="2.000 TL / Ay"
                            color="gray"
                        />

                        <DiscountCategory
                            percentage="%5"
                            title="Duty Free"
                            minSpend="2.000 TL"
                            maxDiscount="1.000 TL / Ay"
                            color="gray"
                        />
                    </div>
                </div>

                {/* Footer Note */}
                <div className="p-6 bg-gray-50 flex items-start gap-3 border-t border-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        İndirimler yurt içi ve yurt dışı harcamalarda geçerlidir. Belirtilen aylık maksimum indirim
                        tutarları müşteri bazlıdır. DenizBank kampanya koşullarında değişiklik yapma hakkını saklı tutar.
                    </p>
                </div>
            </Card>
        </div>
    );
};
