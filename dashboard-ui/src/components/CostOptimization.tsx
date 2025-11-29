import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Lightbulb, TrendingDown, Users, RefreshCw, DollarSign, Zap, Database, Code, Headphones } from "lucide-react";

interface Recommendation {
  title: string;
  description: string;
  savings: string;
  impact: "high" | "medium" | "low";
  category: string;
  agentType?: string;
  icon: typeof Lightbulb;
}

const recommendations: Recommendation[] = [
  {
    title: "Consolidate Data Processing Agents",
    description: "22 data processing agents on Vertex AI monthly plans show <35% utilization. Migrate to Skyfire per-task pricing to eliminate idle time costs.",
    savings: "$3,240/mo",
    impact: "high",
    category: "Agent Type Optimization",
    agentType: "Data Processing",
    icon: Database,
  },
  {
    title: "Reduce Customer Service Agent Redundancy",
    description: "Analysis shows 18 customer service agents performing overlapping email classification tasks. Consolidate to 12 high-performing agents.",
    savings: "$2,350/mo",
    impact: "high",
    category: "Workforce Optimization",
    agentType: "Customer Service",
    icon: Headphones,
  },
  {
    title: "Optimize Code QA Agent Deployment",
    description: "Code quality agents peak at 95% utilization 9-5pm but idle overnight. Implement dynamic scaling to reduce after-hours costs.",
    savings: "$1,890/mo",
    impact: "high",
    category: "Utilization",
    agentType: "Code Quality/QA",
    icon: Code,
  },
  {
    title: "Switch Content Generation to Usage-Based",
    description: "Content generation workload is highly variable (20-80% daily). Moving from monthly to Agentforce usage-based pricing saves on low-volume days.",
    savings: "$1,625/mo",
    impact: "medium",
    category: "Pricing Model",
    agentType: "Content Generation",
    icon: DollarSign,
  },
  {
    title: "Negotiate Enterprise Tier for Research Agents",
    description: "31 research/analysis agents qualify for LangChain enterprise tier (25+ agents), unlocking 22% volume discount.",
    savings: "$1,450/mo",
    impact: "medium",
    category: "Contract Optimization",
    agentType: "Research/Analysis",
    icon: TrendingDown,
  },
  {
    title: "Retire Low-Performance Administrative Agents",
    description: "8 administrative agents have <18% task success rate over 30 days. Replace with higher-performing alternatives or consolidate tasks.",
    savings: "$980/mo",
    impact: "medium",
    category: "Performance",
    agentType: "Administrative",
    icon: Zap,
  },
  {
    title: "Cross-Train Multi-Purpose Agents",
    description: "Deploy 5 hybrid agents capable of both data processing and research tasks to handle workload spikes without hiring additional specialized agents.",
    savings: "$1,540/mo",
    impact: "medium",
    category: "Workforce Optimization",
    agentType: "Multi-Purpose",
    icon: Users,
  },
  {
    title: "Implement Agent Task Caching",
    description: "Security/compliance agents repeat similar audit queries. Implementing 24-hour response caching reduces per-token costs by 31%.",
    savings: "$720/mo",
    impact: "low",
    category: "Usage Efficiency",
    agentType: "Security/Compliance",
    icon: RefreshCw,
  },
];

export function CostOptimization() {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "border-emerald-200 text-emerald-700 bg-emerald-50";
      case "medium":
        return "border-blue-200 text-blue-700 bg-blue-50";
      case "low":
        return "border-slate-200 text-slate-700 bg-slate-50";
      default:
        return "border-slate-200 text-slate-700";
    }
  };

  const getAgentTypeColor = (agentType?: string) => {
    switch (agentType) {
      case "Data Processing":
        return "border-blue-200 text-blue-600 bg-blue-50";
      case "Code Quality/QA":
        return "border-purple-200 text-purple-600 bg-purple-50";
      case "Customer Service":
        return "border-emerald-200 text-emerald-600 bg-emerald-50";
      case "Content Generation":
        return "border-amber-200 text-amber-600 bg-amber-50";
      case "Research/Analysis":
        return "border-red-200 text-red-600 bg-red-50";
      case "Administrative":
        return "border-cyan-200 text-cyan-600 bg-cyan-50";
      case "Security/Compliance":
        return "border-pink-200 text-pink-600 bg-pink-50";
      default:
        return "border-indigo-200 text-indigo-600 bg-indigo-50";
    }
  };

  const totalSavings = recommendations.reduce((sum, rec) => {
    const value = parseFloat(rec.savings.replace(/[$,\/mo]/g, ""));
    return sum + value;
  }, 0);

  return (
    <Card className="bg-white border-slate-200 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg text-slate-900 tracking-tight">Agent Workforce Optimization</h3>
          <p className="text-sm text-slate-600 mt-1">AI-driven recommendations to reduce agent hiring costs</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Potential Savings</div>
          <div className="text-2xl text-emerald-600 tracking-tight">${(totalSavings / 1000).toFixed(1)}k/mo</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {recommendations.map((rec, index) => {
          const Icon = rec.icon;
          
          return (
            <motion.div
              key={rec.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm text-slate-900">{rec.title}</h4>
                    <Badge variant="outline" className={`text-xs ${getImpactColor(rec.impact)}`}>
                      {rec.impact}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">{rec.description}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                        {rec.category}
                      </span>
                      {rec.agentType && (
                        <Badge variant="outline" className={`text-xs ${getAgentTypeColor(rec.agentType)}`}>
                          {rec.agentType}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-emerald-600">{rec.savings}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-200">
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">High impact actions</span>
            <span className="text-slate-900">{recommendations.filter(r => r.impact === "high").length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Avg savings per action</span>
            <span className="text-slate-900">${(totalSavings / recommendations.length / 1000).toFixed(1)}k</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Implementation timeline</span>
            <span className="text-slate-900">2-4 weeks</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
