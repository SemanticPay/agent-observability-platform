import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Shield, CheckCircle, Eye, DollarSign } from "lucide-react";

interface GlobalMetric {
  label: string;
  value: string;
  icon: typeof Shield;
  color: string;
  change?: string;
}

export function GlobalMetricsFooter() {
  const [metrics, setMetrics] = useState<GlobalMetric[]>([
    {
      label: "Governed Agents",
      value: "310",
      icon: Shield,
      color: "text-cyan-400",
      change: "+5",
    },
    {
      label: "Attested Decisions",
      value: "8.4M",
      icon: CheckCircle,
      color: "text-emerald-400",
      change: "+12%",
    },
    {
      label: "Compliance Coverage",
      value: "96.8%",
      icon: Eye,
      color: "text-violet-400",
      change: "+2.1%",
    },
    {
      label: "Cost Visibility",
      value: "$12.8k",
      icon: DollarSign,
      color: "text-amber-400",
      change: "-8%",
    },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => {
          let newValue: string;

          if (metric.label === "Governed Agents") {
            const current = parseInt(metric.value);
            newValue = (current + Math.floor(Math.random() * 3) - 1).toString();
          } else if (metric.label === "Attested Decisions") {
            const current = parseFloat(metric.value);
            newValue = (current + (Math.random() - 0.5) * 0.1).toFixed(1) + "M";
          } else if (metric.label === "Compliance Coverage") {
            const current = parseFloat(metric.value);
            newValue = (Math.max(94, Math.min(100, current + (Math.random() - 0.5) * 0.2))).toFixed(1) + "%";
          } else {
            const current = parseFloat(metric.value.replace("$", "").replace("k", ""));
            newValue = "$" + (current + (Math.random() - 0.5) * 0.5).toFixed(1) + "k";
          }

          return {
            ...metric,
            value: newValue,
          };
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-50">
      <div className="max-w-[1800px] mx-auto px-6 py-4">
        <div className="grid grid-cols-4 gap-6">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${
                  metric.label === "Governed Agents" ? "from-cyan-500/20 to-blue-500/20" :
                  metric.label === "Attested Decisions" ? "from-emerald-500/20 to-green-500/20" :
                  metric.label === "Compliance Coverage" ? "from-violet-500/20 to-purple-500/20" :
                  "from-amber-500/20 to-orange-500/20"
                } flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-500">{metric.label}</div>
                  <div className="flex items-baseline gap-2">
                    <motion.div
                      key={metric.value}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className={`text-lg ${metric.color}`}
                    >
                      {metric.value}
                    </motion.div>
                    {metric.change && (
                      <span className={`text-xs ${
                        metric.change.startsWith("+") && !metric.label.includes("Cost")
                          ? "text-emerald-400"
                          : metric.change.startsWith("-") && metric.label.includes("Cost")
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }`}>
                        {metric.change}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
