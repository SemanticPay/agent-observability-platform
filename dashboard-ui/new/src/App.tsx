import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MetricCard } from './components/MetricCard';
import { AgentCard } from './components/AgentCard';
import { ChartModal } from './components/ChartModal';
import { AgentModal } from './components/AgentModal';
import { Activity, Zap, DollarSign, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function App() {
  const [timePeriod, setTimePeriod] = useState('1mo');
  const [workflow, setWorkflow] = useState('Total');
  const [modalMetric, setModalMetric] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [costBreakdownTab, setCostBreakdownTab] = useState<'workflow' | 'agent' | 'model'>('workflow');
  const [sortBy, setSortBy] = useState<'totalCost' | 'invocations' | 'costPerInvocation' | 'avgLatency' | 'toolCalls' | 'successRate'>('totalCost');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Switch to 'agent' tab when moving from Total to a specific workflow
  useEffect(() => {
    if (workflow !== 'Total' && costBreakdownTab === 'workflow') {
      setCostBreakdownTab('agent');
    }
  }, [workflow, costBreakdownTab]);

  // Mock data based on selected filters
  const getMetricData = () => {
    const baseData = {
      sessions: { value: 12847, sparkline: [8200, 10100, 9500, 11200, 10800, 12300, 12847], delta: 4.3 },
      agentInvocations: { value: 48293, sparkline: [32000, 38000, 35000, 42000, 40000, 47000, 48293], delta: 2.7 },
      costVsBudget: { value: 847, budget: 1200, percentage: 70.6, delta: -5.2 },
      avgLatency: { value: 1.2, sparkline: [1.5, 1.3, 1.45, 1.25, 1.35, 1.21, 1.2], delta: -8.4 },
      avgCostPerSession: { value: 0.07, sparkline: [0.09, 0.08, 0.085, 0.075, 0.078, 0.071, 0.07], delta: -7.9 },
      successRate: { value: 98.4, sparkline: [97.2, 98.1, 97.8, 98.3, 98.0, 98.3, 98.4], delta: 1.2 }
    };

    return baseData;
  };

  const metrics = getMetricData();

  // Workflow cost breakdown data
  const workflowCostData = [
    { name: 'Driver License Renewal', value: 712.45, color: '#53706C' },
    { name: 'Digital Vehicle Transfer', value: 89.30, color: '#6E8C88' },
    { name: 'Annual Licensing', value: 45.25, color: '#ADC4C2' }
  ];

  // Agent cost breakdown data
  const agentCostData = [
    { name: 'Orchestrator', value: 312.45, color: '#53706C' },
    { name: 'license_renewal_qa_agent', value: 156.20, color: '#6E8C88' },
    { name: 'medical_appointment_agent', value: 243.80, color: '#ADC4C2' },
    { name: 'Other Agents', value: 134.55, color: '#D4E3E1' }
  ];

  // Model cost breakdown data
  const modelCostData = [
    { name: 'gemini-2.0-flash', value: 678.90, color: '#53706C' },
    { name: 'gpt-4o-mini', value: 123.45, color: '#6E8C88' },
    { name: 'claude-3-haiku', value: 44.65, color: '#ADC4C2' }
  ];

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

  const agents = [
    {
      name: 'Orchestrator',
      description: 'Coordinates the entire license renewal workflow and delegates tasks to specialized agents',
      parent: '—',
      model: 'gemini-2.0-flash',
      workflow: 'Driver License Renewal',
      totalCost: 312.45,
      invocations: 14203,
      costPerInvocation: 0.022,
      successRate: 99.1,
      avgLatency: 890,
      toolCalls: 28406,
      tools: [
        'check_renewal_eligibility',
        'get_required_exams_and_nearby_clinics',
        'check_exam_results',
        'get_payment_options',
        'check_payment_and_delivery_status'
      ]
    },
    {
      name: 'license_renewal_qa_agent',
      description: 'Answers questions about license renewal rules and regulations',
      parent: 'Orchestrator',
      model: 'gemini-2.0-flash',
      workflow: 'Driver License Renewal',
      totalCost: 156.20,
      invocations: 8942,
      costPerInvocation: 0.017,
      successRate: 98.8,
      avgLatency: 620,
      toolCalls: 8942,
      tools: ['search_rules']
    },
    {
      name: 'medical_appointment_agent',
      description: 'Helps users find credentialed clinics and check medical exam results',
      parent: 'Orchestrator',
      model: 'gemini-2.0-flash',
      workflow: 'Driver License Renewal',
      totalCost: 243.80,
      invocations: 11568,
      costPerInvocation: 0.021,
      successRate: 97.9,
      avgLatency: 1140,
      toolCalls: 23136,
      tools: ['search_credentialed_clinics', 'check_exam_results']
    }
  ];

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
            <button
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
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1400px] mx-auto px-8 py-8">
        {/* Summary Section */}
        <div className="grid grid-cols-[1fr_auto] gap-6 mb-12">
          <div className="grid grid-cols-3 gap-4 auto-rows-fr">
            <MetricCard
              label="Sessions"
              value={metrics.sessions.value.toLocaleString()}
              sparklineData={metrics.sessions.sparkline}
              onClick={() => setModalMetric('sessions')}
              icon={<Activity className="w-4 h-4" />}
              color="#53706C"
              delta={metrics.sessions.delta}
            />
            <MetricCard
              label="Agent Invocations"
              value={metrics.agentInvocations.value.toLocaleString()}
              sparklineData={metrics.agentInvocations.sparkline}
              onClick={() => setModalMetric('agentInvocations')}
              icon={<Zap className="w-4 h-4" />}
              color="#6E8C88"
              delta={metrics.agentInvocations.delta}
            />
            <MetricCard
              label="Cost"
              value={metrics.costVsBudget.value.toString()}
              budget={metrics.costVsBudget.budget}
              donutPercentage={timePeriod === '1mo' ? metrics.costVsBudget.percentage : undefined}
              sparklineData={timePeriod === '1d' ? undefined : metrics.sessions.sparkline}
              onClick={() => setModalMetric('costVsBudget')}
              icon={<DollarSign className="w-4 h-4" />}
              color="#53706C"
              delta={metrics.costVsBudget.delta}
              deltaInverse={true}
            />
            <MetricCard
              label="Latency"
              value={`${metrics.avgLatency.value}s`}
              sparklineData={metrics.avgLatency.sparkline}
              onClick={() => setModalMetric('avgLatency')}
              icon={<Clock className="w-4 h-4" />}
              color="#6E8C88"
              delta={metrics.avgLatency.delta}
              deltaInverse={true}
            />
            <MetricCard
              label="Cost/Session"
              value={`$${metrics.avgCostPerSession.value}`}
              sparklineData={metrics.avgCostPerSession.sparkline}
              onClick={() => setModalMetric('avgCostPerSession')}
              icon={<TrendingUp className="w-4 h-4" />}
              color="#53706C"
              delta={metrics.avgCostPerSession.delta}
              deltaInverse={true}
            />
            <MetricCard
              label="Success Rate"
              value={`${metrics.successRate.value}%`}
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
                  formatter={(value: number) => `$${value.toFixed(2)}`}
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
                  <span className="text-[#53706C]">${item.value.toFixed(2)}</span>
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
          
          <div className="grid grid-cols-3 gap-4">
            {sortedAgents.map((agent, index) => (
              <AgentCard key={index} agent={agent} onClick={() => setSelectedAgent(agent)} />
            ))}
          </div>
        </section>
      </main>

      {/* Chart Modal */}
      {modalMetric && (
        <ChartModal
          metricName={modalMetric}
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
    </div>
  );
}
