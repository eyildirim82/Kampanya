import React from 'react';
import { twMerge } from 'tailwind-merge';

interface SplitLayoutProps {
    left: React.ReactNode;
    right: React.ReactNode;
    leftWidth?: string;
    rightWidth?: string;
    className?: string;
}

const SplitLayout: React.FC<SplitLayoutProps> = ({
    left,
    right,
    leftWidth = 'lg:w-5/12 xl:w-1/2',
    rightWidth = 'lg:w-7/12 xl:w-1/2',
    className,
}) => {
    return (
        <main className={twMerge("flex-grow flex flex-col lg:flex-row min-h-[calc(100vh-64px)]", className)}>
            {/* Visual / Info Panel */}
            <div className={twMerge(
                "relative flex flex-col justify-between p-8 lg:p-12 overflow-hidden",
                leftWidth
            )}>
                {left}
            </div>

            {/* Form / Content Panel */}
            <div className={twMerge(
                "relative flex items-center justify-center p-4 sm:p-8 lg:p-12",
                rightWidth
            )}>
                {right}
            </div>
        </main>
    );
};

export default SplitLayout;
