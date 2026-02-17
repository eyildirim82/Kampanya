import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface AlertProps {
    variant?: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    children: React.ReactNode;
    className?: string;
}

const Alert: React.FC<AlertProps> = ({
    variant = 'info',
    title,
    children,
    className = ''
}) => {
    const styles = {
        info: 'bg-blue-50 text-blue-900 border-blue-200',
        success: 'bg-green-50 text-green-900 border-green-200',
        warning: 'bg-amber-50 text-amber-900 border-amber-200',
        error: 'bg-red-50 text-red-900 border-red-200'
    };

    const icons = {
        info: <Info className="h-5 w-5 text-blue-600" />,
        success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        warning: <AlertCircle className="h-5 w-5 text-amber-600" />,
        error: <XCircle className="h-5 w-5 text-red-600" />
    };

    return (
        <div className={`rounded-lg border p-4 flex gap-3 ${styles[variant]} ${className}`} role="alert">
            <div className="shrink-0 pt-0.5">{icons[variant]}</div>
            <div className="flex-1">
                {title && <h5 className="mb-1 font-semibold leading-none tracking-tight">{title}</h5>}
                <div className="text-sm opacity-90">{children}</div>
            </div>
        </div>
    );
};

export default Alert;
