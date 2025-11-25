import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { 
  Plug, 
  Plus, 
  Check, 
  X, 
  Settings, 
  Key,
  Users,
  DollarSign,
  ChevronRight,
  AlertCircle
} from "lucide-react";

interface Platform {
  id: string;
  name: string;
  description: string;
  logo: string;
  status: "connected" | "disconnected" | "error";
  agentCount?: number;
  pricingModel: string;
  apiKeyRequired: boolean;
  gradient: string;
  category: string;
}

const availablePlatforms: Platform[] = [
  {
    id: "agentforce",
    name: "Salesforce Agentforce",
    description: "Enterprise AI agents for CRM automation and customer service",
    logo: "🔵",
    status: "connected",
    agentCount: 68,
    pricingModel: "Usage-based",
    apiKeyRequired: true,
    gradient: "from-blue-500 to-cyan-500",
    category: "Enterprise",
  },
  {
    id: "langchain",
    name: "LangChain",
    description: "Build custom AI agents with advanced orchestration capabilities",
    logo: "🦜",
    status: "connected",
    agentCount: 42,
    pricingModel: "Per-token",
    apiKeyRequired: true,
    gradient: "from-emerald-500 to-green-500",
    category: "Developer",
  },
  {
    id: "claude",
    name: "Claude (Anthropic)",
    description: "Advanced AI agents with superior reasoning and safety features",
    logo: "🟠",
    status: "connected",
    agentCount: 35,
    pricingModel: "API Credits",
    apiKeyRequired: true,
    gradient: "from-orange-500 to-amber-500",
    category: "AI Provider",
  },
  {
    id: "openai",
    name: "OpenAI Assistants",
    description: "GPT-powered agents with code interpreter and retrieval",
    logo: "⚫",
    status: "connected",
    agentCount: 52,
    pricingModel: "Per-token",
    apiKeyRequired: true,
    gradient: "from-slate-600 to-slate-800",
    category: "AI Provider",
  },
  {
    id: "vertex",
    name: "Google Vertex AI",
    description: "Enterprise AI platform with custom agent deployment",
    logo: "🔴",
    status: "connected",
    agentCount: 82,
    pricingModel: "Monthly subscription",
    apiKeyRequired: true,
    gradient: "from-red-500 to-pink-500",
    category: "Enterprise",
  },
  {
    id: "skyfire",
    name: "Skyfire",
    description: "Pay-per-task agent marketplace with specialized workflows",
    logo: "🔥",
    status: "connected",
    agentCount: 95,
    pricingModel: "Per-task",
    apiKeyRequired: true,
    gradient: "from-violet-500 to-purple-500",
    category: "Marketplace",
  },
  {
    id: "crewai",
    name: "CrewAI",
    description: "Collaborative multi-agent systems for complex workflows",
    logo: "👥",
    status: "connected",
    agentCount: 23,
    pricingModel: "Monthly subscription",
    apiKeyRequired: true,
    gradient: "from-indigo-500 to-blue-500",
    category: "Developer",
  },
  {
    id: "autogen",
    name: "Microsoft AutoGen",
    description: "Multi-agent conversation framework for task automation",
    logo: "🟦",
    status: "disconnected",
    pricingModel: "Open Source + API costs",
    apiKeyRequired: true,
    gradient: "from-blue-600 to-cyan-600",
    category: "Developer",
  },
  {
    id: "azure-agents",
    name: "Azure AI Agents",
    description: "Microsoft's enterprise agent platform with Azure integration",
    logo: "☁️",
    status: "disconnected",
    pricingModel: "Consumption-based",
    apiKeyRequired: true,
    gradient: "from-sky-500 to-blue-600",
    category: "Enterprise",
  },
  {
    id: "aws-bedrock",
    name: "AWS Bedrock Agents",
    description: "Managed agents with foundation model orchestration",
    logo: "🟧",
    status: "disconnected",
    pricingModel: "Pay-as-you-go",
    apiKeyRequired: true,
    gradient: "from-orange-600 to-yellow-600",
    category: "Enterprise",
  },
];

export function PlatformIntegrations() {
  const [platforms, setPlatforms] = useState<Platform[]>(availablePlatforms);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = ["all", "Enterprise", "AI Provider", "Developer", "Marketplace"];

  const handleConnect = (platform: Platform) => {
    setSelectedPlatform(platform);
    setShowConnectModal(true);
  };

  const handleDisconnect = (platformId: string) => {
    setPlatforms((prev) =>
      prev.map((p) =>
        p.id === platformId ? { ...p, status: "disconnected", agentCount: undefined } : p
      )
    );
  };

  const handleSaveConnection = () => {
    if (selectedPlatform && apiKey.length > 0) {
      setPlatforms((prev) =>
        prev.map((p) =>
          p.id === selectedPlatform.id
            ? { ...p, status: "connected", agentCount: Math.floor(Math.random() * 50) + 10 }
            : p
        )
      );
      setShowConnectModal(false);
      setApiKey("");
      setSelectedPlatform(null);
    }
  };

  const connectedPlatforms = platforms.filter((p) => p.status === "connected");
  const totalAgents = connectedPlatforms.reduce((sum, p) => sum + (p.agentCount || 0), 0);

  const filteredPlatforms =
    filterCategory === "all"
      ? platforms
      : platforms.filter((p) => p.category === filterCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "border-emerald-200 text-emerald-700 bg-emerald-50";
      case "error":
        return "border-red-200 text-red-700 bg-red-50";
      default:
        return "border-slate-200 text-slate-600 bg-slate-50";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="bg-white border-slate-200 p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Connected Platforms</div>
          <div className="text-3xl text-slate-900 tracking-tight">{connectedPlatforms.length}</div>
          <div className="text-sm text-slate-600 mt-1">of {platforms.length} available</div>
        </Card>
        <Card className="bg-white border-slate-200 p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Total Agents</div>
          <div className="text-3xl text-blue-600 tracking-tight">{totalAgents}</div>
          <div className="text-sm text-slate-600 mt-1">Across all platforms</div>
        </Card>
        <Card className="bg-white border-slate-200 p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Active Integrations</div>
          <div className="text-3xl text-emerald-600 tracking-tight">{connectedPlatforms.length}</div>
          <div className="text-sm text-slate-600 mt-1">Real-time sync</div>
        </Card>
        <Card className="bg-white border-slate-200 p-6">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-2">Avg Cost/Platform</div>
          <div className="text-3xl text-slate-900 tracking-tight">
            ${(18247 / connectedPlatforms.length / 1000).toFixed(1)}k
          </div>
          <div className="text-sm text-slate-600 mt-1">Monthly spend</div>
        </Card>
      </div>

      {/* Main Content */}
      <Card className="bg-white border-slate-200 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl text-slate-900 tracking-tight">Agent Platform Integrations</h2>
            <p className="text-sm text-slate-600 mt-1">Connect and manage your AI agent workforce sources</p>
          </div>
          
          {/* Category Filter */}
          <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                  filterCategory === category
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {category === "all" ? "All Platforms" : category}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPlatforms.map((platform, index) => (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-md transition-all"
            >
              {/* Platform Header */}
              <div className="flex items-start gap-4 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-2xl shadow-sm`}
                >
                  {platform.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm text-slate-900">{platform.name}</h3>
                    <Badge variant="outline" className={`text-xs ${getStatusColor(platform.status)}`}>
                      {platform.status === "connected" && <Check className="w-3 h-3 mr-1" />}
                      {platform.status === "error" && <AlertCircle className="w-3 h-3 mr-1" />}
                      {platform.status === "connected" ? "Connected" : "Not Connected"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{platform.description}</p>
                </div>
              </div>

              {/* Platform Stats */}
              {platform.status === "connected" && (
                <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="text-xs text-slate-500">Agents</div>
                      <div className="text-sm text-slate-900">{platform.agentCount}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="text-xs text-slate-500">Pricing</div>
                      <div className="text-sm text-slate-900">{platform.pricingModel}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {platform.status === "connected" ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleConnect(platform)}
                    >
                      <Settings className="w-3 h-3 mr-2" />
                      Configure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDisconnect(platform.id)}
                    >
                      <X className="w-3 h-3 mr-2" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={() => handleConnect(platform)}
                  >
                    <Plus className="w-3 h-3 mr-2" />
                    Connect Platform
                  </Button>
                )}
              </div>

              {/* Category Badge */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                  {platform.category}
                </Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Connection Modal */}
      <AnimatePresence>
        {showConnectModal && selectedPlatform && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowConnectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4 mb-6">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${selectedPlatform.gradient} flex items-center justify-center text-3xl shadow-sm`}
                >
                  {selectedPlatform.logo}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg text-slate-900 mb-1">{selectedPlatform.name}</h3>
                  <p className="text-sm text-slate-600">{selectedPlatform.description}</p>
                </div>
              </div>

              {selectedPlatform.apiKeyRequired && (
                <div className="mb-6">
                  <label className="block text-sm text-slate-700 mb-2">
                    <Key className="w-4 h-4 inline mr-2" />
                    API Key / Access Token
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter your API key..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Your credentials are encrypted and stored securely
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-900">
                    <div className="mb-1">Pricing: {selectedPlatform.pricingModel}</div>
                    <div>Make sure you have billing enabled on your {selectedPlatform.name} account.</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowConnectModal(false);
                    setApiKey("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  onClick={handleSaveConnection}
                  disabled={selectedPlatform.apiKeyRequired && apiKey.length === 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  {selectedPlatform.status === "connected" ? "Update" : "Connect"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
