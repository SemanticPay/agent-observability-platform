import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { OverviewPage } from "./components/pages/OverviewPage";
import { PerformancePage } from "./components/pages/PerformancePage";
import { ActivityPage } from "./components/pages/ActivityPage";
import { GovernancePage } from "./components/pages/GovernancePage";
import { CostsPage } from "./components/pages/CostsPage";
import { IntegrationsPage } from "./components/pages/IntegrationsPage";
import { AgentAccessPage } from "./components/pages/AgentAccessPage";
import { AgentRegistryPage } from "./components/pages/AgentRegistryPage";
import { MetricsPage } from "./components/pages/MetricsPage";
import { 
  LayoutDashboard, 
  Gauge, 
  Activity,
  Shield,
  DollarSign,
  Plug,
  Key,
  Database,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const pages = [
  { id: "overview", label: "Executive Overview", icon: LayoutDashboard, component: OverviewPage },
  { id: "metrics", label: "Live Metrics", icon: BarChart3, component: MetricsPage },
  { id: "performance", label: "Performance", icon: Gauge, component: PerformancePage },
  { id: "costs", label: "Cost Analytics", icon: DollarSign, component: CostsPage },
  { id: "governance", label: "Governance & Risk", icon: Shield, component: GovernancePage },
  { id: "activity", label: "Activity Monitoring", icon: Activity, component: ActivityPage },
  { id: "integrations", label: "Integrations", icon: Plug, component: IntegrationsPage },
  { id: "access", label: "Agent Access", icon: Key, component: AgentAccessPage },
  { id: "registry", label: "Agent Registry", icon: Database, component: AgentRegistryPage },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState(0);

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % pages.length);
  };

  const prevPage = () => {
    setCurrentPage((prev) => (prev - 1 + pages.length) % pages.length);
  };

  const CurrentPageComponent = pages[currentPage].component;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-[1800px] mx-auto px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {pages.map((page, index) => {
                const Icon = page.icon;
                return (
                  <button
                    key={page.id}
                    onClick={() => setCurrentPage(index)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                      currentPage === index
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{page.label}</span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500">
                {currentPage + 1} / {pages.length}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevPage}
                  className="p-2 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextPage}
                  className="p-2 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <CurrentPageComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
