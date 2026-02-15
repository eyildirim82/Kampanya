export default function CampaignLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-pulse">
      <div className="h-64 bg-gray-200" />
      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-8 mb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full mb-2" />
              <div className="h-4 bg-gray-100 rounded w-5/6" />
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 sticky top-8">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="space-y-4">
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-12 bg-gray-200 rounded-xl mt-6" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
