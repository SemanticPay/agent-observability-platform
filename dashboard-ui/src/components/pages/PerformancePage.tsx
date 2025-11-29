import { PerformanceMetrics } from "../PerformanceMetrics";
import { PlatformIntegrations } from "../PlatformIntegrations";
import { SystemThroughput } from "../SystemThroughput";
import { CapacityMonitor } from "../CapacityMonitor";
import { CostPerformanceAnalytics } from "../CostPerformanceAnalytics";

export function PerformancePage() {
  return (
    <div className="max-w-[1800px] mx-auto px-8 py-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <SystemThroughput />
          <CapacityMonitor />
        </div>
        <div className="space-y-8">
          <PerformanceMetrics />
          <PlatformIntegrations />
        </div>
      </div>
    </div>
  );
}
