import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Brain, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Decision {
  id: string;
  agent: string;
  decision: string;
  confidence: number;
  outcome: "approved" | "rejected" | "escalated";
  timestamp: string;
}

const decisions = [
  "Approve expense claim #8472",
  "Reject loan application #3291",
  "Escalate fraud detection case",
  "Approve customer refund request",
  "Auto-close support ticket #9847",
  "Flag suspicious transaction",
  "Approve workflow automation",
  "Reject duplicate entry",
  "Route to human review",
  "Classify as high priority",
];

const generateDecision = (): Decision => {
  const outcomes: Decision["outcome"][] = ["approved", "rejected", "escalated"];
  return {
    id: `DEC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    agent: `AGT-${Math.floor(Math.random() * 310).toString().padStart(3, "0")}`,
    decision: decisions[Math.floor(Math.random() * decisions.length)],
    confidence: Math.random() * 30 + 70,
    outcome: outcomes[Math.floor(Math.random() * outcomes.length)],
    timestamp: new Date().toLocaleTimeString(),
  };
};

export function RecentDecisions() {
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([]);

  useEffect(() => {
    // Initialize with some decisions
    const initialDecisions = Array.from({ length: 8 }, generateDecision);
    setRecentDecisions(initialDecisions);

    // Add new decisions periodically
    const interval = setInterval(() => {
      const newDecision = generateDecision();
      setRecentDecisions((prev) => [newDecision, ...prev.slice(0, 14)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getOutcomeIcon = (outcome: Decision["outcome"]) => {
    switch (outcome) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "escalated":
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
  };

  const getOutcomeColor = (outcome: Decision["outcome"]) => {
    switch (outcome) {
      case "approved":
        return "border-emerald-200 text-emerald-700 bg-emerald-50";
      case "rejected":
        return "border-red-200 text-red-700 bg-red-50";
      case "escalated":
        return "border-amber-200 text-amber-700 bg-amber-50";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-emerald-600";
    if (confidence >= 75) return "text-blue-600";
    return "text-amber-600";
  };

  return (
    <Card className="bg-white border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-5 h-5 text-indigo-600" />
        <div>
          <h3 className="text-lg text-slate-900 tracking-tight">Recent Decisions</h3>
          <p className="text-sm text-slate-600 mt-1">Agent decision log</p>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-3 pr-4">
          <AnimatePresence mode="popLayout">
            {recentDecisions.map((decision, index) => (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getOutcomeIcon(decision.outcome)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="text-sm text-slate-900 mb-1">
                          {decision.decision}
                        </div>
                        <div className="text-xs text-slate-600">
                          by {decision.agent}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs whitespace-nowrap ${getOutcomeColor(decision.outcome)}`}
                      >
                        {decision.outcome}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">{decision.timestamp}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Confidence:</span>
                        <span className={getConfidenceColor(decision.confidence)}>
                          {decision.confidence.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div>
            <span className="text-emerald-600">
              {recentDecisions.filter((d) => d.outcome === "approved").length}
            </span>{" "}
            approved
          </div>
          <div>
            <span className="text-red-600">
              {recentDecisions.filter((d) => d.outcome === "rejected").length}
            </span>{" "}
            rejected
          </div>
          <div>
            <span className="text-amber-600">
              {recentDecisions.filter((d) => d.outcome === "escalated").length}
            </span>{" "}
            escalated
          </div>
        </div>
      </div>
    </Card>
  );
}
