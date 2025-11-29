import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Activity, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";

interface Task {
  id: string;
  agent: string;
  action: string;
  status: "completed" | "in-progress" | "failed";
  duration: string;
  timestamp: string;
  platform: string;
}

const actions = [
  "Data analysis on customer records",
  "Report generation for Q4 metrics",
  "Database query optimization",
  "Email classification and routing",
  "Sentiment analysis on support tickets",
  "Code review for pull request #847",
  "Invoice processing and validation",
  "Meeting transcript summarization",
  "Competitor analysis scraping",
  "User behavior pattern detection",
];

const platforms = ["Skyfire", "Vertex AI", "Agentforce", "LangChain", "CrewAI"];

const generateTask = (): Task => {
  const statuses: Task["status"][] = ["completed", "in-progress", "failed"];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  return {
    id: `TSK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    agent: `AGT-${Math.floor(Math.random() * 310).toString().padStart(3, "0")}`,
    action: actions[Math.floor(Math.random() * actions.length)],
    status,
    duration: `${(Math.random() * 5 + 0.5).toFixed(1)}s`,
    timestamp: new Date().toLocaleTimeString(),
    platform: platforms[Math.floor(Math.random() * platforms.length)],
  };
};

export function TaskTelemetryFeed() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "completed" | "in-progress" | "failed">("all");

  useEffect(() => {
    // Initialize with some tasks
    const initialTasks = Array.from({ length: 10 }, generateTask);
    setTasks(initialTasks);

    // Add new tasks periodically
    const interval = setInterval(() => {
      const newTask = generateTask();
      setTasks((prev) => [newTask, ...prev.slice(0, 29)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filteredTasks = filter === "all" 
    ? tasks 
    : tasks.filter((task) => task.status === filter);

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case "in-progress":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return "border-emerald-200 text-emerald-700 bg-emerald-50";
      case "in-progress":
        return "border-blue-200 text-blue-700 bg-blue-50";
      case "failed":
        return "border-red-200 text-red-700 bg-red-50";
    }
  };

  const statusCounts = {
    all: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    "in-progress": tasks.filter((t) => t.status === "in-progress").length,
    failed: tasks.filter((t) => t.status === "failed").length,
  };

  return (
    <Card className="bg-white border-slate-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg text-slate-900 tracking-tight">Task Telemetry Feed</h3>
          <p className="text-sm text-slate-600 mt-1">Real-time agent activity stream</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="text-sm text-slate-600">Live</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-100 rounded-lg p-1">
        {(["all", "completed", "in-progress", "failed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`flex-1 px-3 py-2 rounded-md text-xs transition-colors ${
              filter === status
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
            <span className="ml-1.5 text-slate-500">({statusCounts[status]})</span>
          </button>
        ))}
      </div>

      {/* Task List */}
      <ScrollArea className="h-[500px]">
        <div className="space-y-3 pr-4">
          <AnimatePresence mode="popLayout">
            {filteredTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
                className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow group"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getStatusIcon(task.status)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="text-sm text-slate-900 mb-1">{task.action}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span>{task.agent}</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="text-blue-600">{task.platform}</span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs whitespace-nowrap ${getStatusColor(task.status)}`}
                      >
                        {task.status === "in-progress" ? "In Progress" : task.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{task.timestamp}</span>
                      <span>{task.duration}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between text-sm">
        <div className="flex items-center gap-6 text-slate-600">
          <div>
            <span className="text-emerald-600">{statusCounts.completed}</span> completed
          </div>
          <div>
            <span className="text-blue-600">{statusCounts["in-progress"]}</span> in progress
          </div>
          <div>
            <span className="text-red-600">{statusCounts.failed}</span> failed
          </div>
        </div>
        <div className="text-slate-500">
          Success rate: <span className="text-slate-900">
            {((statusCounts.completed / (statusCounts.completed + statusCounts.failed || 1)) * 100).toFixed(1)}%
          </span>
        </div>
      </div>
    </Card>
  );
}
