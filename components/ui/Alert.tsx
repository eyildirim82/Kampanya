import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";
import { clsx } from "clsx";

type AlertVariant = "default" | "destructive" | "success" | "warning";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: AlertVariant;
    title?: string;
    children: React.ReactNode;
}

const variantStyles: Record<AlertVariant, string> = {
    default: "bg-blue-50 text-blue-800 border-blue-200",
    destructive: "bg-red-50 text-red-800 border-red-200",
    success: "bg-green-50 text-green-800 border-green-200",
    warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
};

const variantIcons: Record<AlertVariant, React.ElementType> = {
    default: Info,
    destructive: XCircle,
    success: CheckCircle2,
    warning: AlertCircle,
};

export function Alert({ variant = "default", title, children, className, ...props }: AlertProps) {
    const Icon = variantIcons[variant];

    return (
        <div
            role="alert"
            className={clsx(
                "relative w-full rounded-lg border p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-current",
                variantStyles[variant],
                className
            )}
            {...props}
        >
            <Icon className="h-5 w-5" />
            <div className="pl-8">
                {title && <h5 className="mb-1 font-medium leading-none tracking-tight">{title}</h5>}
                <div className="text-sm opacity-90">{children}</div>
            </div>
        </div>
    );
}
