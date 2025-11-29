import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { 
  Activity, 
  Users, 
  TrendingUp, 
  Zap,
  ShoppingCart,
  Settings,
  BarChart3,
  Headphones
} from "lucide-react";

interface ClusterData {
  name: string;
  icon: typeof ShoppingCart;
  gradient: string;
  activeAgents: number;
  totalAgents: number;
  tasksProcessed: number;
  throughput: number;
  status: "optimal" | "busy" | "idle";
}

const getClusterIcon = (name: string) => {
  switch (name) {
    case "Sales":
      return ShoppingCart;
    case "Operations":
      return Settings;
    case "Analytics":
      return BarChart3;
    case "Support":
      return Headphones;
    default:
      return Users;
  }
};

const generateClusters = (): ClusterData[] => {
  return [
    {
      name: "Sales",
      icon: ShoppingCart,
      gradient: "from-cyan-500 to-blue-500",
      activeAgents: 64,
      totalAgents: 72,
      tasksProcessed: 1247,
      throughput: 147,
      status: "optimal",
    },
    {
      name: "Operations",
      icon: Settings,
      gradient: "from-violet-500 to-purple-500",
      activeAgents: 58,
      totalAgents: 68,
      tasksProcessed: 2103,
      throughput: 289,
      status: "busy",
    },
    {
      name: "Analytics",
      icon: BarChart3,
      gradient: "from-emerald-500 to-green-500",
      activeAgents: 71,
      totalAgents: 78,
      tasksProcessed: 3421,
      throughput: 412,
      status: "optimal",
    },
    {
      name: "Support",
      icon: Headphones,
      gradient: "from-amber-500 to-orange-500",
      activeAgents: 54,
      totalAgents: 62,
      tasksProcessed: 1876,
      throughput: 198,
      status: "busy",
    },
  ];
};

export function ClusterOverview() {
  const [clusters, setClusters] = useState<ClusterData[]>(generateClusters());
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

  useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      setClusters((prev) =>
        prev.map((cluster) => {
          const activeChange = Math.floor(Math.random() * 6) - 3;
          const newActive = Math.max(
            Math.floor(cluster.totalAgents * 0.7),
            Math.min(cluster.totalAgents, cluster.activeAgents + activeChange)
          );
          const throughputChange = Math.floor(Math.random() * 40) - 20;
          const newThroughput = Math.max(50, cluster.throughput + throughputChange);
          
          const utilizationRate = newActive / cluster.totalAgents;
          const newStatus: ClusterData["status"] = 
            utilizationRate > 0.9 ? "busy" : utilizationRate > 0.75 ? "optimal" : "idle";

          return {
            ...cluster,
            activeAgents: newActive,
            tasksProcessed: cluster.tasksProcessed + Math.floor(Math.random() * 50),
            throughput: newThroughput,
            status: newStatus,
          };
        })
      );
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "optimal":
        return "border-emerald-200 text-emerald-700 bg-emerald-50";
      case "busy":
        return "border-amber-200 text-amber-700 bg-amber-50";
      case "idle":
        return "border-slate-200 text-slate-600 bg-slate-50";
      default:
        return "border-slate-200 text-slate-600";
    }
  };

  const totalActive = clusters.reduce((sum, c) => sum + c.activeAgents, 0);
  const totalAgents = clusters.reduce((sum, c) => sum + c.totalAgents, 0);
  const totalThroughput = clusters.reduce((sum, c) => sum + c.throughput, 0);

  const filteredClusters = selectedCluster
    ? clusters.filter((c) => c.name === selectedCluster)
    : clusters;

  return (
    <Card className="bg-white border-slate-200 p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl text-slate-900 tracking-tight">Cluster Activity Overview</h2>
          <p className="text-sm text-slate-600 mt-1">Departmental workforce distribution and performance</p>
        </div>
        <div className="flex gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setSelectedCluster(null)}
            className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
              selectedCluster === null
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Clusters
          </button>
          {clusters.map((cluster) => (
            <button
              key={cluster.name}
              onClick={() => setSelectedCluster(cluster.name)}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${
                selectedCluster === cluster.name
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {cluster.name}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs uppercase tracking-wider text-slate-500">Active Agents</span>
          </div>
          <div className="text-3xl text-slate-900 tracking-tight">
            {totalActive}
            <span className="text-lg text-slate-500 ml-2">/ {totalAgents}</span>
          </div>
          <div className="text-sm text-slate-600 mt-1">
            {((totalActive / totalAgents) * 100).toFixed(1)}% utilization
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            <span className="text-xs uppercase tracking-wider text-slate-500">Total Throughput</span>
          </div>
          <div className="text-3xl text-slate-900 tracking-tight">
            {totalThroughput}
            <span className="text-lg text-slate-500 ml-2">ops/s</span>
          </div>
          <div className="text-sm text-slate-600 mt-1">
            Across {clusters.length} clusters
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs uppercase tracking-wider text-slate-500">Tasks Processed</span>
          </div>
          <div className="text-3xl text-slate-900 tracking-tight">
            {(clusters.reduce((sum, c) => sum + c.tasksProcessed, 0) / 1000).toFixed(1)}k
          </div>
          <div className="text-sm text-slate-600 mt-1">
            Last 24 hours
          </div>
        </div>
      </div>

      {/* Cluster Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredClusters.map((cluster, index) => {
          const Icon = cluster.icon;
          const utilizationPercent = (cluster.activeAgents / cluster.totalAgents) * 100;
          
          return (
            <motion.div
              key={cluster.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative bg-white border border-slate-200 rounded-xl p-6 overflow-hidden hover:shadow-md transition-all"
            >
              {/* Content */}
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${cluster.gradient} flex items-center justify-center shadow-sm`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-slate-900">{cluster.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Department Cluster</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getStatusColor(cluster.status)}`}
                  >
                    {cluster.status}
                  </Badge>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Active Agents</div>
                    <motion.div
                      key={cluster.activeAgents}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                      className="text-xl text-slate-900 tracking-tight"
                    >
                      {cluster.activeAgents} <span className="text-sm text-slate-500">/ {cluster.totalAgents}</span>
                    </motion.div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Throughput</div>
                    <motion.div
                      key={cluster.throughput}
                      initial={{ scale: 1.05 }}
                      animate={{ scale: 1 }}
                      className="text-xl text-slate-900 tracking-tight"
                    >
                      {cluster.throughput} <span className="text-sm text-slate-500">ops/s</span>
                    </motion.div>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                    <span>Agent Utilization</span>
                    <span className="text-slate-900">{utilizationPercent.toFixed(0)}%</span>
                  </div>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${cluster.gradient} rounded-full`}
                      initial={{ width: 0 }}
                      animate={{ width: `${utilizationPercent}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {/* Tasks Processed */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-sm text-slate-600">Tasks Processed (24h)</span>
                  <motion.span
                    key={cluster.tasksProcessed}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-slate-900"
                  >
                    {cluster.tasksProcessed.toLocaleString()}
                  </motion.span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Stats */}
      <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
        <div className="flex items-center gap-6">
          <span>
            <span className="text-slate-900">{totalActive}</span> agents processing work
          </span>
          <span>•</span>
          <span>
            <span className="text-slate-900">{totalThroughput}</span> combined ops/sec
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-600">Live data</span>
        </div>
      </div>
    </Card>
  );
}
