import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface BudgetItem {
  category: string;
  allocated: number;
  spent: number;
  status: "healthy" | "warning" | "over";
  agentCount: number;
  avgCostPerAgent: number;
}

export function BudgetTracking() {
  const [viewMode, setViewMode] = useState<"type" | "platform">("type");
  
  const [budgetsByType, setBudgetsByType] = useState<BudgetItem[]>([
    { category: "Data Processing", allocated: 6000, spent: 5240, status: "warning", agentCount: 68, avgCostPerAgent: 77.06 },
    { category: "Code Quality/QA", allocated: 5000, spent: 4180, status: "healthy", agentCount: 45, avgCostPerAgent: 92.89 },
    { category: "Customer Service", allocated: 4500, spent: 3920, status: "warning", agentCount: 82, avgCostPerAgent: 47.80 },
    { category: "Content Generation", allocated: 3200, spent: 2840, status: "healthy", agentCount: 38, avgCostPerAgent: 74.74 },
    { category: "Research/Analysis", allocated: 2500, spent: 2210, status: "healthy", agentCount: 31, avgCostPerAgent: 71.29 },
    { category: "Administrative", allocated: 2000, spent: 1680, status: "healthy", agentCount: 28, avgCostPerAgent: 60.00 },
    { category: "Security/Compliance", allocated: 1300, spent: 1177, status: "warning", agentCount: 18, avgCostPerAgent: 65.39 },
  ]);

  const [budgetsByPlatform, setBudgetsByPlatform] = useState<BudgetItem[]>([
    { category: "Skyfire Agents", allocated: 8000, spent: 6420, status: "healthy", agentCount: 95, avgCostPerAgent: 67.58 },
    { category: "Vertex AI Agents", allocated: 5000, spent: 4890, status: "warning", agentCount: 82, avgCostPerAgent: 59.63 },
    { category: "Agentforce", allocated: 4000, spent: 3210, status: "healthy", agentCount: 68, avgCostPerAgent: 47.21 },
    { category: "LangChain Agents", allocated: 2500, spent: 2145, status: "warning", agentCount: 42, avgCostPerAgent: 51.07 },
    { category: "CrewAI", allocated: 2000, spent: 1582, status: "healthy", agentCount: 23, avgCostPerAgent: 68.78 },
  ]);

  const [projectedTotal, setProjectedTotal] = useState(21450);

  useEffect(() => {
    const interval = setInterval(() => {
      setBudgetsByType((prev) =>
        prev.map((item) => {
          const newSpent = Math.max(
            item.spent * 0.7,
            Math.min(item.allocated * 1.1, item.spent + Math.floor(Math.random() * 100) - 40)
          );
          const percentage = (newSpent / item.allocated) * 100;
          const newStatus: BudgetItem["status"] =
            percentage > 100 ? "over" : percentage > 85 ? "warning" : "healthy";

          return {
            ...item,
            spent: newSpent,
            status: newStatus,
            avgCostPerAgent: newSpent / item.agentCount,
          };
        })
      );

      setBudgetsByPlatform((prev) =>
        prev.map((item) => {
          const newSpent = Math.max(
            item.spent * 0.7,
            Math.min(item.allocated * 1.1, item.spent + Math.floor(Math.random() * 100) - 40)
          );
          const percentage = (newSpent / item.allocated) * 100;
          const newStatus: BudgetItem["status"] =
            percentage > 100 ? "over" : percentage > 85 ? "warning" : "healthy";

          return {
            ...item,
            spent: newSpent,
            status: newStatus,
            avgCostPerAgent: newSpent / item.agentCount,
          };
        })
      );

      setProjectedTotal((prev) => Math.max(19000, Math.min(23000, prev + Math.floor(Math.random() * 200) - 100)));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const budgets = viewMode === "type" ? budgetsByType : budgetsByPlatform;
  const totalAllocated = budgets.reduce((sum, item) => sum + item.allocated, 0);
  const totalSpent = budgets.reduce((sum, item) => sum + item.spent, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "border-emerald-200 text-emerald-700 bg-emerald-50";
      case "warning":
        return "border-amber-200 text-amber-700 bg-amber-50";
      case "over":
        return "border-red-200 text-red-700 bg-red-50";
      default:
        return "border-slate-200 text-slate-700";
    }
  };

  const variance = totalSpent - (totalAllocated * 0.75);
  const isOverBudget = totalSpent > totalAllocated;

  return (
    <Card className="bg-white border-slate-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg text-slate-900 tracking-tight">Agent Workforce Budget</h3>
          <p className="text-sm text-slate-600 mt-1">Monthly hiring allocation vs. actuals</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("type")}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                viewMode === "type"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              By Type
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
          <Badge variant="outline" className={getStatusColor(isOverBudget ? "over" : "healthy")}>
            {isOverBudget ? "Over Budget" : "On Track"}
          </Badge>
        </div>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Total Allocated</div>
          <div className="text-2xl text-slate-900 tracking-tight">${(totalAllocated / 1000).toFixed(1)}k</div>
          <div className="text-xs text-slate-600 mt-1">Agent hiring budget</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Total Spent</div>
          <div className="text-2xl text-slate-900 tracking-tight">${(totalSpent / 1000).toFixed(1)}k</div>
          <div className="flex items-center gap-1 mt-1">
            {variance > 0 ? (
              <>
                <TrendingUp className="w-3 h-3 text-red-600" />
                <span className="text-xs text-red-600">+${(variance / 1000).toFixed(1)}k</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-3 h-3 text-emerald-600" />
                <span className="text-xs text-emerald-600">${(Math.abs(variance) / 1000).toFixed(1)}k under</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-4">
        {budgets.map((budget, index) => {
          const percentage = (budget.spent / budget.allocated) * 100;
          
          return (
            <motion.div
              key={budget.category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700">{budget.category}</span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {budget.agentCount} agents
                  </span>
                  {budget.status === "warning" && (
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                  )}
                  {budget.status === "over" && (
                    <AlertCircle className="w-3 h-3 text-red-600" />
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  ${(budget.spent / 1000).toFixed(1)}k / ${(budget.allocated / 1000).toFixed(1)}k
                </div>
              </div>
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${
                    budget.status === "over"
                      ? "bg-red-500"
                      : budget.status === "warning"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, percentage)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-500">
                  {percentage.toFixed(1)}% utilized • ${budget.avgCostPerAgent.toFixed(2)}/agent
                </span>
                <span className="text-xs text-slate-500">
                  ${((budget.allocated - budget.spent) / 1000).toFixed(1)}k remaining
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Projection */}
      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Projected End-of-Month</span>
          <div className="text-right">
            <div className="text-lg text-slate-900 tracking-tight">${(projectedTotal / 1000).toFixed(1)}k</div>
            <div className="text-xs text-slate-500">
              {projectedTotal > totalAllocated ? "Over budget" : "Within budget"}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
