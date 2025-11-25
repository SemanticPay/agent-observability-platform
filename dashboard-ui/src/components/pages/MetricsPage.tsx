import { MetricsSummaryCards } from "../MetricsSummaryCards";
import { MetricsTimeSeriesChart } from "../MetricsTimeSeriesChart";
import { AgentMetricsTable } from "../AgentMetricsTable";

export function MetricsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Observability Metrics</h1>
        <p className="text-slate-600">
          Real-time metrics from Prometheus for agent performance, cost, and usage
        </p>
      </div>

      {/* Summary Cards */}
      <MetricsSummaryCards />

      {/* Agent Metrics Table */}
      <AgentMetricsTable />

      {/* Time Series Charts */}
      {/* <MetricsTimeSeriesChart /> */}
    </div>
  );
}
