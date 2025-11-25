import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { DollarSign, TrendingUp, TrendingDown, Users } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

interface KPIMetric {
  label: string;
  value: string;
  unit: string;
  trend: "up" | "down";
  trendValue: string;
  trendData: { value: number }[];
  color: string;
}

const generateTrendData = (baseValue: number, variance: number) => {
  return Array.from({ length: 7 }, (_, i) => ({
    value: baseValue + Math.sin(i * 0.8) * variance + Math.random() * variance * 0.3,
  }));
};

export function CostPerformanceAnalytics() {
  const [roiData, setRoiData] = useState({
    agentSpend: 18247,
    activeAgents: 310,
    taskCompletion: 94.2,
    roi: 3.2,
  });

  const [kpis, setKpis] = useState<KPIMetric[]>([
    {
      label: "Cost per Task",
      value: "2.84",
      unit: "$",
      trend: "down",
      trendValue: "-8%",
      trendData: generateTrendData(3.1, 0.4),
      color: "text-emerald-600",
    },
    {
      label: "Tasks Completed",
      value: "6,420",
      unit: "tasks",
      trend: "up",
      trendValue: "+12%",
      trendData: generateTrendData(6200, 300),
      color: "text-blue-600",
    },
    {
      label: "Agent Utilization",
      value: "78.4",
      unit: "%",
      trend: "up",
      trendValue: "+4.2%",
      trendData: generateTrendData(75, 5),
      color: "text-indigo-600",
    },
  ]);

  const [agentTypeEfficiency, setAgentTypeEfficiency] = useState([
    { type: "Customer Service", costPerTask: 1.87, utilization: 89.2 },
    { type: "Administrative", costPerTask: 2.14, utilization: 82.5 },
    { type: "Data Processing", costPerTask: 2.95, utilization: 76.8 },
    { type: "Research/Analysis", costPerTask: 3.24, utilization: 74.1 },
    { type: "Content Generation", costPerTask: 3.58, utilization: 71.4 },
    { type: "Code Quality/QA", costPerTask: 4.12, utilization: 68.3 },
    { type: "Security/Compliance", costPerTask: 4.87, utilization: 65.7 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRoiData((prev) => ({
        agentSpend: prev.agentSpend + Math.floor(Math.random() * 200) - 100,
        activeAgents: Math.max(280, Math.min(330, prev.activeAgents + Math.floor(Math.random() * 6) - 3)),
        taskCompletion: Math.max(90, Math.min(98, prev.taskCompletion + (Math.random() - 0.5) * 0.5)),
        roi: Math.max(2.5, Math.min(4, prev.roi + (Math.random() - 0.5) * 0.1)),
      }));

      setKpis((prev) =>
        prev.map((kpi) => {
          let newValue: number;
          let newTrend: "up" | "down";

          if (kpi.label === "Cost per Task") {
            newValue = 2.5 + Math.random() * 0.8;
            newTrend = newValue < parseFloat(kpi.value) ? "down" : "up";
          } else if (kpi.label === "Tasks Completed") {
            newValue = 6000 + Math.random() * 800;
            newTrend = newValue > parseFloat(kpi.value.replace(",", "")) ? "up" : "down";
          } else {
            newValue = 72 + Math.random() * 10;
            newTrend = newValue > parseFloat(kpi.value) ? "up" : "down";
          }

          const newData = [...kpi.trendData.slice(1), { value: newValue }];

          return {
            ...kpi,
            value: kpi.label === "Tasks Completed" 
              ? Math.floor(newValue).toLocaleString()
              : newValue.toFixed(kpi.label === "Cost per Task" ? 2 : 1),
            trend: newTrend,
            trendData: newData,
          };
        })
      );

      setAgentTypeEfficiency((prev) =>
        prev.map((item) => ({
          ...item,
          costPerTask: Math.max(1.5, Math.min(6, item.costPerTask + (Math.random() - 0.5) * 0.2)),
          utilization: Math.max(60, Math.min(95, item.utilization + (Math.random() - 0.5) * 2)),
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-white border-slate-200 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl text-slate-900 tracking-tight">Agent Workforce Cost Analytics</h2>
          <p className="text-sm text-slate-600 mt-1">Hiring costs, utilization, and ROI tracking</p>
        </div>
        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
          Live Data
        </Badge>
      </div>

      {/* ROI Widget */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Monthly Agent Spend</div>
          <motion.div
            key={roiData.agentSpend}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className="text-3xl text-slate-900 tracking-tight"
          >
            ${(roiData.agentSpend / 1000).toFixed(1)}k
          </motion.div>
          <div className="text-sm text-slate-600 mt-1">All subscriptions</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Active Agents</div>
          <motion.div
            key={roiData.activeAgents}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className="text-3xl text-slate-900 tracking-tight"
          >
            {roiData.activeAgents}
          </motion.div>
          <div className="text-sm text-slate-600 mt-1">Hired workforce</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Task Success Rate</div>
          <motion.div
            key={roiData.taskCompletion}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className="text-3xl text-emerald-600 tracking-tight"
          >
            {roiData.taskCompletion.toFixed(1)}%
          </motion.div>
          <div className="text-sm text-slate-600 mt-1">Completion rate</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="text-xs uppercase tracking-wider text-blue-700 mb-2">ROI Multiple</div>
          <motion.div
            key={roiData.roi}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className="text-3xl text-blue-700 tracking-tight"
          >
            {roiData.roi.toFixed(1)}x
          </motion.div>
          <div className="text-sm text-blue-600 mt-1">Value delivered</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {kpis.map((kpi, index) => {
          const TrendIcon = kpi.trend === "up" ? TrendingUp : TrendingDown;
          const trendColor = kpi.label === "Cost per Task" 
            ? (kpi.trend === "down" ? "text-emerald-600" : "text-red-600")
            : (kpi.trend === "up" ? "text-emerald-600" : "text-red-600");

          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-slate-200 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">{kpi.label}</div>
                  <div className="flex items-baseline gap-1">
                    {kpi.unit === "$" && <span className="text-lg text-slate-400">$</span>}
                    <motion.span
                      key={kpi.value}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                      className="text-3xl text-slate-900 tracking-tight"
                    >
                      {kpi.value}
                    </motion.span>
                    {kpi.unit !== "$" && <span className="text-sm text-slate-500 ml-1">{kpi.unit}</span>}
                  </div>
                </div>
                <div className="h-14 w-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={kpi.trendData}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={
                          kpi.label === "Cost per Task"
                            ? "rgb(16, 185, 129)"
                            : kpi.label === "Tasks Completed"
                            ? "rgb(59, 130, 246)"
                            : "rgb(99, 102, 241)"
                        }
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendIcon className={`w-4 h-4 ${trendColor}`} />
                  <span className={trendColor}>{kpi.trendValue}</span>
                </div>
                <span className="text-sm text-slate-400">vs last week</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Agent Type Efficiency Breakdown */}
      <div className="pt-8 border-t border-slate-200">
        <div className="text-sm text-slate-600 mb-4">Efficiency by Agent Type</div>
        <div className="space-y-3">
          {agentTypeEfficiency.map((item, index) => (
            <motion.div
              key={item.type}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-6 text-sm"
            >
              <div className="w-40 text-slate-700">{item.type}</div>
              <div className="flex-1 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Cost/Task:</span>
                  <span className="text-slate-900">${item.costPerTask.toFixed(2)}</span>
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-slate-500">Utilization:</span>
                  <div className="flex-1 max-w-xs">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.utilization}%` }}
                        transition={{ duration: 0.5, delay: index * 0.05 }}
                      />
                    </div>
                  </div>
                  <span className="text-slate-900 w-12 text-right">{item.utilization.toFixed(1)}%</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
}
