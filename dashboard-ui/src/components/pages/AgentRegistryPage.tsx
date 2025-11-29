import { useState } from "react";
import { 
  Search, 
  Filter,
  ShieldAlert,
  Snowflake,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Leaf
} from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface Agent {
  id: string;
  name: string;
  owner: string;
  team: string;
  platform: string;
  modelType: string;
  accessScope: string[];
  toolsUsed: string[];
  policyStatus: "Compliant" | "Warning" | "Violation";
  successRate: number;
  avgLatency: number;
  costPerWorkflow: number;
  co2Impact: number;
  lastActive: string;
  status: "Active" | "Inactive" | "At Risk";
}

const mockAgents: Agent[] = [
  {
    id: "AGT-3421",
    name: "Customer Query Analyzer",
    owner: "Sarah Chen",
    team: "Customer Success",
    platform: "Vertex AI",
    modelType: "Gemini Pro",
    accessScope: ["Zendesk", "Salesforce CRM", "Customer DB"],
    toolsUsed: ["Slack", "Zendesk", "Salesforce"],
    policyStatus: "Compliant",
    successRate: 98.5,
    avgLatency: 245,
    costPerWorkflow: 0.24,
    co2Impact: 12.4,
    lastActive: "2 min ago",
    status: "Active"
  },
  {
    id: "AGT-8901",
    name: "Code Review Assistant",
    owner: "Marcus Liu",
    team: "Engineering",
    platform: "LangChain",
    modelType: "GPT-4",
    accessScope: ["GitHub", "Jira", "AWS CodeCommit"],
    toolsUsed: ["GitHub", "Slack", "Datadog"],
    policyStatus: "Compliant",
    successRate: 96.2,
    avgLatency: 512,
    costPerWorkflow: 0.89,
    co2Impact: 23.1,
    lastActive: "5 min ago",
    status: "Active"
  },
  {
    id: "AGT-5567",
    name: "Financial Data Processor",
    owner: "Aisha Patel",
    team: "Finance",
    platform: "Agentforce",
    modelType: "Claude Sonnet",
    accessScope: ["AWS RDS", "QuickBooks", "Stripe API"],
    toolsUsed: ["Slack", "QuickBooks", "Excel"],
    policyStatus: "Warning",
    successRate: 94.1,
    avgLatency: 1240,
    costPerWorkflow: 1.45,
    co2Impact: 18.7,
    lastActive: "12 min ago",
    status: "Active"
  },
  {
    id: "AGT-2209",
    name: "Content Generator Pro",
    owner: "Emma Rodriguez",
    team: "Marketing",
    platform: "Skyfire",
    modelType: "GPT-4o",
    accessScope: ["Confluence", "Google Drive", "WordPress"],
    toolsUsed: ["Notion", "WordPress", "Canva"],
    policyStatus: "Compliant",
    successRate: 99.1,
    avgLatency: 180,
    costPerWorkflow: 0.32,
    co2Impact: 8.9,
    lastActive: "8 min ago",
    status: "Active"
  },
  {
    id: "AGT-7734",
    name: "Security Compliance Monitor",
    owner: "David Kim",
    team: "Security",
    platform: "Vertex AI",
    modelType: "PaLM 2",
    accessScope: ["AWS IAM", "Azure AD", "Okta", "GitHub"],
    toolsUsed: ["Datadog", "Splunk", "PagerDuty"],
    policyStatus: "Violation",
    successRate: 87.3,
    avgLatency: 890,
    costPerWorkflow: 2.10,
    co2Impact: 34.2,
    lastActive: "45 min ago",
    status: "At Risk"
  },
  {
    id: "AGT-9102",
    name: "Research Synthesis Bot",
    owner: "Lisa Wang",
    team: "Research",
    platform: "LangChain",
    modelType: "Claude Opus",
    accessScope: ["Confluence", "PubMed API", "Arxiv API"],
    toolsUsed: ["Notion", "Zotero", "Slack"],
    policyStatus: "Compliant",
    successRate: 97.8,
    avgLatency: 650,
    costPerWorkflow: 1.12,
    co2Impact: 15.6,
    lastActive: "1 hour ago",
    status: "Active"
  },
  {
    id: "AGT-4456",
    name: "HR Onboarding Assistant",
    owner: "James Park",
    team: "People Ops",
    platform: "Agentforce",
    modelType: "GPT-3.5",
    accessScope: ["BambooHR", "Google Workspace", "Slack"],
    toolsUsed: ["BambooHR", "Slack", "DocuSign"],
    policyStatus: "Compliant",
    successRate: 95.6,
    avgLatency: 320,
    costPerWorkflow: 0.18,
    co2Impact: 6.2,
    lastActive: "20 min ago",
    status: "Active"
  },
  {
    id: "AGT-6623",
    name: "Data Pipeline Orchestrator",
    owner: "Priya Singh",
    team: "Data Engineering",
    platform: "Vertex AI",
    modelType: "Gemini Ultra",
    accessScope: ["AWS RDS", "Snowflake", "BigQuery"],
    toolsUsed: ["Datadog", "Airflow", "dbt"],
    policyStatus: "Warning",
    successRate: 92.4,
    avgLatency: 1850,
    costPerWorkflow: 3.24,
    co2Impact: 41.5,
    lastActive: "15 min ago",
    status: "Active"
  },
  {
    id: "AGT-1198",
    name: "Support Ticket Classifier",
    owner: "Tom Anderson",
    team: "Support",
    platform: "Skyfire",
    modelType: "GPT-4",
    accessScope: ["Zendesk", "Intercom", "Jira"],
    toolsUsed: ["Zendesk", "Slack", "Intercom"],
    policyStatus: "Violation",
    successRate: 89.7,
    avgLatency: 410,
    costPerWorkflow: 0.56,
    co2Impact: 19.8,
    lastActive: "2 hours ago",
    status: "At Risk"
  },
  {
    id: "AGT-3387",
    name: "Invoice Processing Agent",
    owner: "Maria Gonzalez",
    team: "Finance",
    platform: "LangChain",
    modelType: "Claude Haiku",
    accessScope: ["QuickBooks", "AWS S3", "Email"],
    toolsUsed: ["QuickBooks", "Slack"],
    policyStatus: "Compliant",
    successRate: 98.9,
    avgLatency: 280,
    costPerWorkflow: 0.21,
    co2Impact: 7.3,
    lastActive: "10 min ago",
    status: "Active"
  },
  {
    id: "AGT-7891",
    name: "Sales Lead Enrichment",
    owner: "Chris Miller",
    team: "Sales",
    platform: "Agentforce",
    modelType: "GPT-4o",
    accessScope: ["Salesforce", "LinkedIn API", "Clearbit"],
    toolsUsed: ["Salesforce", "LinkedIn", "HubSpot"],
    policyStatus: "Compliant",
    successRate: 96.8,
    avgLatency: 520,
    costPerWorkflow: 0.78,
    co2Impact: 11.2,
    lastActive: "30 min ago",
    status: "Inactive"
  },
  {
    id: "AGT-5214",
    name: "Incident Response Bot",
    owner: "Alex Johnson",
    team: "DevOps",
    platform: "Vertex AI",
    modelType: "Gemini Pro",
    accessScope: ["PagerDuty", "Datadog", "AWS CloudWatch"],
    toolsUsed: ["PagerDuty", "Slack", "Datadog"],
    policyStatus: "Warning",
    successRate: 93.2,
    avgLatency: 890,
    costPerWorkflow: 1.67,
    co2Impact: 28.4,
    lastActive: "3 hours ago",
    status: "At Risk"
  }
];

export function AgentRegistryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

  const filteredAgents = mockAgents.filter(agent => {
    const matchesSearch = searchQuery === "" || 
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.platform.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || agent.status === statusFilter;
    const matchesPlatform = platformFilter === "all" || agent.platform === platformFilter;
    const matchesCompliance = complianceFilter === "all" || agent.policyStatus === complianceFilter;
    const matchesTeam = teamFilter === "all" || agent.team === teamFilter;
    
    return matchesSearch && matchesStatus && matchesPlatform && matchesCompliance && matchesTeam;
  });

  const totalAgents = mockAgents.length;
  const activeAgents = mockAgents.filter(a => a.status === "Active").length;
  const avgCostPerWorkflow = mockAgents.reduce((sum, a) => sum + a.costPerWorkflow, 0) / mockAgents.length;
  const complianceScore = (mockAgents.filter(a => a.policyStatus === "Compliant").length / mockAgents.length) * 100;
  const totalCO2 = mockAgents.reduce((sum, a) => sum + a.co2Impact, 0);
  const violationCount = mockAgents.filter(a => a.policyStatus === "Violation").length;
  const newAgentCount = 1; // Mock data

  const getPolicyStatusIcon = (status: string) => {
    switch (status) {
      case "Compliant":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "Warning":
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case "Violation":
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getPolicyStatusBadge = (status: string) => {
    switch (status) {
      case "Compliant":
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">{status}</Badge>;
      case "Warning":
        return <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200">{status}</Badge>;
      case "Violation":
        return <Badge className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200">{status}</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">{status}</Badge>;
      case "Inactive":
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300">{status}</Badge>;
      case "At Risk":
        return <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200">{status}</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-[1800px] mx-auto px-8 py-8 space-y-6">
      {/* Top KPI Summary Bar */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-slate-500 text-sm mb-1">Total Agents</div>
              <div className="text-3xl">{totalAgents}</div>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg">
              <Filter className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-slate-500 text-sm mb-1">Active Agents</div>
              <div className="text-3xl text-blue-600">{activeAgents}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                <TrendingUp className="w-3 h-3" />
                <span>+12% this week</span>
              </div>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-slate-500 text-sm mb-1">Avg Cost / Workflow</div>
              <div className="text-3xl">${avgCostPerWorkflow.toFixed(2)}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                <TrendingDown className="w-3 h-3" />
                <span>-8% vs last month</span>
              </div>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingDown className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-slate-500 text-sm mb-1">Compliance Score</div>
              <div className="text-3xl">{complianceScore.toFixed(1)}%</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                <span>{mockAgents.filter(a => a.policyStatus === "Compliant").length}/{totalAgents} compliant</span>
              </div>
            </div>
            <div className="p-2 bg-violet-50 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-slate-500 text-sm mb-1">Total CO₂ Impact</div>
              <div className="text-3xl">{totalCO2.toFixed(1)} kg</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                <span>Last 30 days</span>
              </div>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <Leaf className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search agents by name, owner, or platform"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Filters:</span>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
            </SelectContent>
          </Select>

          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="LangChain">LangChain</SelectItem>
              <SelectItem value="Vertex AI">Vertex AI</SelectItem>
              <SelectItem value="Agentforce">Agentforce</SelectItem>
              <SelectItem value="Skyfire">Skyfire</SelectItem>
            </SelectContent>
          </Select>

          <Select value={complianceFilter} onValueChange={setComplianceFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Compliance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Compliance</SelectItem>
              <SelectItem value="Compliant">Compliant</SelectItem>
              <SelectItem value="Warning">Warning</SelectItem>
              <SelectItem value="Violation">Violating</SelectItem>
            </SelectContent>
          </Select>

          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="Customer Success">Customer Success</SelectItem>
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Security">Security</SelectItem>
              <SelectItem value="Research">Research</SelectItem>
              <SelectItem value="People Ops">People Ops</SelectItem>
              <SelectItem value="Data Engineering">Data Engineering</SelectItem>
              <SelectItem value="Support">Support</SelectItem>
              <SelectItem value="Sales">Sales</SelectItem>
              <SelectItem value="DevOps">DevOps</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Policy
            </Button>
            <Button variant="outline" className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
              <Snowflake className="w-4 h-4" />
              Freeze Agent
            </Button>
          </div>
        </div>

        <div className="mt-3 text-sm text-slate-500">
          Showing {filteredAgents.length} of {totalAgents} agents
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[180px]">Agent Name / ID</TableHead>
                <TableHead className="w-[150px]">Owner / Team</TableHead>
                <TableHead className="w-[150px]">Platform / Model</TableHead>
                <TableHead className="w-[200px]">Access Scope</TableHead>
                <TableHead className="w-[180px]">Tools Used</TableHead>
                <TableHead className="w-[140px]">Policy Status</TableHead>
                <TableHead className="w-[140px]">Performance</TableHead>
                <TableHead className="w-[120px]">Cost / Workflow</TableHead>
                <TableHead className="w-[100px]">CO₂ Impact</TableHead>
                <TableHead className="w-[120px]">Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.map((agent) => (
                <TableRow key={agent.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div>
                      <div className="text-slate-900">{agent.name}</div>
                      <div className="text-sm text-slate-500">{agent.id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-slate-900">{agent.owner}</div>
                      <div className="text-sm text-slate-500">{agent.team}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-slate-900">{agent.platform}</div>
                      <div className="text-sm text-slate-500">{agent.modelType}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {agent.accessScope.slice(0, 2).map((scope, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                      {agent.accessScope.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{agent.accessScope.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {agent.toolsUsed.slice(0, 2).map((tool, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-slate-50">
                          {tool}
                        </Badge>
                      ))}
                      {agent.toolsUsed.length > 2 && (
                        <Badge variant="outline" className="text-xs bg-slate-50">
                          +{agent.toolsUsed.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getPolicyStatusIcon(agent.policyStatus)}
                      {getPolicyStatusBadge(agent.policyStatus)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-slate-900">{agent.successRate}%</div>
                      <div className="text-sm text-slate-500">{agent.avgLatency}ms avg</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-900">${agent.costPerWorkflow.toFixed(2)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-900">{agent.co2Impact} kg</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-500">{agent.lastActive}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Live System Notifications */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-amber-900">
              <span className="font-medium">{violationCount} agents flagged for policy violations</span>
              <span className="mx-2">•</span>
              <span>{newAgentCount} new agent detected</span>
              <span className="mx-2">•</span>
              <span className="text-amber-700">Last updated 30 seconds ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
