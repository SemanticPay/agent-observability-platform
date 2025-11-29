import { TaskTelemetryFeed } from "../TaskTelemetryFeed";
import { RecentDecisions } from "../RecentDecisions";
import { ActivityHeatmap } from "../ActivityHeatmap";

export function ActivityPage() {
  return (
    <div className="max-w-[1800px] mx-auto px-8 py-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <TaskTelemetryFeed />
        </div>
        <div className="space-y-8">
          <ActivityHeatmap />
          <RecentDecisions />
        </div>
      </div>
    </div>
  );
}
