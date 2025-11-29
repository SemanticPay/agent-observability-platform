import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Database,
  FileText,
  Code,
  Cloud,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  BookOpen,
  GitBranch,
  Server,
  Mail,
  FolderOpen,
  AlertCircle,
  Settings,
  Search,
  Play,
  HardDrive,
  Terminal,
  Calendar,
  MessageSquare,
  FileImage,
  Layers,
  Zap,
  Wrench,
} from "lucide-react";

interface DataSource {
  id: string;
  name: string;
  type: string;
  icon: typeof Database;
  description: string;
  gradient: string;
  sensitive: boolean;
}

interface MCPTool {
  id: string;
  name: string;
  type: string;
  icon: typeof Database;
  description: string;
  gradient: string;
  requiresApproval: boolean;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  verified: boolean;
  riskLevel: "low" | "medium" | "high";
}

interface AccessPermission {
  agentId: string;
  dataSourceId: string;
  level: "read" | "write" | "none";
  grantedAt?: string;
  lastUsed?: string;
}

const dataSources: DataSource[] = [
  {
    id: "confluence",
    name: "Confluence Workspace",
    type: "Documentation",
    icon: BookOpen,
    description: "Company wiki and documentation",
    gradient: "from-blue-500 to-cyan-500",
    sensitive: false,
  },
  {
    id: "github",
    name: "GitHub Repositories",
    type: "Code",
    icon: GitBranch,
    description: "Source code and version control",
    gradient: "from-slate-700 to-slate-900",
    sensitive: true,
  },
  {
    id: "aws-rds",
    name: "AWS RDS Database",
    type: "Database",
    icon: Database,
    description: "Production customer database",
    gradient: "from-orange-500 to-red-500",
    sensitive: true,
  },
  {
    id: "s3-storage",
    name: "S3 Storage Buckets",
    type: "Storage",
    icon: FolderOpen,
    description: "File storage and assets",
    gradient: "from-emerald-500 to-green-500",
    sensitive: false,
  },
  {
    id: "salesforce",
    name: "Salesforce CRM",
    type: "CRM",
    icon: Cloud,
    description: "Customer and sales data",
    gradient: "from-sky-500 to-blue-500",
    sensitive: true,
  },
  {
    id: "email-server",
    name: "Email Server",
    type: "Communication",
    icon: Mail,
    description: "Corporate email and archives",
    gradient: "from-violet-500 to-purple-500",
    sensitive: true,
  },
  {
    id: "analytics-db",
    name: "Analytics Database",
    type: "Database",
    icon: Server,
    description: "Business intelligence data",
    gradient: "from-indigo-500 to-blue-600",
    sensitive: false,
  },
  {
    id: "api-gateway",
    name: "API Gateway",
    type: "API",
    icon: Code,
    description: "Internal API endpoints",
    gradient: "from-pink-500 to-rose-500",
    sensitive: true,
  },
];

const mcpTools: MCPTool[] = [
  {
    id: "web-search",
    name: "Web Search API",
    type: "Search",
    icon: Search,
    description: "Access to external search engines",
    gradient: "from-blue-500 to-indigo-500",
    requiresApproval: false,
  },
  {
    id: "code-execution",
    name: "Code Execution Environment",
    type: "Compute",
    icon: Play,
    description: "Run and test code in sandboxed environment",
    gradient: "from-purple-500 to-pink-500",
    requiresApproval: true,
  },
  {
    id: "file-system",
    name: "File System Access",
    type: "Storage",
    icon: HardDrive,
    description: "Read and write to local file systems",
    gradient: "from-orange-500 to-red-500",
    requiresApproval: true,
  },
  {
    id: "database-query",
    name: "Database Query Tool",
    type: "Database",
    icon: Database,
    description: "Execute SQL queries and database operations",
    gradient: "from-cyan-500 to-blue-600",
    requiresApproval: true,
  },
  {
    id: "email-integration",
    name: "Email Integration",
    type: "Communication",
    icon: Mail,
    description: "Send and receive emails via SMTP/IMAP",
    gradient: "from-violet-500 to-purple-600",
    requiresApproval: false,
  },
  {
    id: "calendar-api",
    name: "Calendar API",
    type: "Scheduling",
    icon: Calendar,
    description: "Manage calendar events and scheduling",
    gradient: "from-green-500 to-emerald-600",
    requiresApproval: false,
  },
  {
    id: "slack-api",
    name: "Slack Integration",
    type: "Communication",
    icon: MessageSquare,
    description: "Send messages and interact with Slack",
    gradient: "from-pink-500 to-rose-500",
    requiresApproval: false,
  },
  {
    id: "document-processing",
    name: "Document Processing",
    type: "Processing",
    icon: FileText,
    description: "Parse and analyze documents (PDF, DOCX)",
    gradient: "from-blue-600 to-cyan-500",
    requiresApproval: false,
  },
  {
    id: "image-generation",
    name: "Image Generation",
    type: "Media",
    icon: FileImage,
    description: "Generate and manipulate images",
    gradient: "from-indigo-500 to-purple-500",
    requiresApproval: false,
  },
  {
    id: "vector-database",
    name: "Vector Database",
    type: "Database",
    icon: Layers,
    description: "Store and query vector embeddings",
    gradient: "from-teal-500 to-cyan-600",
    requiresApproval: false,
  },
  {
    id: "terminal-access",
    name: "Terminal Access",
    type: "System",
    icon: Terminal,
    description: "Execute shell commands and scripts",
    gradient: "from-slate-700 to-slate-900",
    requiresApproval: true,
  },
  {
    id: "webhook-trigger",
    name: "Webhook Trigger",
    type: "Integration",
    icon: Zap,
    description: "Send HTTP requests to external APIs",
    gradient: "from-yellow-500 to-orange-500",
    requiresApproval: false,
  },
];

const agents: Agent[] = [
  { id: "AGT-001", name: "DataProcessor-01", type: "Data Processing", verified: true, riskLevel: "low" },
  { id: "AGT-002", name: "CodeReviewer-01", type: "Code Quality/QA", verified: true, riskLevel: "low" },
  { id: "AGT-003", name: "CustomerSupport-01", type: "Customer Service", verified: true, riskLevel: "low" },
  { id: "AGT-004", name: "ContentWriter-01", type: "Content Generation", verified: true, riskLevel: "medium" },
  { id: "AGT-005", name: "Researcher-01", type: "Research/Analysis", verified: true, riskLevel: "low" },
  { id: "AGT-006", name: "AdminBot-01", type: "Administrative", verified: false, riskLevel: "medium" },
  { id: "AGT-007", name: "SecurityMonitor-01", type: "Security/Compliance", verified: true, riskLevel: "low" },
  { id: "AGT-008", name: "DataMigrator-01", type: "Data Processing", verified: true, riskLevel: "high" },
];

export function AgentDataAccess() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(agents[0]);
  const [permissions, setPermissions] = useState<AccessPermission[]>([
    { agentId: "AGT-001", dataSourceId: "confluence", level: "read", grantedAt: "2 days ago", lastUsed: "1 hour ago" },
    { agentId: "AGT-001", dataSourceId: "aws-rds", level: "read", grantedAt: "5 days ago", lastUsed: "30 min ago" },
    { agentId: "AGT-001", dataSourceId: "s3-storage", level: "write", grantedAt: "1 day ago", lastUsed: "2 hours ago" },
    { agentId: "AGT-002", dataSourceId: "github", level: "write", grantedAt: "3 days ago", lastUsed: "15 min ago" },
    { agentId: "AGT-002", dataSourceId: "confluence", level: "read", grantedAt: "1 week ago", lastUsed: "5 hours ago" },
    { agentId: "AGT-003", dataSourceId: "salesforce", level: "read", grantedAt: "4 days ago", lastUsed: "20 min ago" },
    { agentId: "AGT-003", dataSourceId: "email-server", level: "write", grantedAt: "2 days ago", lastUsed: "1 hour ago" },
  ]);
  
  const [mcpPermissions, setMcpPermissions] = useState<AccessPermission[]>([
    { agentId: "AGT-001", dataSourceId: "web-search", level: "read", grantedAt: "1 week ago", lastUsed: "5 min ago" },
    { agentId: "AGT-001", dataSourceId: "document-processing", level: "write", grantedAt: "3 days ago", lastUsed: "30 min ago" },
    { agentId: "AGT-002", dataSourceId: "code-execution", level: "write", grantedAt: "2 days ago", lastUsed: "10 min ago" },
    { agentId: "AGT-002", dataSourceId: "web-search", level: "read", grantedAt: "1 week ago", lastUsed: "1 hour ago" },
    { agentId: "AGT-002", dataSourceId: "slack-api", level: "write", grantedAt: "4 days ago", lastUsed: "20 min ago" },
    { agentId: "AGT-003", dataSourceId: "email-integration", level: "write", grantedAt: "3 days ago", lastUsed: "15 min ago" },
    { agentId: "AGT-003", dataSourceId: "calendar-api", level: "write", grantedAt: "1 day ago", lastUsed: "45 min ago" },
    { agentId: "AGT-004", dataSourceId: "image-generation", level: "write", grantedAt: "2 days ago", lastUsed: "1 hour ago" },
    { agentId: "AGT-005", dataSourceId: "web-search", level: "read", grantedAt: "5 days ago", lastUsed: "25 min ago" },
    { agentId: "AGT-005", dataSourceId: "vector-database", level: "write", grantedAt: "1 week ago", lastUsed: "40 min ago" },
  ]);

  const getAgentPermission = (agentId: string, dataSourceId: string, isMCP: boolean = false): AccessPermission | undefined => {
    const permList = isMCP ? mcpPermissions : permissions;
    return permList.find((p) => p.agentId === agentId && p.dataSourceId === dataSourceId);
  };

  const grantAccess = (agentId: string, dataSourceId: string, level: "read" | "write", isMCP: boolean = false) => {
    const permList = isMCP ? mcpPermissions : permissions;
    const setPermList = isMCP ? setMcpPermissions : setPermissions;
    const existing = permList.find((p) => p.agentId === agentId && p.dataSourceId === dataSourceId);
    
    if (existing) {
      setPermList((prev) =>
        prev.map((p) =>
          p.agentId === agentId && p.dataSourceId === dataSourceId
            ? { ...p, level, grantedAt: "Just now" }
            : p
        )
      );
    } else {
      setPermList((prev) => [
        ...prev,
        { agentId, dataSourceId, level, grantedAt: "Just now", lastUsed: "Not used yet" },
      ]);
    }
  };

  const revokeAccess = (agentId: string, dataSourceId: string, isMCP: boolean = false) => {
    const setPermList = isMCP ? setMcpPermissions : setPermissions;
    setPermList((prev) =>
      prev.filter((p) => !(p.agentId === agentId && p.dataSourceId === dataSourceId))
    );
  };

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

  const agentPermissions = selectedAgent
    ? permissions.filter((p) => p.agentId === selectedAgent.id)
    : [];
  
  const agentMcpPermissions = selectedAgent
    ? mcpPermissions.filter((p) => p.agentId === selectedAgent.id)
    : [];

  const renderAccessGrid = (items: (DataSource | MCPTool)[], isMCP: boolean = false) => {
    if (!selectedAgent) return null;

    return (
      <div className="grid grid-cols-1 gap-4 mb-6">
        {items.map((item, index) => {
          const Icon = item.icon;
          const permission = getAgentPermission(selectedAgent.id, item.id, isMCP);
          const hasAccess = permission !== undefined;
          const accessLevel = permission?.level || "none";
          const sensitive = 'sensitive' in item ? item.sensitive : false;
          const requiresApproval = 'requiresApproval' in item ? item.requiresApproval : false;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-5"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm text-slate-900">{item.name}</h4>
                        {sensitive && (
                          <Lock className="w-3 h-3 text-amber-600" />
                        )}
                        {requiresApproval && (
                          <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                            Approval Required
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                    </div>
                    {hasAccess && (
                      <Badge
                        variant="outline"
                        className={`text-xs ml-2 ${
                          accessLevel === "write"
                            ? "border-blue-200 text-blue-700 bg-blue-50"
                            : "border-emerald-200 text-emerald-700 bg-emerald-50"
                        }`}
                      >
                        {accessLevel === "write" ? (isMCP ? "Full Access" : "Read/Write") : (isMCP ? "Limited Access" : "Read Only")}
                      </Badge>
                    )}
                  </div>

                  {/* Access Details */}
                  {hasAccess && permission && (
                    <div className="grid grid-cols-2 gap-4 mb-3 pb-3 border-b border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-500">Granted: </span>
                        <span className="text-slate-700">{permission.grantedAt}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Last used: </span>
                        <span className="text-slate-700">{permission.lastUsed}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {!hasAccess ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => grantAccess(selectedAgent.id, item.id, "read", isMCP)}
                        >
                          <Unlock className="w-3 h-3 mr-2" />
                          {isMCP ? "Grant Limited" : "Grant Read"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => grantAccess(selectedAgent.id, item.id, "write", isMCP)}
                        >
                          <Key className="w-3 h-3 mr-2" />
                          {isMCP ? "Grant Full" : "Grant Write"}
                        </Button>
                      </>
                    ) : (
                      <>
                        {accessLevel === "read" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                            onClick={() => grantAccess(selectedAgent.id, item.id, "write", isMCP)}
                          >
                            {isMCP ? "Upgrade to Full" : "Upgrade to Write"}
                          </Button>
                        )}
                        {accessLevel === "write" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                            onClick={() => grantAccess(selectedAgent.id, item.id, "read", isMCP)}
                          >
                            {isMCP ? "Downgrade to Limited" : "Downgrade to Read"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs border-red-200 text-red-700 hover:bg-red-50"
                          onClick={() => revokeAccess(selectedAgent.id, item.id, isMCP)}
                        >
                          <XCircle className="w-3 h-3 mr-2" />
                          Revoke Access
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-8">
      {/* Agent List */}
      <Card className="bg-white border-slate-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg text-slate-900 tracking-tight">Agent Directory</h3>
          <p className="text-sm text-slate-600 mt-1">Select agent to manage access</p>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="space-y-2 pr-4">
            {agents.map((agent) => {
              const agentPerms = permissions.filter((p) => p.agentId === agent.id);
              const agentMcpPerms = mcpPermissions.filter((p) => p.agentId === agent.id);
              const totalPerms = agentPerms.length + agentMcpPerms.length;
              
              return (
                <motion.div
                  key={agent.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedAgent(agent)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedAgent?.id === agent.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-slate-900">{agent.name}</span>
                    {agent.verified ? (
                      <Shield className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500">{agent.type}</span>
                    <Badge variant="outline" className={`text-xs ${getRiskColor(agent.riskLevel)}`}>
                      {agent.riskLevel}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{totalPerms} total permissions</span>
                    <span className="text-blue-600">{agent.id}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Access Management Grid with Tabs */}
      <Card className="col-span-2 bg-white border-slate-200 p-8">
        {selectedAgent ? (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg text-slate-900 tracking-tight">Access Management</h3>
                <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                  {selectedAgent.name}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                Manage data sources and MCP tool permissions for {selectedAgent.name}
              </p>
            </div>

            <Tabs defaultValue="data-sources" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="data-sources" className="gap-2">
                  <Database className="w-4 h-4" />
                  Data Sources
                  <Badge variant="outline" className="ml-1 text-xs">
                    {agentPermissions.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="mcp-tools" className="gap-2">
                  <Wrench className="w-4 h-4" />
                  MCP Tools
                  <Badge variant="outline" className="ml-1 text-xs">
                    {agentMcpPermissions.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="data-sources">
                {renderAccessGrid(dataSources, false)}
                
                {/* Summary Stats */}
                <div className="pt-6 border-t border-slate-200">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Total Access</div>
                      <div className="text-slate-900">{agentPermissions.length} / {dataSources.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Read Only</div>
                      <div className="text-emerald-600">
                        {agentPermissions.filter((p) => p.level === "read").length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Read/Write</div>
                      <div className="text-blue-600">
                        {agentPermissions.filter((p) => p.level === "write").length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Sensitive Data</div>
                      <div className="text-amber-600">
                        {
                          agentPermissions.filter((p) =>
                            dataSources.find((ds) => ds.id === p.dataSourceId)?.sensitive
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="mcp-tools">
                {renderAccessGrid(mcpTools, true)}
                
                {/* Summary Stats */}
                <div className="pt-6 border-t border-slate-200">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Total Access</div>
                      <div className="text-slate-900">{agentMcpPermissions.length} / {mcpTools.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Limited Access</div>
                      <div className="text-emerald-600">
                        {agentMcpPermissions.filter((p) => p.level === "read").length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Full Access</div>
                      <div className="text-blue-600">
                        {agentMcpPermissions.filter((p) => p.level === "write").length}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Requires Approval</div>
                      <div className="text-purple-600">
                        {
                          agentMcpPermissions.filter((p) =>
                            mcpTools.find((tool) => tool.id === p.dataSourceId)?.requiresApproval
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <Settings className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Select an agent to manage access</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
