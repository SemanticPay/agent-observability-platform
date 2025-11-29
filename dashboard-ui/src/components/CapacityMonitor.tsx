import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Server, TrendingUp, TrendingDown } from "lucide-react";

interface Resource {
  name: string;
  current: number;
  max: number;
  trend: "up" | "down" | "stable";
  unit: string;
}

export function CapacityMonitor() {
  const [resources, setResources] = useState<Resource[]>([
    { name: "Agent Capacity", current: 247, max: 350, trend: "up", unit: "agents" },
    { name: "Task Queue", current: 1842, max: 5000, trend: "stable", unit: "tasks" },
    { name: "Memory Usage", current: 68, max: 100, trend: "up", unit: "%" },
    { name: "Network Bandwidth", current: 425, max: 1000, trend: "down", unit: "Mbps" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setResources((prev) =>
        prev.map((resource) => {
          const variance = resource.max * 0.05;
          const newCurrent = Math.max(
            0,
            Math.min(
              resource.max,
              resource.current + (Math.random() - 0.5) * variance
            )
          );
          
          const trends: Resource["trend"][] = ["up", "down", "stable"];
          const newTrend = Math.random() > 0.8 
            ? trends[Math.floor(Math.random() * trends.length)]
            : resource.trend;

          return {
            ...resource,
            current: newCurrent,
            trend: newTrend,
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (percentage: number) => {
    if (percentage > 85) return { bg: "bg-red-500", text: "text-red-600", badge: "border-red-200 text-red-700 bg-red-50" };
    if (percentage > 70) return { bg: "bg-amber-500", text: "text-amber-600", badge: "border-amber-200 text-amber-700 bg-amber-50" };
    return { bg: "bg-emerald-500", text: "text-emerald-600", badge: "border-emerald-200 text-emerald-700 bg-emerald-50" };
  };

  const getTrendIcon = (trend: Resource["trend"]) => {
    if (trend === "up") return <TrendingUp className="w-3 h-3" />;
    if (trend === "down") return <TrendingDown className="w-3 h-3" />;
    return <div className="w-3 h-3" />;
  };

  return (
    <Card className="bg-white border-slate-200 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg text-slate-900 tracking-tight">Capacity Monitor</h3>
          <p className="text-sm text-slate-600 mt-1">System resource utilization</p>
        </div>
        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
          Real-time
        </Badge>
      </div>

      <div className="space-y-6">
        {resources.map((resource, index) => {
          const percentage = (resource.current / resource.max) * 100;
          const colors = getStatusColor(percentage);
          
          return (
            <motion.div
              key={resource.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Server className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-sm text-slate-900">{resource.name}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <motion.span
                      key={resource.current}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                      className="text-2xl text-slate-900 tracking-tight"
                    >
                      {resource.unit === "%" 
                        ? resource.current.toFixed(1)
                        : Math.floor(resource.current).toLocaleString()
                      }
                    </motion.span>
                    <span className="text-sm text-slate-500">
                      / {resource.unit === "%" 
                        ? resource.max
                        : resource.max.toLocaleString()
                      } {resource.unit}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${colors.badge}`}>
                    {percentage.toFixed(0)}%
                  </Badge>
                  <div className={resource.trend === "up" ? "text-red-600" : resource.trend === "down" ? "text-emerald-600" : "text-slate-400"}>
                    {getTrendIcon(resource.trend)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className={`absolute inset-y-0 left-0 ${colors.bg} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Additional Info */}
              <div className="flex items-center justify-between mt-3 text-xs text-slate-600">
                <span>
                  {resource.unit === "%" 
                    ? `${(100 - percentage).toFixed(1)}% available`
                    : `${(resource.max - resource.current).toFixed(0)} ${resource.unit} available`
                  }
                </span>
                <span className={percentage > 85 ? "text-red-600" : percentage > 70 ? "text-amber-600" : "text-emerald-600"}>
                  {percentage > 85 ? "High utilization" : percentage > 70 ? "Moderate" : "Healthy"}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="text-sm text-slate-600">
          Overall system health: <span className="text-emerald-600">Optimal</span> • 
          All resources within acceptable range
        </div>
      </div>
    </Card>
  );
}
