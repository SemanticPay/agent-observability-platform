import { useState } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Progress } from "../ui/progress";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  Filter,
  Lock,
  Unlock,
  Database,
  Globe,
  MapPin,
  Users,
  Activity,
  Calendar,
  AlertCircle,
  Eye,
  FileCheck,
} from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ComplianceFramework {
  id: string;
  name: string;
  agentsInScope: number;
  compliant: number;
  violating: number;
  unknown: number;
  lastAudit: string;
  nextAttestation: string;
  riskLevel: "low" | "medium" | "high";
  responsibleTeam: string;
  owner: string;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  user: string;
  impact: "low" | "medium" | "high";
}

interface Violation {
  id: string;
  category: string;
  agent: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  timestamp: string;
  framework: string;
}

const frameworks: ComplianceFramework[] = [
  {
    id: "hipaa",
    name: "HIPAA",
    agentsInScope: 12,
    compliant: 10,
    violating: 2,
    unknown: 0,
    lastAudit: "2024-10-15",
    nextAttestation: "2025-01-15",
    riskLevel: "medium",
    responsibleTeam: "Healthcare Ops",
    owner: "Sarah Chen",
  },
  {
    id: "gdpr",
    name: "GDPR",
    agentsInScope: 24,
    compliant: 22,
    violating: 1,
    unknown: 1,
    lastAudit: "2024-11-01",
    nextAttestation: "2025-02-01",
    riskLevel: "low",
    responsibleTeam: "Data Privacy",
    owner: "Marcus Weber",
  },
  {
    id: "iso27001",
    name: "ISO 27001",
    agentsInScope: 18,
    compliant: 15,
    violating: 3,
    unknown: 0,
    lastAudit: "2024-10-20",
    nextAttestation: "2025-01-20",
    riskLevel: "high",
    responsibleTeam: "Security Team",
    owner: "David Kim",
  },
  {
    id: "nist800207",
    name: "NIST 800-207",
    agentsInScope: 15,
    compliant: 14,
    violating: 0,
    unknown: 1,
    lastAudit: "2024-11-05",
    nextAttestation: "2025-02-05",
    riskLevel: "low",
    responsibleTeam: "Infrastructure",
    owner: "Rachel Lee",
  },
  {
    id: "soc2",
    name: "SOC 2 Type II",
    agentsInScope: 28,
    compliant: 26,
    violating: 2,
    unknown: 0,
    lastAudit: "2024-10-28",
    nextAttestation: "2025-01-28",
    riskLevel: "medium",
    responsibleTeam: "Compliance",
    owner: "James Park",
  },
];

const violations: Violation[] = [
  {
    id: "V-001",
    category: "Access Violation",
    agent: "DataProcessor-03",
    severity: "high",
    description: "Unauthorized access to PII database",
    timestamp: "2 hours ago",
    framework: "GDPR",
  },
  {
    id: "V-002",
    category: "Policy Breach",
    agent: "ContentWriter-02",
    severity: "medium",
    description: "Data retention policy not enforced",
    timestamp: "5 hours ago",
    framework: "HIPAA",
  },
  {
    id: "V-003",
    category: "Encryption Failure",
    agent: "EmailBot-01",
    severity: "critical",
    description: "Unencrypted data transmission detected",
    timestamp: "1 day ago",
    framework: "ISO 27001",
  },
  {
    id: "V-004",
    category: "Data Residency Risk",
    agent: "AnalyticsAgent-04",
    severity: "high",
    description: "EU data processed in non-compliant region",
    timestamp: "2 days ago",
    framework: "GDPR",
  },
  {
    id: "V-005",
    category: "Access Violation",
    agent: "AdminBot-02",
    severity: "medium",
    description: "Excessive permissions granted",
    timestamp: "3 days ago",
    framework: "SOC 2 Type II",
  },
];

const auditTrail: AuditEvent[] = [
  {
    id: "A-001",
    timestamp: "2024-11-07 14:23:15",
    type: "Policy Update",
    description: "Updated data retention policy for GDPR compliance",
    user: "admin@company.com",
    impact: "high",
  },
  {
    id: "A-002",
    timestamp: "2024-11-07 11:45:22",
    type: "Access Approval",
    description: "Granted read access to DataProcessor-05 for RDS database",
    user: "security@company.com",
    impact: "medium",
  },
  {
    id: "A-003",
    timestamp: "2024-11-06 16:30:08",
    type: "Key Rotation",
    description: "Rotated encryption keys for S3 storage buckets",
    user: "system",
    impact: "high",
  },
  {
    id: "A-004",
    timestamp: "2024-11-06 09:15:44",
    type: "TEE Attestation",
    description: "Verified trusted execution environment for AGT-007",
    user: "system",
    impact: "medium",
  },
  {
    id: "A-005",
    timestamp: "2024-11-05 13:20:30",
    type: "Access Revocation",
    description: "Revoked write permissions from AdminBot-01",
    user: "admin@company.com",
    impact: "medium",
  },
];

const complianceTrendData = [
  { month: "May", score: 82 },
  { month: "Jun", score: 85 },
  { month: "Jul", score: 88 },
  { month: "Aug", score: 86 },
  { month: "Sep", score: 90 },
  { month: "Oct", score: 92 },
  { month: "Nov", score: 89 },
];

const violationByFrameworkData = [
  { name: "HIPAA", value: 2, color: "#ef4444" },
  { name: "GDPR", value: 2, color: "#f59e0b" },
  { name: "ISO 27001", value: 3, color: "#eab308" },
  { name: "SOC 2", value: 2, color: "#84cc16" },
];

export function GovernancePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFramework, setSelectedFramework] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState("all");

  const totalAgents = frameworks.reduce((sum, f) => sum + f.agentsInScope, 0);
  const totalCompliant = frameworks.reduce((sum, f) => sum + f.compliant, 0);
  const complianceScore = Math.round((totalCompliant / totalAgents) * 100);
  const totalViolations = violations.length;
  const openAudits = 3;

  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "border-red-500 text-red-700 bg-red-50";
      case "high":
        return "border-red-200 text-red-700 bg-red-50";
      case "medium":
        return "border-amber-200 text-amber-700 bg-amber-50";
      case "low":
        return "border-emerald-200 text-emerald-700 bg-emerald-50";
      default:
        return "border-slate-200 text-slate-600 bg-slate-50";
    }
  };

  const getStatusBadge = (compliant: number, violating: number, total: number) => {
    const complianceRate = compliant / total;
    if (complianceRate === 1) {
      return <Badge className="border-emerald-200 text-emerald-700 bg-emerald-50">Compliant</Badge>;
    } else if (violating > 0) {
      return <Badge className="border-red-200 text-red-700 bg-red-50">Violating</Badge>;
    } else {
      return <Badge className="border-amber-200 text-amber-700 bg-amber-50">At Risk</Badge>;
    }
  };

  return (
    <div className="max-w-[1800px] mx-auto px-8 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl text-slate-900 tracking-tight mb-2">
            Compliance Overview
          </h1>
          <p className="text-slate-600">
            Monitor regulatory compliance, audit trails, and risk management across all frameworks
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by agent, team, or policy ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>
          
          <Select value={selectedFramework} onValueChange={setSelectedFramework}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200">
              <SelectValue placeholder="Framework" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frameworks</SelectItem>
              <SelectItem value="hipaa">HIPAA</SelectItem>
              <SelectItem value="gdpr">GDPR</SelectItem>
              <SelectItem value="iso27001">ISO 27001</SelectItem>
              <SelectItem value="nist800207">NIST 800-207</SelectItem>
              <SelectItem value="soc2">SOC 2 Type II</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="at-risk">At Risk</SelectItem>
              <SelectItem value="violating">Violating</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="healthcare">Healthcare Ops</SelectItem>
              <SelectItem value="privacy">Data Privacy</SelectItem>
              <SelectItem value="security">Security Team</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="compliance">Compliance</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="border-slate-200">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <Badge className="border-emerald-200 text-emerald-700 bg-emerald-50">
              <TrendingUp className="w-3 h-3 mr-1" />
              +3%
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Overall Compliance Score</div>
            <div className="text-3xl text-slate-900 tracking-tight">{complianceScore}%</div>
            <Progress value={complianceScore} className="h-2" />
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <Badge className="border-red-200 text-red-700 bg-red-50">
              <TrendingDown className="w-3 h-3 mr-1" />
              -12%
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Violations Detected</div>
            <div className="text-3xl text-slate-900 tracking-tight">{totalViolations}</div>
            <div className="text-xs text-slate-600">2 critical, 3 high priority</div>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-white" />
            </div>
            <Badge className="border-blue-200 text-blue-700 bg-blue-50">
              Active
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Open Audits / Investigations</div>
            <div className="text-3xl text-slate-900 tracking-tight">{openAudits}</div>
            <div className="text-xs text-slate-600">1 requires immediate action</div>
          </div>
        </Card>

        <Card className="bg-white border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <Badge className="border-violet-200 text-violet-700 bg-violet-50">
              Recent
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-slate-500">Last Attestation</div>
            <div className="text-lg text-slate-900 tracking-tight">Nov 5, 2024</div>
            <div className="text-xs text-slate-600">NIST 800-207 validated</div>
          </div>
        </Card>
      </div>

      {/* Compliance Matrix */}
      <Card className="bg-white border-slate-200 p-8">
        <div className="mb-6">
          <h3 className="text-lg text-slate-900 tracking-tight mb-1">Compliance Matrix</h3>
          <p className="text-sm text-slate-600">Framework alignment status and audit schedule</p>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Framework</TableHead>
                <TableHead>Agents in Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Compliant / Violating</TableHead>
                <TableHead>Last Audit</TableHead>
                <TableHead>Next Attestation</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frameworks.map((framework) => (
                <TableRow key={framework.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-slate-900">{framework.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-slate-200 text-slate-700">
                      {framework.agentsInScope} agents
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(framework.compliant, framework.violating, framework.agentsInScope)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {framework.compliant}
                      </span>
                      <span className="text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {framework.violating}
                      </span>
                      {framework.unknown > 0 && (
                        <span className="text-slate-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {framework.unknown}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{framework.lastAudit}</TableCell>
                  <TableCell className="text-sm text-slate-600">{framework.nextAttestation}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getRiskColor(framework.riskLevel)}>
                      {framework.riskLevel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="text-slate-900">{framework.owner}</div>
                      <div className="text-xs text-slate-500">{framework.responsibleTeam}</div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Automated Validation & Real-Time Alerts */}
      <div className="grid grid-cols-2 gap-8">
        {/* Automated Validation */}
        <Card className="bg-white border-slate-200 p-8">
          <div className="mb-6">
            <h3 className="text-lg text-slate-900 tracking-tight mb-1">Automated Validation</h3>
            <p className="text-sm text-slate-600">Pipeline-integrated attestation reports</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-900">SOC 2 Type II</div>
                  <div className="text-xs text-slate-600">Validated 2 hours ago</div>
                </div>
              </div>
              <Badge className="border-emerald-200 text-emerald-700 bg-emerald-50">
                Validated
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-900">ISO 27001</div>
                  <div className="text-xs text-slate-600">Validated 5 hours ago</div>
                </div>
              </div>
              <Badge className="border-emerald-200 text-emerald-700 bg-emerald-50">
                Validated
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-900">NIST 800-207</div>
                  <div className="text-xs text-slate-600">In progress</div>
                </div>
              </div>
              <Badge className="border-blue-200 text-blue-700 bg-blue-50">
                Pending
              </Badge>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-sm text-slate-900">HIPAA</div>
                  <div className="text-xs text-slate-600">Failed 1 day ago</div>
                </div>
              </div>
              <Badge className="border-red-200 text-red-700 bg-red-50">
                Failed
              </Badge>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-6 border-slate-200">
            <Eye className="w-4 h-4 mr-2" />
            View All Validation Reports
          </Button>
        </Card>

        {/* Real-Time Alerts */}
        <Card className="bg-white border-slate-200 p-8">
          <div className="mb-6">
            <h3 className="text-lg text-slate-900 tracking-tight mb-1">Real-Time Alerts</h3>
            <p className="text-sm text-slate-600">Active violations and compliance risks</p>
          </div>

          <div className="space-y-3">
            {violations.slice(0, 5).map((violation) => (
              <div
                key={violation.id}
                className={`p-4 border rounded-lg ${
                  violation.severity === "critical"
                    ? "bg-red-50 border-red-200"
                    : violation.severity === "high"
                    ? "bg-orange-50 border-orange-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        violation.severity === "critical"
                          ? "text-red-600"
                          : violation.severity === "high"
                          ? "text-orange-600"
                          : "text-amber-600"
                      }`}
                    />
                    <span className="text-sm text-slate-900">{violation.category}</span>
                  </div>
                  <Badge variant="outline" className={getRiskColor(violation.severity)}>
                    {violation.severity}
                  </Badge>
                </div>
                <div className="text-xs text-slate-700 mb-2">{violation.description}</div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Agent: {violation.agent}</span>
                  <span>{violation.timestamp}</span>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full mt-6 border-slate-200">
            <AlertTriangle className="w-4 h-4 mr-2" />
            View All Violations
          </Button>
        </Card>
      </div>

      {/* Audit Trail Summary */}
      <Card className="bg-white border-slate-200 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg text-slate-900 tracking-tight mb-1">Audit Trail Summary</h3>
            <p className="text-sm text-slate-600">Recent compliance and security events</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-slate-200">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" className="border-slate-200">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Timestamp</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditTrail.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-sm text-slate-600">{event.timestamp}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                      {event.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-900">{event.description}</TableCell>
                  <TableCell className="text-sm text-slate-600">{event.user}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getRiskColor(event.impact)}>
                      {event.impact}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Analytics Panel */}
      <div className="grid grid-cols-2 gap-8">
        <Card className="bg-white border-slate-200 p-8">
          <div className="mb-6">
            <h3 className="text-lg text-slate-900 tracking-tight mb-1">Compliance Trend</h3>
            <p className="text-sm text-slate-600">Overall compliance score over time</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={complianceTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="bg-white border-slate-200 p-8">
          <div className="mb-6">
            <h3 className="text-lg text-slate-900 tracking-tight mb-1">Violations by Framework</h3>
            <p className="text-sm text-slate-600">Distribution of active compliance violations</p>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={violationByFrameworkData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {violationByFrameworkData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            {violationByFrameworkData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-600">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
