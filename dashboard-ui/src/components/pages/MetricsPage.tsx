import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { useMetricsSummary, useMetricsTimeSeries, useAgentsDetail } from "../../hooks/useMetrics";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from "recharts";
import { DollarSign, Cpu, Wrench, Clock, RefreshCw, Loader2, AlertCircle, Bot, Play } from "lucide-react";

export function MetricsPage() {
  const [timeRange, setTimeRange] = useState("1h");
  
  const { data: summary, loading: summaryLoading, error: summaryError } = useMetricsSummary(timeRange);
  const { data: timeSeries, loading: timeSeriesLoading, error: timeSeriesError } = useMetricsTimeSeries(24, "5m");
  const { data: agentsDetail, loading: agentsLoading, error: agentsError } = useAgentsDetail();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Observability Metrics</h1>
          <p className="text-slate-600">
            Real-time cost & performance metrics for agent operations
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
          { title: "Total Cost", value: summary ? `$${summary.total_cost.toFixed(6)}` : "-", icon: <DollarSign className="h-4 w-4" />, color: "text-emerald-600" },
          { title: "Total Runs", value: summary ? summary.total_runs.toLocaleString() : "-", icon: <Play className="h-4 w-4" />, color: "" },
          { title: "Tool Calls", value: summary ? summary.total_tool_calls.toLocaleString() : "-", icon: <Wrench className="h-4 w-4" />, color: "" },
          { title: "Avg Duration", value: summary ? `${summary.avg_execution_duration.toFixed(2)}s` : "-", icon: <Clock className="h-4 w-4" />, color: "" },
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
              <div className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</div>
            )}
          </Card>
        ))}
      </div>

      {/* Cost Over Time Chart */}
      <Card className="p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle>Cost Over Time</CardTitle>
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
          ) : !timeSeries?.time_series?.cost?.length ? (
            <div className="flex items-center justify-center h-64 text-slate-500">
              No cost data available yet. Run some queries to generate metrics.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeSeries.time_series.cost.slice(-50)}>
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
                <YAxis 
                  fontSize={11} 
                  tick={{ fill: '#64748b' }} 
                  tickFormatter={(val) => `$${val.toFixed(4)}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(val) => new Date(val).toLocaleTimeString()}
                  formatter={(value: number) => [`$${value.toFixed(6)}`, 'Cost']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  name="Cost"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per-Agent Detail Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-violet-500" />
          <h2 className="text-xl font-semibold">Agent Details</h2>
        </div>
        
        {agentsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : agentsError ? (
          <div className="flex items-center justify-center h-32 text-red-500">
            <AlertCircle className="h-5 w-5 mr-2" />
            {agentsError}
          </div>
        ) : agentsDetail.length === 0 ? (
          <Card className="p-6">
            <div className="flex items-center justify-center h-32 text-slate-500">
              No agent data available. Run some queries to generate metrics.
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agentsDetail.map((agent) => (
              <Card key={agent.name} className="p-5">
                {/* Agent Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{agent.name}</h3>
                  <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-2 py-1 rounded text-xs">
                    <Cpu className="h-3 w-3" />
                    {agent.model}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="text-xs text-emerald-600 mb-1">Total Cost</div>
                    <div className="text-lg font-bold text-emerald-700">${agent.cost.toFixed(6)}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">Runs</div>
                    <div className="text-lg font-bold">{agent.runs}</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 col-span-2">
                    <div className="text-xs text-slate-500 mb-1">Avg Duration</div>
                    <div className="text-lg font-bold">{agent.avg_duration.toFixed(2)}s</div>
                  </div>
                </div>

                {/* Tools Section */}
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-2">Tools</div>
                  {agent.tools.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No tools (orchestrator)</div>
                  ) : (
                    <div className="space-y-2">
                      {agent.tools.map((tool) => (
                        <div key={tool.name} className="flex items-center justify-between bg-cyan-50 rounded px-3 py-2">
                          <span className="inline-flex items-center gap-1 text-cyan-700 text-sm">
                            <Wrench className="h-3 w-3" />
                            {tool.name}
                          </span>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <span>{tool.calls} calls</span>
                            <span>{tool.avg_duration.toFixed(2)}s avg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
