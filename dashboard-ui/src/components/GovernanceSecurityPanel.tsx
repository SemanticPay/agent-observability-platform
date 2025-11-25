import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Shield, AlertTriangle, Clock } from "lucide-react";

interface ComplianceFramework {
  id: string;
  name: string;
  score: number;
  violations: number;
}

export function GovernanceSecurityPanel() {
  const [selectedFramework, setSelectedFramework] = useState<string>("all");
  const [complianceScore, setComplianceScore] = useState(96.8);
  const [totalViolations, setTotalViolations] = useState(7);
  const [recoveryLatency, setRecoveryLatency] = useState(12.4);

  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([
    { id: "gdpr", name: "GDPR", score: 98.2, violations: 2 },
    { id: "iso", name: "ISO 27001", score: 96.5, violations: 3 },
    { id: "soc2", name: "SOC 2", score: 95.8, violations: 2 },
    { id: "hipaa", name: "HIPAA", score: 99.1, violations: 0 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrameworks((prev) =>
        prev.map((fw) => ({
          ...fw,
          score: Math.max(94, Math.min(100, fw.score + (Math.random() - 0.5) * 0.5)),
          violations: Math.max(0, fw.violations + (Math.random() > 0.7 ? 1 : Math.random() < 0.3 ? -1 : 0)),
        }))
      );

      setComplianceScore((prev) => Math.max(94, Math.min(100, prev + (Math.random() - 0.5) * 0.3)));
      setTotalViolations((prev) => Math.max(0, prev + (Math.random() > 0.8 ? 1 : Math.random() < 0.2 ? -1 : 0)));
      setRecoveryLatency((prev) => Math.max(5, Math.min(20, prev + (Math.random() - 0.5) * 2)));
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const filteredFramework = selectedFramework === "all" 
    ? null 
    : frameworks.find((fw) => fw.id === selectedFramework);

  const displayScore = filteredFramework ? filteredFramework.score : complianceScore;
  const displayViolations = filteredFramework ? filteredFramework.violations : totalViolations;

  const circumference = 2 * Math.PI * 60;
  const progress = (displayScore / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 98) return "text-emerald-600";
    if (score >= 95) return "text-blue-600";
    if (score >= 90) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Card className="bg-white border-slate-200 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg text-slate-900 tracking-tight">Governance & Security</h3>
          <p className="text-sm text-slate-600 mt-1">Policy compliance monitoring</p>
        </div>
        <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedFramework("all")}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              selectedFramework === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Frameworks
          </button>
          {frameworks.map((fw) => (
            <button
              key={fw.id}
              onClick={() => setSelectedFramework(fw.id)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                selectedFramework === fw.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {fw.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compliance Score Meter */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex items-center justify-center">
          <div className="relative w-40 h-40">
            <svg className="w-40 h-40 -rotate-90">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="60"
                stroke="currentColor"
                strokeWidth="10"
                fill="none"
                className="text-slate-200"
              />
              {/* Progress circle */}
              <motion.circle
                cx="80"
                cy="80"
                r="60"
                stroke="url(#complianceGradient)"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - progress }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="complianceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgb(16, 185, 129)" />
                  <stop offset="100%" stopColor="rgb(59, 130, 246)" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <motion.div
                key={displayScore.toFixed(1)}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className={`text-3xl tracking-tight ${getScoreColor(displayScore)}`}
              >
                {displayScore.toFixed(1)}%
              </motion.div>
              <div className="text-xs text-slate-500 mt-1">Compliance</div>
            </div>
          </div>
        </div>

        {/* Violations & Recovery */}
        <div className="lg:col-span-2 space-y-6">
          {/* Policy Violations */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-slate-700">Policy Violations</span>
              </div>
              <Badge
                variant="outline"
                className={`text-xs ${
                  displayViolations === 0
                    ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                    : displayViolations < 5
                    ? "border-amber-200 text-amber-700 bg-amber-50"
                    : "border-red-200 text-red-700 bg-red-50"
                }`}
              >
                {displayViolations === 0 ? "No violations" : `${displayViolations} active`}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-slate-500 mb-1">Critical</div>
                <motion.div
                  key={`critical-${displayViolations}`}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-2xl text-red-600 tracking-tight"
                >
                  {Math.floor(displayViolations * 0.2)}
                </motion.div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Warning</div>
                <motion.div
                  key={`warning-${displayViolations}`}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-2xl text-amber-600 tracking-tight"
                >
                  {Math.floor(displayViolations * 0.5)}
                </motion.div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Info</div>
                <motion.div
                  key={`info-${displayViolations}`}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-2xl text-blue-600 tracking-tight"
                >
                  {Math.ceil(displayViolations * 0.3)}
                </motion.div>
              </div>
            </div>
          </div>

          {/* Recovery Latency */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-slate-700">Recovery Latency</span>
              </div>
              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-xs">
                Avg response time
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-xs text-slate-500 mb-1">Current</div>
                <motion.div
                  key={recoveryLatency.toFixed(1)}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-2xl text-blue-600 tracking-tight"
                >
                  {recoveryLatency.toFixed(1)}s
                </motion.div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Target</div>
                <div className="text-2xl text-emerald-600 tracking-tight">15.0s</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">24h Avg</div>
                <div className="text-2xl text-slate-700 tracking-tight">13.2s</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Framework Details */}
      {selectedFramework === "all" && (
        <div className="mt-8 pt-8 border-t border-slate-200">
          <div className="text-sm text-slate-600 mb-4">Framework Compliance Scores</div>
          <div className="grid grid-cols-4 gap-6">
            {frameworks.map((fw) => (
              <div key={fw.id} className="text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600">{fw.name}</span>
                  <span className={getScoreColor(fw.score)}>{fw.score.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${
                      fw.score >= 98
                        ? "bg-emerald-500"
                        : fw.score >= 95
                        ? "bg-blue-500"
                        : "bg-amber-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${fw.score}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
