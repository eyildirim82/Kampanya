import React from 'react';

export default function BasvuruLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="pt-24 min-h-screen bg-slate-50">
            {children}
        </div>
    );
}
