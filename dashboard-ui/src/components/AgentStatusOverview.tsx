import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Activity, Circle, XCircle, AlertCircle } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface StatusCount {
  active: number;
  idle: number;
  offline: number;
  unverified: number;
}

const generateHistoricalData = () => {
  const data = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    data.push({
      time: now - i * 60 * 60 * 1000,
      active: 200 + Math.floor(Math.random() * 80),
      idle: 40 + Math.floor(Math.random() * 20),
      offline: 5 + Math.floor(Math.random() * 10),
      unverified: 2 + Math.floor(Math.random() * 5),
    });
  }
  return data;
};

export function AgentStatusOverview() {
  const [counts, setCounts] = useState<StatusCount>({
    active: 247,
    idle: 52,
    offline: 8,
    unverified: 3,
  });
  const [historicalData] = useState(generateHistoricalData());
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounts((prev) => ({
        active: Math.max(200, Math.min(280, prev.active + Math.floor(Math.random() * 10) - 5)),
        idle: Math.max(30, Math.min(70, prev.idle + Math.floor(Math.random() * 6) - 3)),
        offline: Math.max(0, Math.min(15, prev.offline + Math.floor(Math.random() * 4) - 2)),
        unverified: Math.max(0, Math.min(10, prev.unverified + Math.floor(Math.random() * 2) - 1)),
      }));
      setPulse((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const total = counts.active + counts.idle + counts.offline + counts.unverified;
  const activePercentage = ((counts.active / total) * 100).toFixed(1);

  const statuses = [
    {
      label: "Active",
      count: counts.active,
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      label: "Idle",
      count: counts.idle,
      icon: Circle,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
    },
    {
      label: "Offline",
      count: counts.offline,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    {
      label: "Unverified",
      count: counts.unverified,
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  ];

  return (
    <Card className="bg-white border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg text-slate-900 tracking-tight">Agent Status</h3>
          <p className="text-sm text-slate-600 mt-1">
            {activePercentage}% operational
          </p>
        </div>
        <motion.div
          key={pulse}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6 }}
          className="w-2 h-2 rounded-full bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {statuses.map((status) => (
          <motion.div
            key={status.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${status.bgColor} ${status.borderColor} border rounded-lg p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <status.icon className={`w-4 h-4 ${status.color}`} />
              <Badge
                variant="outline"
                className={`${status.color} border-current text-xs`}
              >
                {status.label}
              </Badge>
            </div>
            <motion.div
              key={`${status.label}-${status.count}`}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`text-2xl tracking-tight ${status.color}`}
            >
              {status.count}
            </motion.div>
            <div className="text-xs text-slate-500 mt-1">
              {((status.count / total) * 100).toFixed(1)}%
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4">
        <div className="text-xs text-slate-500 mb-2">24h Activity Trend</div>
        <div className="h-20 rounded-lg bg-slate-50 border border-slate-200 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="active"
                stroke="rgb(59, 130, 246)"
                strokeWidth={2}
                fill="url(#activeGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Total Agents</span>
          <span className="text-slate-900 tracking-tight">{total}</span>
        </div>
      </div>
    </Card>
  );
}
