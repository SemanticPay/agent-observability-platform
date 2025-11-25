import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMetricsByAgent } from "../hooks/useMetrics";
import { Loader2 } from "lucide-react";

export function AgentMetricsTable() {
  const { data, loading, error } = useMetricsByAgent("1h");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Metrics</CardTitle>
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
          <CardTitle>Agent Metrics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-red-500">
          Error: {error}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agent Metrics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-slate-500">
          No agent data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Performance (Last Hour)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Chart */}
          <div>
            <h3 className="text-sm font-medium mb-4">Cost by Agent</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agent_id" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cost" fill="#8b5cf6" name="Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Agent ID</th>
                  <th className="text-right py-2 px-4">Cost ($)</th>
                  <th className="text-right py-2 px-4">Tokens</th>
                  <th className="text-right py-2 px-4">Tool Calls</th>
                  <th className="text-right py-2 px-4">Avg Duration (s)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((agent) => (
                  <tr key={agent.agent_id} className="border-b hover:bg-slate-50">
                    <td className="py-2 px-4 font-medium">{agent.agent_id}</td>
                    <td className="text-right py-2 px-4">{agent.cost?.toFixed(6) || "0.000000"}</td>
                    <td className="text-right py-2 px-4">{Math.round(agent.tokens || 0)}</td>
                    <td className="text-right py-2 px-4">{Math.round(agent.tool_calls || 0)}</td>
                    <td className="text-right py-2 px-4">{agent.duration?.toFixed(2) || "0.00"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
