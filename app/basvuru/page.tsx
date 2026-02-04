import { Suspense } from 'react';
import ApplicationForm from './form';

export const dynamic = 'force-dynamic';

export default async function ApplicationPage() {
    // We no longer check for specific active campaign ID here.
    // The form action will ensure a default campaign exists.

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-extrabold text-[#002855] sm:text-4xl">
                        TALPA Üyelik Başvurusu
                    </h1>
                    <p className="mt-4 text-lg text-gray-500">
                        Türkiye Havayolu Pilotları Derneği üyelik başvuru formu
                    </p>
                </div>

                <Suspense fallback={
                    <div className="flex justify-center items-center p-12 bg-white rounded-2xl shadow-xl">
                        <svg className="animate-spin h-8 w-8 text-[#002855]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                }>
                    <ApplicationForm />
                </Suspense>
            </div>
        </div>
    );
}
