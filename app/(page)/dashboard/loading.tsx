import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import TopHeader from "@/components/dashboard/TopHeader";

const Loading = () => {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,198,245,0.07),transparent)]" />
      <div className="space-y-8 pb-12">
        <TopHeader />
        <DashboardSkeleton />
      </div>
    </div>
  );
};

export default Loading;

