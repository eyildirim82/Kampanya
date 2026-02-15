export default function TalepLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col animate-pulse">
      <div className="h-48 bg-gray-200" />
      <main className="flex-grow max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-8 mb-20">
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-8">
          <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto mb-4" />
          <div className="h-4 bg-gray-100 rounded w-full mb-6" />
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-24 bg-gray-100 rounded-lg" />
            <div className="h-12 bg-gray-200 rounded-lg mt-4" />
          </div>
        </div>
      </main>
    </div>
  );
}
