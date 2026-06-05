export default function SkeletonCard() {
  return (
    <div className="block bg-white rounded-[16px] overflow-hidden border border-[#D6E0F5] shadow-nout-md">
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-full" />
        <div className="h-3 bg-gray-200 rounded-full animate-pulse w-2/3" />
        <div className="h-5 bg-gray-200 rounded-full animate-pulse w-1/2 mt-2" />
        <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-1/3 mt-1" />
      </div>
    </div>
  )
}
