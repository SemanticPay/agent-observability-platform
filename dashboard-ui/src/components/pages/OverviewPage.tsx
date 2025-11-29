import { ClusterOverview } from "../ClusterOverview";
import { AgentStatusOverview } from "../AgentStatusOverview";
import { HealthMeter } from "../HealthMeter";

export function OverviewPage() {
  return (
    <div className="max-w-[1800px] mx-auto px-8 py-8 space-y-8">
      <div className="flex items-center justify-end">
        <HealthMeter />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ClusterOverview />
        </div>
        <div>
          <AgentStatusOverview />
        </div>
      </div>
    </div>
  );
}
