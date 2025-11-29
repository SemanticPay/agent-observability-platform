import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { TrendingUp, TrendingDown, Clock, Target, Zap } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

interface Metric {
  label: string;
  value: string;
  unit: string;
  trend: "up" | "down" | "stable";
  trendValue: string;
  icon: typeof Zap;
  color: string;
  data: { value: number }[];
}

const generateTrendData = (baseValue: number, variance: number) => {
  return Array.from({ length: 20 }, (_, i) => ({
    value: baseValue + Math.sin(i * 0.5) * variance + Math.random() * variance * 0.5,
  }));
};

export function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      label: "Decisions/sec",
      value: "847",
      unit: "ops/s",
      trend: "up",
      trendValue: "+12%",
      icon: Zap,
      color: "text-blue-600",
      data: generateTrendData(850, 50),
    },
    {
      label: "Avg Latency",
      value: "234",
      unit: "ms",
      trend: "down",
      trendValue: "-8%",
      icon: Clock,
      color: "text-emerald-600",
      data: generateTrendData(230, 20),
    },
    {
      label: "Success Rate",
      value: "98.7",
      unit: "%",
      trend: "up",
      trendValue: "+2.3%",
      icon: Target,
      color: "text-indigo-600",
      data: generateTrendData(98, 2),
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => {
          let newValue: number;
          let newTrend: "up" | "down" | "stable";
          
          if (metric.label === "Decisions/sec") {
            newValue = 800 + Math.random() * 100;
            newTrend = newValue > parseFloat(metric.value) ? "up" : "down";
          } else if (metric.label === "Avg Latency") {
            newValue = 220 + Math.random() * 30;
            newTrend = newValue < parseFloat(metric.value) ? "up" : "down";
          } else {
            newValue = 97 + Math.random() * 2;
            newTrend = newValue > parseFloat(metric.value) ? "up" : "down";
          }

          const newData = [...metric.data.slice(1), { value: newValue }];

          return {
            ...metric,
            value: newValue.toFixed(metric.label === "Success Rate" ? 1 : 0),
            trend: newTrend,
            data: newData,
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getTrendColor = (trend: string, isLatency: boolean = false) => {
    if (isLatency) {
      return trend === "down" ? "text-emerald-600" : "text-amber-600";
    }
    return trend === "up" ? "text-emerald-600" : "text-amber-600";
  };

  const getTrendIcon = (trend: string, isLatency: boolean = false) => {
    if (isLatency) {
      return trend === "down" ? TrendingDown : TrendingUp;
    }
    return trend === "up" ? TrendingUp : TrendingDown;
  };

  return (
    <Card className="bg-white border-slate-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg text-slate-900 tracking-tight">Performance Metrics</h3>
        <p className="text-sm text-slate-600 mt-1">Key operational indicators</p>
      </div>

      <div className="space-y-4">
        {metrics.map((metric, index) => {
          const isLatency = metric.label === "Avg Latency";
          const TrendIcon = getTrendIcon(metric.trend, isLatency);
          
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-50 border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <metric.icon className={`w-4 h-4 ${metric.color}`} />
                    <span className="text-sm text-slate-600">{metric.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <motion.span
                      key={metric.value}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                      className={`text-2xl tracking-tight ${metric.color}`}
                    >
                      {metric.value}
                    </motion.span>
                    <span className="text-sm text-slate-500">{metric.unit}</span>
                  </div>
                </div>
                <div className="h-12 w-24 ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metric.data}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={
                          metric.label === "Decisions/sec"
                            ? "rgb(59, 130, 246)"
                            : metric.label === "Avg Latency"
                            ? "rgb(16, 185, 129)"
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
              <div className="flex items-center gap-2">
                <TrendIcon
                  className={`w-3 h-3 ${getTrendColor(metric.trend, isLatency)}`}
                />
                <span
                  className={`text-xs ${getTrendColor(metric.trend, isLatency)}`}
                >
                  {metric.trendValue}
                </span>
                <span className="text-xs text-slate-500">vs last hour</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="text-xs text-slate-600">
          System throughput: <span className="text-blue-600">847 ops/sec</span> •
          Processing <span className="text-blue-600">~3M</span> events/hour
        </div>
      </div>
    </Card>
  );
}
