import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { MetricCard } from './components/MetricCard';
import { AgentCard } from './components/AgentCard';
import { ChartModal } from './components/ChartModal';
import { AgentModal } from './components/AgentModal';
import { Activity, Zap, DollarSign, Clock, TrendingUp, CheckCircle, Loader2 } from 'lucide-react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useMetricsSummary, useAgentsDetail, useConversationMetrics } from './hooks/useMetrics';
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useCopilotReadable } from "@copilotkit/react-core";
import { prompt } from "./prompt";
import { CustomAssistantMessage } from "./components/AssistantMessage";

// Convert UI time period to backend format
// UI: '1d', '1mo', '3mo', '1yr', 'Max'
// Backend: '24h', '30d', '90d', '365d', '9999d'
function toBackendTimeRange(uiPeriod: string): string {
  switch (uiPeriod) {
    case '1d': return '24h';
    case '1mo': return '30d';
    case '3mo': return '90d';
    case '1yr': return '365d';
    case 'Max': return '9999d'; // Large value for "all time"
    default: return '24h';
  }
}

export default function App() {
  // UI time period format for display/charts
  const [timePeriod, setTimePeriod] = useState('1d');
  const [workflow, setWorkflow] = useState('Total');
  const [modalMetric, setModalMetric] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [costBreakdownTab, setCostBreakdownTab] = useState<'workflow' | 'agent' | 'model'>('workflow');
  const [sortBy, setSortBy] = useState<'totalCost' | 'invocations' | 'costPerInvocation' | 'avgLatency' | 'toolCalls' | 'successRate'>('totalCost');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Convert to backend format for API calls
  const backendTimeRange = toBackendTimeRange(timePeriod);

  // Fetch data from backend using converted time range
  const { data: summary, loading: summaryLoading, error: summaryError } = useMetricsSummary(backendTimeRange);
  const { data: agentsDetail, loading: agentsLoading, error: agentsError } = useAgentsDetail(backendTimeRange);
  const { data: conversationMetrics, loading: conversationLoading, error: conversationError } = useConversationMetrics(backendTimeRange);

  // Combined loading state
  const isLoading = summaryLoading || agentsLoading || conversationLoading;

  // Make data available to the Copilot assistant
  useCopilotReadable({
    description: "Current time",
    value: new Date().toLocaleTimeString(),
  });

  useCopilotReadable({
    description: "Dashboard metrics summary including total cost, runs, and execution duration",
    value: summary,
  });

  useCopilotReadable({
    description: "Detailed agent metrics including cost, runs, tools, and success rate for each agent",
    value: agentsDetail,
  });

  useCopilotReadable({
    description: "Conversation metrics including total conversations and cost per conversation",
    value: conversationMetrics,
  });

  // Switch to 'agent' tab when moving from Total to a specific workflow
  useEffect(() => {
    if (workflow !== 'Total' && costBreakdownTab === 'workflow') {
      setCostBreakdownTab('agent');
    }
  }, [workflow, costBreakdownTab]);

  // Calculate average success rate from all agents
  const avgSuccessRate = useMemo(() => {
    if (!agentsDetail || agentsDetail.length === 0) return 0;
    const totalRuns = agentsDetail.reduce((sum, agent) => sum + agent.runs, 0);
    if (totalRuns === 0) return 0;
    // Weighted average by runs
    const weightedSum = agentsDetail.reduce((sum, agent) => sum + (agent.success_rate * agent.runs), 0);
    return (weightedSum / totalRuns) * 100;
  }, [agentsDetail]);

  // Map backend data to UI metrics format
  const metrics = useMemo(() => {
    // Helper to generate realistic sparkline around a value
    const generateSparkline = (value: number, variance: number = 0.15) => {
      const points = 7;
      return Array.from({ length: points }, (_, i) => {
        // Trend upward toward current value
        const progress = i / (points - 1);
        const base = value * (0.85 + progress * 0.15);
        const noise = (Math.random() - 0.5) * variance * value;
        return Math.max(0, base + noise);
      });
    };

    const sessions = conversationMetrics?.total_conversations ?? 0;
    const runs = summary?.total_runs ?? 0;
    const cost = summary?.total_cost ?? 0;
    const latency = summary?.avg_execution_duration ?? 0;
    const costPerSession = conversationMetrics?.avg_cost_per_conversation ?? 0;

    return {
      sessions: { 
        value: sessions, 
        // TODO: Get sparkline from backend time-series endpoint
        sparkline: generateSparkline(sessions, 0.2), 
        // TODO: Calculate delta from historical data
        delta: 4.3 
      },
      agentInvocations: { 
        value: runs, 
        // TODO: Get sparkline from backend time-series endpoint
        sparkline: generateSparkline(runs, 0.15), 
        // TODO: Calculate delta from historical data
        delta: 2.7 
      },
      costVsBudget: { 
        value: cost, 
        // TODO: Backend doesn't provide budget - keeping hardcoded
        budget: 1200, 
        // Calculate percentage from cost and budget
        percentage: cost > 0 ? (cost / 1200) * 100 : 0,
        // TODO: Get sparkline from backend time-series endpoint
        sparkline: generateSparkline(cost, 0.15),
        // TODO: Calculate delta from historical data
        delta: -5.2 
      },
      avgLatency: { 
        value: latency, 
        // TODO: Get sparkline from backend time-series endpoint
        sparkline: generateSparkline(latency, 0.1), 
        // TODO: Calculate delta from historical data
        delta: -8.4 
      },
      avgCostPerSession: { 
        value: costPerSession, 
        // TODO: Get sparkline from backend time-series endpoint
        sparkline: generateSparkline(costPerSession, 0.12), 
        // TODO: Calculate delta from historical data
        delta: -7.9 
      },
      successRate: { 
        value: avgSuccessRate, 
        // TODO: Get sparkline from backend time-series endpoint
        sparkline: generateSparkline(avgSuccessRate, 0.02), 
        // TODO: Calculate delta from historical data
        delta: 1.2 
      }
    };
  }, [summary, conversationMetrics, avgSuccessRate]);

  // TODO: Get workflow cost breakdown from backend when multiple workflows are supported
  // Currently all agents belong to "Driver License Renewal", so we sum up all agent costs
  const workflowCostData = useMemo(() => {
    const totalWorkflowCost = agentsDetail.reduce((sum, agent) => sum + agent.cost, 0);
    return [
      { name: 'Driver License Renewal', value: totalWorkflowCost, color: '#53706C' },
    ];
  }, [agentsDetail]);

  // Generate agent cost breakdown from backend data
  const agentCostData = useMemo(() => {
    const colors = ['#53706C', '#6E8C88', '#ADC4C2', '#D4E3E1'];
    return agentsDetail.map((agent, index) => ({
      name: agent.name,
      value: agent.cost,
      color: colors[index % colors.length]
    }));
  }, [agentsDetail]);

  // TODO: Get model cost breakdown from backend when it's available
  // Currently all agents use gemini-2.5-flash, so we use the total agent cost
  const modelCostData = useMemo(() => {
    const totalModelCost = agentsDetail.reduce((sum, agent) => sum + agent.cost, 0);
    return [
      { name: 'gemini-2.5-flash', value: totalModelCost, color: '#53706C' },
    ];
  }, [agentsDetail]);

  const getCostData = () => {
    switch (costBreakdownTab) {
      case 'workflow':
        return workflowCostData;
      case 'agent':
        return agentCostData;
      case 'model':
        return modelCostData;
      default:
        return workflowCostData;
    }
  };

  // Map backend agent data to UI agent format
  const agents = useMemo(() => {
    return agentsDetail.map(agent => {
      const totalToolCalls = agent.tools.reduce((sum, tool) => sum + tool.calls, 0);
      return {
        name: agent.name,
        // TODO: Backend doesn't provide description - using placeholder
        description: `Agent: ${agent.name}`,
        subAgents: agent.subagents ?? [],
        model: agent.model,
        // TODO: Backend doesn't provide workflow - using first workflow or placeholder
        workflow: agent.workflows?.[0] ?? 'Unknown',
        totalCost: agent.cost,
        invocations: agent.runs,
        costPerInvocation: agent.runs > 0 ? agent.cost / agent.runs : 0,
        successRate: agent.success_rate * 100, // Backend returns 0-1, UI expects 0-100
        avgLatency: agent.avg_duration * 1000, // Backend returns seconds, UI expects milliseconds
        toolCalls: totalToolCalls,
        // Pass full tool data for detailed display (name, calls, avg_duration, success_rate)
        tools: agent.tools
      };
    });
  }, [agentsDetail]);

  // Sort agents
  const sortedAgents = [...agents].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const sortOptions = [
    { value: 'totalCost', label: 'Total Cost' },
    { value: 'invocations', label: 'Invocations' },
    { value: 'costPerInvocation', label: 'Cost/Invocation' },
    { value: 'avgLatency', label: 'Latency' },
    { value: 'toolCalls', label: 'Tool Calls' },
    { value: 'successRate', label: 'Success Rate' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
      />

      {/* Workflow Tabs */}
      <div className="bg-white border-b border-[#ADC4C2]">
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setWorkflow('Total')}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 ${
                workflow === 'Total'
                  ? 'border-[#000F0C] text-[#000F0C]'
                  : 'border-transparent text-[#53706C] hover:text-[#000F0C]'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setWorkflow('Driver License Renewal')}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 ${
                workflow === 'Driver License Renewal'
                  ? 'border-[#000F0C] text-[#000F0C]'
                  : 'border-transparent text-[#53706C] hover:text-[#000F0C]'
              }`}
            >
              Driver License Renewal
            </button>
            {/* <button
              onClick={() => setWorkflow('Digital Vehicle Transfer')}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 ${
                workflow === 'Digital Vehicle Transfer'
                  ? 'border-[#000F0C] text-[#000F0C]'
                  : 'border-transparent text-[#53706C] hover:text-[#000F0C]'
              }`}
            >
              Digital Vehicle Transfer
            </button>
            <button
              onClick={() => setWorkflow('Annual Licensing')}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 ${
                workflow === 'Annual Licensing'
                  ? 'border-[#000F0C] text-[#000F0C]'
                  : 'border-transparent text-[#53706C] hover:text-[#000F0C]'
              }`}
            >
              Annual Licensing
            </button> */}
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-8 py-8">
        {/* Summary Section */}
        <div className="grid grid-cols-[1fr_auto] gap-6 mb-12">
          <div className="grid grid-cols-3 gap-4 auto-rows-fr">
            <MetricCard
              label="Sessions"
              value={summaryLoading ? '...' : metrics.sessions.value.toLocaleString()}
              sparklineData={metrics.sessions.sparkline}
              onClick={() => setModalMetric('sessions')}
              icon={<Activity className="w-4 h-4" />}
              color="#53706C"
              delta={metrics.sessions.delta}
            />
            <MetricCard
              label="Agent Invocations"
              value={summaryLoading ? '...' : metrics.agentInvocations.value.toLocaleString()}
              sparklineData={metrics.agentInvocations.sparkline}
              onClick={() => setModalMetric('agentInvocations')}
              icon={<Zap className="w-4 h-4" />}
              color="#6E8C88"
              delta={metrics.agentInvocations.delta}
            />
            <MetricCard
              label="Cost"
              value={summaryLoading ? '...' : `${metrics.costVsBudget.value.toFixed(4)}`}
              budget={metrics.costVsBudget.budget}
              donutPercentage={timePeriod === '1mo' ? metrics.costVsBudget.percentage : undefined}
              sparklineData={timePeriod !== '1mo' ? metrics.costVsBudget.sparkline : undefined}
              onClick={() => setModalMetric('costVsBudget')}
              icon={<DollarSign className="w-4 h-4" />}
              color="#53706C"
              delta={metrics.costVsBudget.delta}
              deltaInverse={true}
            />
            <MetricCard
              label="Latency"
              value={summaryLoading ? '...' : `${metrics.avgLatency.value.toFixed(2)}s`}
              sparklineData={metrics.avgLatency.sparkline}
              onClick={() => setModalMetric('avgLatency')}
              icon={<Clock className="w-4 h-4" />}
              color="#6E8C88"
              delta={metrics.avgLatency.delta}
              deltaInverse={true}
            />
            <MetricCard
              label="Cost/Session"
              value={conversationLoading ? '...' : `$${metrics.avgCostPerSession.value.toFixed(4)}`}
              sparklineData={metrics.avgCostPerSession.sparkline}
              onClick={() => setModalMetric('avgCostPerSession')}
              icon={<TrendingUp className="w-4 h-4" />}
              color="#53706C"
              delta={metrics.avgCostPerSession.delta}
              deltaInverse={true}
            />
            <MetricCard
              label="Success Rate"
              value={agentsLoading ? '...' : `${metrics.successRate.value.toFixed(1)}%`}
              sparklineData={metrics.successRate.sparkline}
              onClick={() => setModalMetric('successRate')}
              icon={<CheckCircle className="w-4 h-4" />}
              color="#6E8C88"
              delta={metrics.successRate.delta}
            />
          </div>

          {/* Workflow Cost Breakdown */}
          <div className="bg-card border border-card-border rounded-lg p-5 w-[380px]">
            <h3 className="text-foreground mb-3 text-sm">Cost Breakdown</h3>
            
            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-[#ADC4C2]">
              {workflow === 'Total' && (
                <button
                  onClick={() => setCostBreakdownTab('workflow')}
                  className={`px-3 py-1.5 text-xs transition-colors border-b-2 -mb-px ${
                    costBreakdownTab === 'workflow'
                      ? 'border-[#000F0C] text-[#000F0C]'
                      : 'border-transparent text-[#53706C] hover:text-[#000F0C]'
                  }`}
                >
                  Workflow
                </button>
              )}
              <button
                onClick={() => setCostBreakdownTab('agent')}
                className={`px-3 py-1.5 text-xs transition-colors border-b-2 -mb-px ${
                  costBreakdownTab === 'agent'
                    ? 'border-[#000F0C] text-[#000F0C]'
                    : 'border-transparent text-[#53706C] hover:text-[#000F0C]'
                }`}
              >
                Agent
              </button>
              <button
                onClick={() => setCostBreakdownTab('model')}
                className={`px-3 py-1.5 text-xs transition-colors border-b-2 -mb-px ${
                  costBreakdownTab === 'model'
                    ? 'border-[#000F0C] text-[#000F0C]'
                    : 'border-transparent text-[#53706C] hover:text-[#000F0C]'
                }`}
              >
                Model
              </button>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={getCostData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {getCostData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(4)}`}
                  contentStyle={{
                    backgroundColor: '#F0FFFC',
                    border: '1px solid #ADC4C2',
                    borderRadius: '6px',
                    color: '#000F0C',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-4">
              {getCostData().map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[#000F0C]">{item.name}</span>
                  </div>
                  <span className="text-[#53706C]">${item.value.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent Registry Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground">
              Agent Registry <span className="text-[#53706C] text-sm">(total agents: {agents.length})</span>
            </h2>
            
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#53706C]">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="text-xs px-3 py-1.5 bg-white border border-[#ADC4C2] rounded text-[#000F0C] hover:border-[#53706C] focus:outline-none focus:border-[#53706C] transition-colors"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={toggleSortDirection}
                className="p-1.5 bg-white border border-[#ADC4C2] rounded text-[#53706C] hover:border-[#53706C] hover:text-[#000F0C] transition-colors"
                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortDirection === 'asc' ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          
          {agentsLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-[#53706C]" />
            </div>
          ) : agentsError ? (
            <div className="flex items-center justify-center h-48 text-red-500">
              Error loading agents: {agentsError}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {sortedAgents.map((agent, index) => (
                <AgentCard key={index} agent={agent} onClick={() => setSelectedAgent(agent)} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Chart Modal */}
      {modalMetric && (
        <ChartModal
          metricName={modalMetric}
          currentValue={metrics[modalMetric as keyof typeof metrics]?.value ?? 0}
          onClose={() => setModalMetric(null)}
          timePeriod={timePeriod}
        />
      )}

      {/* Agent Modal */}
      {selectedAgent && (
        <AgentModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}

      {/* CopilotKit Sidebar */}
      <CopilotSidebar
        instructions={prompt}
        AssistantMessage={CustomAssistantMessage}
        labels={{
          title: "Data Assistant",
          initial: "Hello! I'm here to help you understand your agent metrics. Ask me about costs, performance, or any data you see on this dashboard.",
          placeholder: "Ask about agents, costs, or metrics...",
        }}
      />
    </div>
  );
}
