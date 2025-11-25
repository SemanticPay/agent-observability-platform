import { useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Gauge,
  Leaf,
  AlertTriangle,
  CheckCircle,
  Activity,
  Target,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";

// Forecast data
const performanceForecastData = [
  { month: "May", actual: 94.2, predicted: null, latency: 145 },
  { month: "Jun", actual: 95.1, predicted: null, latency: 138 },
  { month: "Jul", actual: 93.8, predicted: null, latency: 152 },
  { month: "Aug", actual: 96.4, predicted: null, latency: 128 },
  { month: "Sep", actual: 95.7, predicted: null, latency: 135 },
  { month: "Oct", actual: 97.2, predicted: null, latency: 118 },
  { month: "Nov", actual: 96.8, predicted: null, latency: 122 },
  { month: "Dec", actual: null, predicted: 97.5, latency: 115 },
  { month: "Jan", actual: null, predicted: 98.1, latency: 108 },
  { month: "Feb", actual: null, predicted: 98.7, latency: 102 },
];

const costTrajectoryData = [
  { month: "May", actual: 12400, predicted: null, lower: null, upper: null },
  { month: "Jun", actual: 13200, predicted: null, lower: null, upper: null },
  { month: "Jul", actual: 14100, predicted: null, lower: null, upper: null },
  { month: "Aug", actual: 13800, predicted: null, lower: null, upper: null },
  { month: "Sep", actual: 15200, predicted: null, lower: null, upper: null },
  { month: "Oct", actual: 16100, predicted: null, lower: null, upper: null },
  { month: "Nov", actual: 16800, predicted: null, lower: null, upper: null },
  { month: "Dec", actual: null, predicted: 17500, lower: 16200, upper: 18800 },
  { month: "Jan", actual: null, predicted: 18200, lower: 16800, upper: 19600 },
  { month: "Feb", actual: null, predicted: 18900, lower: 17400, upper: 20400 },
];

const emissionForecastData = [
  { month: "May", actual: 142, predicted: null },
  { month: "Jun", actual: 156, predicted: null },
  { month: "Jul", actual: 168, predicted: null },
  { month: "Aug", actual: 161, predicted: null },
  { month: "Sep", actual: 175, predicted: null },
  { month: "Oct", actual: 182, predicted: null },
  { month: "Nov", actual: 188, predicted: null },
  { month: "Dec", actual: null, predicted: 185 },
  { month: "Jan", actual: null, predicted: 179 },
  { month: "Feb", actual: null, predicted: 172 },
];

interface OptimizationInsight {
  id: string;
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  impact: string;
  confidence: number;
}

const insights: OptimizationInsight[] = [
  {
    id: "INS-001",
    priority: "high",
    category: "Cost Overrun",
    title: "Workflow A projected to exceed cost baseline by 12% next quarter",
    impact: "-$2,100/mo potential savings",
    confidence: 94,
  },
  {
    id: "INS-002",
    priority: "high",
    category: "Resource Optimization",
    title: "Agent B shows 18% idle time — optimization opportunity",
    impact: "-$850/mo potential savings",
    confidence: 89,
  },
  {
    id: "INS-003",
    priority: "medium",
    category: "Carbon Reduction",
    title: "Policy throttle could reduce CO₂ output by 9%",
    impact: "-16.9 kg CO₂/mo reduction",
    confidence: 87,
  },
  {
    id: "INS-004",
    priority: "medium",
    category: "Performance Gain",
    title: "Caching layer would improve latency by 23% for Agent C",
    impact: "+23% throughput increase",
    confidence: 82,
  },
  {
    id: "INS-005",
    priority: "low",
    category: "Scheduling",
    title: "Off-peak execution could reduce costs by 6% for batch jobs",
    impact: "-$420/mo potential savings",
    confidence: 76,
  },
];

// Anomaly heatmap data
const workflows = ["Sales-WF", "Support-WF", "Ops-WF", "Analytics-WF"];
const agents = ["AGT-001", "AGT-002", "AGT-003", "AGT-004"];

const anomalyData = [
  { workflow: "Sales-WF", agent: "AGT-001", delta: 2, status: "optimal" },
  { workflow: "Sales-WF", agent: "AGT-002", delta: -8, status: "drift" },
  { workflow: "Sales-WF", agent: "AGT-003", delta: 5, status: "optimal" },
  { workflow: "Sales-WF", agent: "AGT-004", delta: 15, status: "inefficient" },
  { workflow: "Support-WF", agent: "AGT-001", delta: -3, status: "optimal" },
  { workflow: "Support-WF", agent: "AGT-002", delta: 4, status: "optimal" },
  { workflow: "Support-WF", agent: "AGT-003", delta: -12, status: "drift" },
  { workflow: "Support-WF", agent: "AGT-004", delta: 1, status: "optimal" },
  { workflow: "Ops-WF", agent: "AGT-001", delta: 18, status: "inefficient" },
  { workflow: "Ops-WF", agent: "AGT-002", delta: -5, status: "optimal" },
  { workflow: "Ops-WF", agent: "AGT-003", delta: 7, status: "optimal" },
  { workflow: "Ops-WF", agent: "AGT-004", delta: -10, status: "drift" },
  { workflow: "Analytics-WF", agent: "AGT-001", delta: 3, status: "optimal" },
  { workflow: "Analytics-WF", agent: "AGT-002", delta: 12, status: "drift" },
  { workflow: "Analytics-WF", agent: "AGT-003", delta: -2, status: "optimal" },
  { workflow: "Analytics-WF", agent: "AGT-004", delta: 22, status: "inefficient" },
];

export function PredictiveIntelligence() {
  const [timeRange, setTimeRange] = useState("30d");
  const [agentType, setAgentType] = useState("all");
  const [metric, setMetric] = useState("cost");

  const getAnomalyColor = (status: string) => {
    switch (status) {
      case "optimal":
        return "bg-emerald-100 border-emerald-300 text-emerald-700";
      case "drift":
        return "bg-amber-100 border-amber-300 text-amber-700";
      case "inefficient":
        return "bg-red-100 border-red-300 text-red-700";
      default:
        return "bg-slate-100 border-slate-300 text-slate-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-200 text-red-700 bg-red-50";
      case "medium":
        return "border-amber-200 text-amber-700 bg-amber-50";
      case "low":
        return "border-blue-200 text-blue-700 bg-blue-50";
      default:
        return "border-slate-200 text-slate-600 bg-slate-50";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Filters */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-6 h-6 text-purple-600" />
              <h2 className="text-2xl text-slate-900 tracking-tight">Predictive Intelligence</h2>
            </div>
            <p className="text-slate-600">
              AI-powered forecasting and optimization recommendations
            </p>
          </div>
          <Badge className="border-purple-200 text-purple-700 bg-purple-50">
            <Sparkles className="w-3 h-3 mr-1" />
            ML-Powered
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] bg-white border-slate-200">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={agentType} onValueChange={setAgentType}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200">
              <SelectValue placeholder="Agent Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agents</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="ops">Operations</SelectItem>
            </SelectContent>
          </Select>

          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200">
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cost">Cost</SelectItem>
              <SelectItem value="throughput">Throughput</SelectItem>
              <SelectItem value="co2">CO₂ Emissions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-600 mb-1">Cost per Workflow</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-slate-900 tracking-tight">$142</span>
                <ArrowUpRight className="w-4 h-4 text-red-500" />
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Predicted:</span>
              <span className="text-slate-900">$156 (+9.8%)</span>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-600 mb-1">Throughput Increase</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-slate-900 tracking-tight">2.4k</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-emerald-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Predicted:</span>
              <span className="text-emerald-700">2.8k (+16.7%)</span>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Gauge className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-600 mb-1">Efficiency Gain</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-slate-900 tracking-tight">87%</span>
                <ArrowUpRight className="w-4 h-4 text-violet-500" />
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-violet-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Predicted:</span>
              <span className="text-violet-700">92% (+5.7%)</span>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-slate-600 mb-1">CO₂ Reduction</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl text-slate-900 tracking-tight">188</span>
                <ArrowDownRight className="w-4 h-4 text-green-500" />
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-green-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Predicted:</span>
              <span className="text-green-700">172 kg (-8.5%)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Forecast Graphs */}
      <div className="grid grid-cols-3 gap-8">
        {/* Performance Forecast */}
        <Card className="bg-white border-slate-200 p-8">
          <div className="mb-6">
            <h3 className="text-lg text-slate-900 tracking-tight mb-1">Performance Forecast</h3>
            <p className="text-sm text-slate-600">Past vs. predicted success rate and latency trends</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceForecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={12} domain={[90, 100]} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Actual Success Rate (%)"
                dot={{ fill: "#3b82f6", r: 4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="predicted"
                stroke="#8b5cf6"
                strokeWidth={3}
                strokeDasharray="5 5"
                name="Predicted Success Rate (%)"
                dot={{ fill: "#8b5cf6", r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="latency"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Latency (ms)"
                dot={{ fill: "#f59e0b", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Cost Trajectory */}
        <Card className="bg-white border-slate-200 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg text-slate-900 tracking-tight mb-1">Cost Trajectory</h3>
              <p className="text-sm text-slate-600">Forecasted spend with anomaly bands and optimization opportunities</p>
            </div>
            <div className="flex gap-2">
              <Badge className="border-amber-200 text-amber-700 bg-amber-50">
                <AlertTriangle className="w-3 h-3 mr-1" />
                2 Optimization Opportunities
              </Badge>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={costTrajectoryData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill="#ddd6fe"
                fillOpacity={0.3}
                name="Upper Bound"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="#ddd6fe"
                fillOpacity={0.3}
                name="Lower Bound"
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorActual)"
                name="Actual Cost ($)"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#8b5cf6"
                strokeWidth={3}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorPredicted)"
                name="Predicted Cost ($)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Emission Forecast */}
        <Card className="bg-white border-slate-200 p-8">
          <div className="mb-6">
            <h3 className="text-lg text-slate-900 tracking-tight mb-1">Emission Forecast</h3>
            <p className="text-sm text-slate-600">CO₂ projection aligned with workload scale</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={emissionForecastData}>
              <defs>
                <linearGradient id="colorEmission" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorEmission)"
                name="Actual CO₂ (kg)"
              />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="#059669"
                strokeWidth={3}
                strokeDasharray="5 5"
                fillOpacity={0.5}
                fill="url(#colorEmission)"
                name="Predicted CO₂ (kg)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Optimization Insights & Anomaly Heatmap */}
      <div className="grid grid-cols-3 gap-8">
        {/* Optimization Insights */}
        <Card className="col-span-2 bg-white border-slate-200 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg text-slate-900 tracking-tight mb-1">Optimization Insights</h3>
              <p className="text-sm text-slate-600">ML-generated recommendations ranked by impact</p>
            </div>
            <Badge className="border-purple-200 text-purple-700 bg-purple-50">
              {insights.length} Insights
            </Badge>
          </div>

          <div className="space-y-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="p-5 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`px-2 py-1 rounded text-xs border ${getPriorityColor(insight.priority)}`}>
                      {insight.priority.toUpperCase()}
                    </div>
                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-xs">
                      {insight.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Target className="w-3 h-3" />
                    {insight.confidence}% confidence
                  </div>
                </div>
                <h4 className="text-sm text-slate-900 mb-2">{insight.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-600">{insight.impact}</span>
                  <Button size="sm" variant="outline" className="border-slate-200 text-xs">
                    <Activity className="w-3 h-3 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Action Sidebar */}
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 p-8">
          <div className="mb-6">
            <h3 className="text-lg text-slate-900 tracking-tight mb-1">Quick Actions</h3>
            <p className="text-sm text-slate-600">Apply recommendations and insights</p>
          </div>

          <div className="space-y-3">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Policy Recommendation
            </Button>
            <Button variant="outline" className="w-full border-slate-300">
              <Activity className="w-4 h-4 mr-2" />
              Simulate Budget Impact
            </Button>
            <Button variant="outline" className="w-full border-slate-300">
              <RotateCcw className="w-4 h-4 mr-2" />
              Re-train Forecast Model
            </Button>
            <Button variant="outline" className="w-full border-slate-300">
              <Download className="w-4 h-4 mr-2" />
              Export Forecast Report
            </Button>
          </div>

          <div className="mt-8 p-4 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-start gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm text-slate-900 mb-1">Model Status</h4>
                <p className="text-xs text-slate-600">Last trained: 2 hours ago</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Accuracy:</span>
                <span className="text-slate-900">94.2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Data Points:</span>
                <span className="text-slate-900">12,450</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Next Update:</span>
                <span className="text-slate-900">6 hours</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Anomaly Heatmap */}
      <Card className="bg-white border-slate-200 p-8">
        <div className="mb-6">
          <h3 className="text-lg text-slate-900 tracking-tight mb-1">Anomaly Heatmap</h3>
          <p className="text-sm text-slate-600">Predicted vs. actual performance delta by workflow and agent</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300" />
              <span className="text-slate-600">Optimal (±5%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300" />
              <span className="text-slate-600">Drift (±10%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
              <span className="text-slate-600">Inefficient (&gt;10%)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-xs text-slate-500 pb-3 pr-4">Workflow</th>
                  {agents.map((agent) => (
                    <th key={agent} className="text-center text-xs text-slate-500 pb-3 px-2">
                      {agent}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow) => (
                  <tr key={workflow}>
                    <td className="text-sm text-slate-900 py-2 pr-4">{workflow}</td>
                    {agents.map((agent) => {
                      const cell = anomalyData.find(
                        (d) => d.workflow === workflow && d.agent === agent
                      );
                      return (
                        <td key={agent} className="px-2 py-2">
                          <div
                            className={`h-16 rounded border-2 flex items-center justify-center text-sm ${
                              cell ? getAnomalyColor(cell.status) : ""
                            }`}
                          >
                            {cell && (
                              <span>
                                {cell.delta > 0 ? "+" : ""}
                                {cell.delta}%
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}