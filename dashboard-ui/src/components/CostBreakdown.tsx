import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Database, Code, Headphones, FileText, Search, Calendar, Shield, TrendingUp } from "lucide-react";

interface AgentTypeCategory {
  name: string;
  value: number;
  color: string;
  count: number;
  icon: typeof Database;
}

interface ViewMode {
  mode: "type" | "platform";
}

export function CostBreakdown() {
  const [viewMode, setViewMode] = useState<"type" | "platform">("type");
  
  const [costByType, setCostByType] = useState<AgentTypeCategory[]>([
    { name: "Data Processing", value: 5240, color: "#3b82f6", count: 68, icon: Database },
    { name: "Code Quality/QA", value: 4180, color: "#8b5cf6", count: 45, icon: Code },
    { name: "Customer Service", value: 3920, color: "#10b981", count: 82, icon: Headphones },
    { name: "Content Generation", value: 2840, color: "#f59e0b", count: 38, icon: FileText },
    { name: "Research/Analysis", value: 2210, color: "#ef4444", count: 31, icon: Search },
    { name: "Administrative", value: 1680, color: "#06b6d4", count: 28, icon: Calendar },
    { name: "Security/Compliance", value: 1177, color: "#ec4899", count: 18, icon: Shield },
  ]);

  const [costByPlatform] = useState([
    { name: "Skyfire", value: 6420, color: "#3b82f6", model: "Per-task" },
    { name: "Vertex AI", value: 4890, color: "#8b5cf6", model: "Monthly" },
    { name: "Agentforce", value: 3210, color: "#10b981", model: "Usage-based" },
    { name: "LangChain", value: 2145, color: "#f59e0b", model: "Per-token" },
    { name: "CrewAI", value: 1582, color: "#ef4444", model: "Monthly" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCostByType((prev) =>
        prev.map((item) => ({
          ...item,
          value: Math.max(1000, item.value + Math.floor(Math.random() * 300) - 150),
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const displayData = viewMode === "type" ? costByType : costByPlatform;
  const total = displayData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="bg-white border-slate-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg text-slate-900 tracking-tight">Agent Hiring Costs</h3>
          <p className="text-sm text-slate-600 mt-1">Monthly expenditure breakdown</p>
        </div>
        <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("type")}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              viewMode === "type"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            By Agent Type
          </button>
          <button
            onClick={() => setViewMode("platform")}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              viewMode === "platform"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            By Platform
          </button>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          {viewMode === "type" ? (
            // Agent Type View
            costByType.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${item.color}20` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div>
                      <span className="text-sm text-slate-700">{item.name}</span>
                      <div className="text-xs text-slate-500">{item.count} agents</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-900">${(item.value / 1000).toFixed(1)}k</div>
                    <div className="text-xs text-slate-500">
                      {((item.value / total) * 100).toFixed(1)}%
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            // Platform View
            costByPlatform.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <span className="text-sm text-slate-700">{item.name}</span>
                    <div className="text-xs text-slate-500">{item.model}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-900">${(item.value / 1000).toFixed(1)}k</div>
                  <div className="text-xs text-slate-500">
                    {((item.value / total) * 100).toFixed(1)}%
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Total Agent Workforce Cost</span>
          <span className="text-xl text-slate-900 tracking-tight">${(total / 1000).toFixed(2)}k</span>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {viewMode === "type" 
            ? `${costByType.reduce((sum, t) => sum + t.count, 0)} agents across ${costByType.length} functional categories`
            : `${costByPlatform.length} active platform integrations • Mixed pricing models`
          }
        </div>
      </div>
    </Card>
  );
}
