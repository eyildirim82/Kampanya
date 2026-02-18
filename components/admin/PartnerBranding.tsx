'use client';

import React from 'react';
import Card from '@/components/theme/Card';
import Icon from '@/components/theme/Icon';

interface PartnerBrandingProps {
    logoUrl?: string;
    colors?: string[];
    onLogoChange?: (file: File) => void;
    onColorSelect?: (color: string) => void;
}

const defaultColors = ['#1152d4', '#E30613', '#003781', '#ffcc00', '#10b981', '#8b5cf6'];

const PartnerBranding: React.FC<PartnerBrandingProps> = ({
    logoUrl,
    colors = defaultColors,
    onLogoChange,
    onColorSelect,
}) => {
    return (
        <Card padding="md">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                <Icon name="palette" size="sm" className="text-primary" />
                Partner Branding
            </h3>

            {/* Logo Upload */}
            <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Logo</label>
                <div className="flex items-center gap-4">
                    <div className="size-16 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Partner logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <Icon name="image" className="text-slate-400" />
                        )}
                    </div>
                    <div>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) onLogoChange?.(file);
                                }}
                            />
                            <span className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer">
                                Değiştir
                            </span>
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1">PNG, SVG, max 2MB</p>
                    </div>
                </div>
            </div>

            {/* Color Swatches */}
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Marka Rengi</label>
                <div className="flex items-center gap-2">
                    {colors.map((color) => (
                        <button
                            key={color}
                            onClick={() => onColorSelect?.(color)}
                            className="size-10 rounded-full border-4 border-white dark:border-slate-800 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-primary hover:scale-110 transition-all"
                            style={{ backgroundColor: color }}
                            title={color}
                        />
                    ))}
                    <button className="size-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-colors">
                        <Icon name="add" size="sm" />
                    </button>
                </div>
            </div>

            {/* Note */}
            <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                Partner logosu ve rengi, kampanya detay sayfalarında ve başvuru formlarında kullanılacaktır.
            </p>
        </Card>
    );
};

export default PartnerBranding;
