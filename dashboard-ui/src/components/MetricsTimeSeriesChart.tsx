import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMetricsTimeSeries } from "../hooks/useMetrics";
import { Loader2 } from "lucide-react";

export function MetricsTimeSeriesChart() {
  const { data, loading, error } = useMetricsTimeSeries(24, "5m");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Metrics Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Metrics Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-red-500">
          Error: {error}
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.time_series) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Metrics Over Time</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-slate-500">
          No data available
        </CardContent>
      </Card>
    );
  }

  // Combine all time series data
  const chartData = data.time_series.cost.map((item, index) => ({
    timestamp: new Date(item.timestamp).toLocaleTimeString(),
    cost: item.value,
    tokens: data.time_series.tokens[index]?.value || 0,
    tool_calls: data.time_series.tool_calls[index]?.value || 0,
    duration: data.time_series.duration[index]?.value || 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metrics Over Time (Last 24 Hours)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cost Chart */}
          <div>
            <h3 className="text-sm font-medium mb-2">Cost ($)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="cost" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tokens Chart */}
          <div>
            <h3 className="text-sm font-medium mb-2">Tokens</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="tokens" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tool Calls Chart */}
          <div>
            <h3 className="text-sm font-medium mb-2">Tool Calls</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="tool_calls" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Duration Chart */}
          <div>
            <h3 className="text-sm font-medium mb-2">Avg Duration (s)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="duration" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
