import React from 'react';

export default function AdminLayout({
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
