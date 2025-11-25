import { CostPerformanceAnalytics } from "../CostPerformanceAnalytics";
import { CostBreakdown } from "../CostBreakdown";
import { BudgetTracking } from "../BudgetTracking";
import { CostOptimization } from "../CostOptimization";
import { PredictiveIntelligence } from "../PredictiveIntelligence";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { BarChart3, Brain } from "lucide-react";

export function CostsPage() {
  return (
    <div className="max-w-[1800px] mx-auto px-8 py-8 space-y-8">
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Cost Analytics
          </TabsTrigger>
          <TabsTrigger value="predictive" className="gap-2">
            <Brain className="w-4 h-4" />
            Predictive Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-8">
          <CostPerformanceAnalytics />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CostBreakdown />
            <BudgetTracking />
          </div>

          <CostOptimization />
        </TabsContent>

        <TabsContent value="predictive">
          <PredictiveIntelligence />
        </TabsContent>
      </Tabs>
    </div>
  );
}
