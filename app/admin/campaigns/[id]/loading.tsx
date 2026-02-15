export default function CampaignEditLoading() {
  return (
    <div className="p-6 max-w-5xl mx-auto animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="flex gap-2 mb-6">
        <div className="h-10 bg-gray-100 rounded w-24" />
        <div className="h-10 bg-gray-100 rounded w-24" />
        <div className="h-10 bg-gray-100 rounded w-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}
