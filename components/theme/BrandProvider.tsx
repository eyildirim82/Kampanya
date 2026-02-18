'use client';

import React, { createContext, useContext, useEffect } from 'react';

interface BrandContextType {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    institutionName?: string;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

interface BrandProviderProps {
    children: React.ReactNode;
    brand: BrandContextType;
}

export function BrandProvider({ children, brand }: BrandProviderProps) {
    useEffect(() => {
        const root = document.documentElement;

        // Default fallbacks in case brand colors are missing
        const primary = brand.primaryColor || '#00558d';
        const secondary = brand.secondaryColor || '#002855';

        // Set CSS variables dynamically
        root.style.setProperty('--brand-primary', primary);
        root.style.setProperty('--brand-secondary', secondary);

        // Also set RGB values for tailwind opacity support if needed
        // Helper to convert hex to rgb
        const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `${r} ${g} ${b}`;
        };

        try {
            root.style.setProperty('--brand-primary-rgb', hexToRgb(primary));
            root.style.setProperty('--brand-secondary-rgb', hexToRgb(secondary));
        } catch (e) {
            console.warn('Failed to parse brand colors', e);
        }

        return () => {
            // Optional: Cleanup if needed when unmounting, though usually we want to persist or reset
            root.style.removeProperty('--brand-primary');
            root.style.removeProperty('--brand-secondary');
            root.style.removeProperty('--brand-primary-rgb');
            root.style.removeProperty('--brand-secondary-rgb');
        };
    }, [brand]);

    return (
        <BrandContext.Provider value={brand}>
            {children}
        </BrandContext.Provider>
    );
}

export function useBrand() {
    const context = useContext(BrandContext);
    if (context === undefined) {
        throw new Error('useBrand must be used within a BrandProvider');
    }
    return context;
}
