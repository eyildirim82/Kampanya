import React from 'react';

export default function TalepLayout({
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
