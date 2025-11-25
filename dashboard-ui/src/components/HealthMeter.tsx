import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Activity, CheckCircle, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface HealthMetrics {
  uptime: number;
  compliance: number;
  telemetry: number;
  overall: number;
}

export function HealthMeter() {
  const [metrics, setMetrics] = useState<HealthMetrics>({
    uptime: 99.8,
    compliance: 98.5,
    telemetry: 99.2,
    overall: 99.2,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => {
        const uptime = Math.max(98, Math.min(100, prev.uptime + (Math.random() - 0.5) * 0.2));
        const compliance = Math.max(97, Math.min(100, prev.compliance + (Math.random() - 0.5) * 0.3));
        const telemetry = Math.max(98, Math.min(100, prev.telemetry + (Math.random() - 0.5) * 0.2));
        const overall = (uptime + compliance + telemetry) / 3;
        
        return {
          uptime,
          compliance,
          telemetry,
          overall,
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getHealthStatus = (score: number) => {
    if (score >= 99) return { label: "Excellent", color: "text-emerald-600" };
    if (score >= 95) return { label: "Good", color: "text-blue-600" };
    if (score >= 90) return { label: "Fair", color: "text-amber-600" };
    return { label: "Critical", color: "text-red-600" };
  };

  const status = getHealthStatus(metrics.overall);
  const circumference = 2 * Math.PI * 45;
  const progress = (metrics.overall / 100) * circumference;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="bg-white border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-slate-200"
                  />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="45"
                    stroke="url(#healthGradient)"
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference - progress }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="rgb(16, 185, 129)" />
                      <stop offset="100%" stopColor="rgb(59, 130, 246)" />
                    </linearGradient>
                  </defs>
                </svg>
                
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <motion.div
                    key={metrics.overall.toFixed(1)}
                    initial={{ scale: 1.05 }}
                    animate={{ scale: 1 }}
                    className={`text-xl tracking-tight ${status.color}`}
                  >
                    {metrics.overall.toFixed(1)}
                  </motion.div>
                  <div className="text-xs text-slate-500">Health</div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className={`w-4 h-4 ${status.color}`} />
                  <span className={`text-sm ${status.color}`}>{status.label}</span>
                </div>
                <div className="text-xs text-slate-500">System Health</div>
                <div className="text-xs text-slate-600 mt-1">
                  All systems operational
                </div>
              </div>
            </div>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-white border-slate-200">
          <div className="space-y-2 p-2">
            <div className="text-sm text-slate-700 mb-2">Health Breakdown</div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-blue-600" />
                <span className="text-xs text-slate-600">Uptime</span>
              </div>
              <span className="text-xs text-slate-900">{metrics.uptime.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-indigo-600" />
                <span className="text-xs text-slate-600">Compliance</span>
              </div>
              <span className="text-xs text-slate-900">{metrics.compliance.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3 text-emerald-600" />
                <span className="text-xs text-slate-600">Telemetry</span>
              </div>
              <span className="text-xs text-slate-900">{metrics.telemetry.toFixed(1)}%</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
