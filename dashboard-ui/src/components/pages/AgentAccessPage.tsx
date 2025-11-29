import { AgentDataAccess } from "../AgentDataAccess";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Shield, Database, AlertCircle, CheckCircle } from "lucide-react";

export function AgentAccessPage() {
  return (
    <div className="max-w-[1800px] mx-auto px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 tracking-tight mb-2">
            Agent Identity & Data Access
          </h1>
          <p className="text-slate-600">
            Manage agent credentials and control access to enterprise data sources
          </p>
        </div>
        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
          KYA + Access Control
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-5 gap-6">
        <Card className="bg-white border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Verified Agents</div>
              <div className="text-2xl text-slate-900 tracking-tight">7</div>
            </div>
          </div>
          <div className="text-xs text-slate-600">1 pending verification</div>
        </Card>

        <Card className="bg-white border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Database className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Data Sources</div>
              <div className="text-2xl text-slate-900 tracking-tight">8</div>
            </div>
          </div>
          <div className="text-xs text-slate-600">4 marked sensitive</div>
        </Card>

        <Card className="bg-white border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">MCP Tools</div>
              <div className="text-2xl text-slate-900 tracking-tight">12</div>
            </div>
          </div>
          <div className="text-xs text-slate-600">4 require approval</div>
        </Card>

        <Card className="bg-white border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Active Permissions</div>
              <div className="text-2xl text-slate-900 tracking-tight">34</div>
            </div>
          </div>
          <div className="text-xs text-slate-600">Across all agents</div>
        </Card>

        <Card className="bg-white border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Risk Alerts</div>
              <div className="text-2xl text-amber-600 tracking-tight">3</div>
            </div>
          </div>
          <div className="text-xs text-slate-600">Requires attention</div>
        </Card>
      </div>

      {/* Main Access Management */}
      <AgentDataAccess />

      {/* Security Notice */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 p-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm text-slate-900 mb-1">Security Best Practices</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              Follow the principle of least privilege: grant agents only the minimum access level required
              for their tasks. Regularly audit permissions and revoke unused access. High-risk agents should
              undergo additional verification before accessing sensitive data sources.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
