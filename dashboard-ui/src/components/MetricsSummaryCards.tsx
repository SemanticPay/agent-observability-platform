import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useMetricsSummary } from "../hooks/useMetrics";
import { Loader2, DollarSign, Cpu, Wrench, Clock } from "lucide-react";

export function MetricsSummaryCards() {
  const { data, loading, error } = useMetricsSummary("1h");

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Error loading metrics: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 bg-slate-50 text-slate-600 rounded-lg">
        No metrics data available
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Cost */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${data.total_cost.toFixed(6)}</div>
          <p className="text-xs text-muted-foreground">Last {data.time_range}</p>
        </CardContent>
      </Card>

      {/* Total Tokens */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.total_tokens.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Last {data.time_range}</p>
        </CardContent>
      </Card>

      {/* Tool Calls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tool Calls</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.total_tool_calls.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Last {data.time_range}</p>
        </CardContent>
      </Card>

      {/* Avg Duration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.avg_execution_duration.toFixed(2)}s</div>
          <p className="text-xs text-muted-foreground">Last {data.time_range}</p>
        </CardContent>
      </Card>
    </div>
  );
}
