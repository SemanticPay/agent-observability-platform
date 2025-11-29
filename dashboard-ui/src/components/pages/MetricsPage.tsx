import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useMetricsSummary, useMetricsByAgent, useMetricsTimeSeries } from "../../hooks/useMetrics";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { DollarSign, Cpu, Wrench, Clock, RefreshCw, Loader2, AlertCircle } from "lucide-react";

export function MetricsPage() {
  const [timeRange, setTimeRange] = useState("1h");
  
  const { data: summary, loading: summaryLoading, error: summaryError } = useMetricsSummary(timeRange);
  const { data: agentData, loading: agentLoading, error: agentError } = useMetricsByAgent(timeRange);
  const { data: timeSeries, loading: timeSeriesLoading, error: timeSeriesError } = useMetricsTimeSeries(24, "5m");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Observability Metrics</h1>
          <p className="text-slate-600">
            Real-time metrics from Prometheus for agent performance, cost, and usage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white text-sm"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last 1 hour</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
          </select>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <RefreshCw className="h-3 w-3" />
            Auto-refresh: 30s
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { title: "Total Cost", value: summary ? `$${summary.total_cost.toFixed(6)}` : "-", icon: <DollarSign className="h-4 w-4" /> },
          { title: "Tokens", value: summary ? summary.total_tokens.toLocaleString() : "-", icon: <Cpu className="h-4 w-4" /> },
          { title: "Tool Calls", value: summary ? summary.total_tool_calls.toLocaleString() : "-", icon: <Wrench className="h-4 w-4" /> },
          { title: "Avg Duration", value: summary ? `${summary.avg_execution_duration.toFixed(2)}s` : "-", icon: <Clock className="h-4 w-4" /> },
        ].map((item) => (
          <Card key={item.title} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{item.title}</span>
              <span className="text-slate-400">{item.icon}</span>
            </div>
            {summaryLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-400 mt-1" />
            ) : summaryError ? (
              <span className="text-red-500 text-sm">Error</span>
            ) : (
              <div className="text-xl font-bold mt-1">{item.value}</div>
            )}
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Metrics Bar Chart */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Agent Performance</CardTitle>
            <CardDescription>Metrics breakdown by agent</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {agentLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : agentError ? (
              <div className="flex items-center justify-center h-64 text-red-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                {agentError}
              </div>
            ) : agentData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                No agent data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={agentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="agent_id" fontSize={11} tick={{ fill: '#64748b' }} />
                  <YAxis fontSize={11} tick={{ fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="tokens" fill="#8b5cf6" name="Tokens" />
                  <Bar dataKey="tool_calls" fill="#06b6d4" name="Tool Calls" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Time Series Line Chart */}
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Token Usage Over Time</CardTitle>
            <CardDescription>Last 24 hours (5m resolution)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {timeSeriesLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : timeSeriesError ? (
              <div className="flex items-center justify-center h-64 text-red-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                {timeSeriesError}
              </div>
            ) : !timeSeries?.time_series?.tokens?.length ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                No time series data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={timeSeries.time_series.tokens.slice(-50)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="timestamp" 
                    fontSize={10}
                    tick={{ fill: '#64748b' }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                    }}
                  />
                  <YAxis fontSize={11} tick={{ fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(val) => new Date(val).toLocaleTimeString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={false}
                    name="Tokens/sec"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Details Table */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle>Agent Details</CardTitle>
          <CardDescription>Detailed metrics for each agent</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {agentLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : agentError ? (
            <div className="flex items-center justify-center h-32 text-red-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              {agentError}
            </div>
          ) : agentData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500">
              No agent data available. Run some queries to generate metrics.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-600">Agent</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Cost ($)</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Tokens</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Tool Calls</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">Avg Duration (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {agentData.map((agent) => (
                    <tr key={agent.agent_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium">{agent.agent_id}</td>
                      <td className="py-3 px-4 text-right text-emerald-600">${agent.cost?.toFixed(6) ?? '0'}</td>
                      <td className="py-3 px-4 text-right">{agent.tokens?.toLocaleString() ?? 0}</td>
                      <td className="py-3 px-4 text-right">{agent.tool_calls?.toLocaleString() ?? 0}</td>
                      <td className="py-3 px-4 text-right">{agent.duration?.toFixed(2) ?? '0.00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
