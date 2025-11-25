import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { UserCheck, AlertCircle, Shield, Activity } from "lucide-react";

interface AgentIdentity {
  id: string;
  name: string;
  permissions: string[];
  recentActions: number;
  riskLevel: "low" | "medium" | "high";
  verified: boolean;
  lastAttestation: string;
}

const generateAgents = (): AgentIdentity[] => {
  const permissions = [
    ["read", "write"],
    ["read", "write", "delete"],
    ["read", "admin"],
    ["read", "write", "execute"],
  ];

  return Array.from({ length: 12 }, (_, i) => ({
    id: `AGT-${(i + 1).toString().padStart(3, "0")}`,
    name: `Agent-${(i + 1).toString().padStart(3, "0")}`,
    permissions: permissions[Math.floor(Math.random() * permissions.length)],
    recentActions: Math.floor(Math.random() * 150),
    riskLevel: Math.random() > 0.8 ? "high" : Math.random() > 0.5 ? "medium" : "low",
    verified: Math.random() > 0.1,
    lastAttestation: `${Math.floor(Math.random() * 30)} days ago`,
  }));
};

export function KYARiskPanel() {
  const [agents, setAgents] = useState<AgentIdentity[]>(generateAgents());
  const [selectedAgent, setSelectedAgent] = useState<AgentIdentity | null>(null);
  const [riskAlerts, setRiskAlerts] = useState({
    pendingAttestation: 2,
    anomalousActivity: 1,
    unverifiedIdentities: 1,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) =>
        prev.map((agent) => ({
          ...agent,
          recentActions: Math.max(0, agent.recentActions + Math.floor(Math.random() * 10) - 3),
          riskLevel:
            Math.random() > 0.95
              ? "high"
              : Math.random() > 0.7
              ? "medium"
              : "low",
        }))
      );

      setRiskAlerts((prev) => ({
        pendingAttestation: Math.max(0, Math.min(5, prev.pendingAttestation + (Math.random() > 0.8 ? 1 : Math.random() < 0.3 ? -1 : 0))),
        anomalousActivity: Math.max(0, Math.min(5, prev.anomalousActivity + (Math.random() > 0.9 ? 1 : Math.random() < 0.2 ? -1 : 0))),
        unverifiedIdentities: Math.max(0, Math.min(3, prev.unverifiedIdentities + (Math.random() > 0.95 ? 1 : Math.random() < 0.1 ? -1 : 0))),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "border-red-200 text-red-700 bg-red-50";
      case "medium":
        return "border-amber-200 text-amber-700 bg-amber-50";
      case "low":
        return "border-emerald-200 text-emerald-700 bg-emerald-50";
      default:
        return "border-slate-200 text-slate-600";
    }
  };

  const totalRiskAlerts = riskAlerts.pendingAttestation + riskAlerts.anomalousActivity + riskAlerts.unverifiedIdentities;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main KYA Matrix */}
      <Card className="lg:col-span-2 bg-white border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg text-slate-900 tracking-tight">Know Your Agent (KYA) Matrix</h3>
            <p className="text-sm text-slate-600 mt-1">
              {agents.filter((a) => a.verified).length} / {agents.length} verified
            </p>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            <AnimatePresence>
              {agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedAgent(agent)}
                  className={`bg-slate-50 border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedAgent?.id === agent.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-slate-900">{agent.name}</span>
                        {agent.verified ? (
                          <Shield className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${getRiskColor(agent.riskLevel)}`}
                        >
                          {agent.riskLevel}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">Permissions: </span>
                          <span className="text-slate-700">
                            {agent.permissions.join(", ")}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Actions: </span>
                          <span className="text-blue-600">{agent.recentActions}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-1">Last Attestation</div>
                      <div className="text-xs text-slate-700">{agent.lastAttestation}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Risk Radar Summary */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="text-sm text-slate-600 mb-4">Risk Distribution</div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <div className="text-2xl text-emerald-600 tracking-tight">
                {agents.filter((a) => a.riskLevel === "low").length}
              </div>
              <div className="text-xs text-slate-600 mt-1">Low Risk</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <div className="text-2xl text-amber-600 tracking-tight">
                {agents.filter((a) => a.riskLevel === "medium").length}
              </div>
              <div className="text-xs text-slate-600 mt-1">Medium Risk</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl text-red-600 tracking-tight">
                {agents.filter((a) => a.riskLevel === "high").length}
              </div>
              <div className="text-xs text-slate-600 mt-1">High Risk</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Risk Alerts Sidebar */}
      <Card className="bg-white border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg text-slate-900 tracking-tight">Risk Alerts</h3>
        </div>

        <div className="space-y-4">
          {/* Alert Summary */}
          <div className="bg-gradient-to-br from-amber-50 to-red-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-700">Active Alerts</span>
              <motion.div
                key={totalRiskAlerts}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className="text-2xl text-amber-700 tracking-tight"
              >
                {totalRiskAlerts}
              </motion.div>
            </div>
            <div className="text-xs text-slate-600">Require immediate attention</div>
          </div>

          {/* Individual Alerts */}
          <div className="space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <UserCheck className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-slate-900 mb-1">Pending Re-attestation</div>
                  <div className="text-xs text-slate-600 mb-2">
                    Agents requiring identity verification
                  </div>
                  <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-xs">
                    {riskAlerts.pendingAttestation} agents
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Activity className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-slate-900 mb-1">Anomalous Behavior</div>
                  <div className="text-xs text-slate-600 mb-2">
                    Unusual activity patterns detected
                  </div>
                  <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-xs">
                    {riskAlerts.anomalousActivity} detected
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm text-slate-900 mb-1">Unverified Identities</div>
                  <div className="text-xs text-slate-600 mb-2">
                    Agents without verified credentials
                  </div>
                  <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-xs">
                    {riskAlerts.unverifiedIdentities} unverified
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button 
            onClick={() => console.log('Review All Alerts clicked')}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg py-2.5 text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
          >
            Review All Alerts
          </button>
        </div>
      </Card>
    </div>
  );
}
