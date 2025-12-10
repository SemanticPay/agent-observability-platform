import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

interface Agent {
  name: string;
  description: string;
  subAgents: string[];
  model: string;
  workflow: string;
  totalCost: number;
  invocations: number;
  costPerInvocation: number;
  successRate: number;
  avgLatency: number;
  toolCalls: number;
  tools: string[];
}

interface AgentModalProps {
  agent: Agent;
  onClose: () => void;
}

type TimeHorizon = '7d' | '30d' | '90d';

export function AgentModal({ agent, onClose }: AgentModalProps) {
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('30d');

  // TODO: Replace mock data with real per-agent time-series from backend
  // Backend has the Prometheus metrics (adk_llm_cost_dollars_total, adk_agent_runs_total, etc.)
  // but no endpoint currently exposes time-series data per agent.
  // Need to create: GET /api/metrics/time-series/agent/{agent_name}
  const generateTimeSeriesData = (metric: string, horizon: TimeHorizon) => {
    const days = horizon === '7d' ? 7 : horizon === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      let value = 0;
      const variance = 0.15; // 15% variance
      
      switch (metric) {
        case 'totalCost':
          const dailyCost = agent.totalCost / days;
          value = dailyCost * (1 + (Math.random() - 0.5) * variance);
          break;
        case 'invocations':
          const dailyInvocations = agent.invocations / days;
          value = Math.round(dailyInvocations * (1 + (Math.random() - 0.5) * variance));
          break;
        case 'costPerInvocation':
          value = agent.costPerInvocation * (1 + (Math.random() - 0.5) * variance);
          break;
        case 'successRate':
          value = agent.successRate + (Math.random() - 0.5) * 2;
          value = Math.max(95, Math.min(100, value));
          break;
        case 'latency':
          value = agent.avgLatency * (1 + (Math.random() - 0.5) * variance);
          break;
        case 'toolCalls':
          const dailyToolCalls = agent.toolCalls / days;
          value = Math.round(dailyToolCalls * (1 + (Math.random() - 0.5) * variance));
          break;
      }
      
      data.push({ date: dayLabel, value });
    }
    
    return data;
  };

  // NOTE: All chart labels include "(Mock)" since time-series data is generated, not from backend
  const metrics = [
    { key: 'totalCost', label: 'Total Cost (Mock)', color: '#53706C', format: (v: number) => `$${v.toFixed(4)}` },
    { key: 'invocations', label: 'Invocations (Mock)', color: '#6E8C88', format: (v: number) => v.toLocaleString() },
    { key: 'costPerInvocation', label: 'Cost/Invocation (Mock)', color: '#53706C', format: (v: number) => `$${v.toFixed(5)}` },
    { key: 'successRate', label: 'Success Rate (Mock)', color: '#6E8C88', format: (v: number) => `${v.toFixed(1)}%` },
    { key: 'latency', label: 'Latency (Mock)', color: '#53706C', format: (v: number) => `${v.toFixed(0)}ms` },
    { key: 'toolCalls', label: 'Tool Calls (Mock)', color: '#6E8C88', format: (v: number) => v.toLocaleString() },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#F0FFFC] border-b border-[#ADC4C2] p-6 flex items-start justify-between z-10">
          <div>
            <h2 className="text-[#000F0C] text-xl mb-1">{agent.name}</h2>
            <p className="text-sm text-[#53706C]">{agent.description}</p>
            <div className="flex gap-4 mt-3 text-xs">
              <div>
                <span className="text-[#53706C]">Sub-agents: </span>
                <span className="text-[#000F0C]">
                  {agent.subAgents?.length > 0 ? agent.subAgents.join(', ') : '—'}
                </span>
              </div>
              <div>
                <span className="text-[#53706C]">Model: </span>
                <span className="text-[#000F0C]">{agent.model}</span>
              </div>
              <div>
                <span className="text-[#53706C]">Workflow: </span>
                <span className="text-[#000F0C]">{agent.workflow}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#53706C] hover:text-[#000F0C] transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Time Horizon Selector */}
        <div className="px-6 pt-6 pb-4 bg-[#F0FFFC]/30">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#53706C]">Time Period:</span>
            <div className="flex gap-1">
              {(['7d', '30d', '90d'] as TimeHorizon[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeHorizon(period)}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    timeHorizon === period
                      ? 'bg-[#000F0C] text-white'
                      : 'bg-white border border-[#ADC4C2] text-[#53706C] hover:border-[#53706C]'
                  }`}
                >
                  {period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="p-6 grid grid-cols-2 gap-6">
          {metrics.map((metric) => {
            const data = generateTimeSeriesData(metric.key, timeHorizon);
            return (
              <div key={metric.key} className="bg-[#F0FFFC] border border-[#ADC4C2] rounded-lg p-4">
                <h3 className="text-sm text-[#000F0C] mb-4">{metric.label}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ADC4C2" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#53706C"
                      tick={{ fill: '#53706C', fontSize: 11 }}
                      tickLine={{ stroke: '#ADC4C2' }}
                    />
                    <YAxis 
                      stroke="#53706C"
                      tick={{ fill: '#53706C', fontSize: 11 }}
                      tickLine={{ stroke: '#ADC4C2' }}
                      tickFormatter={(value) => metric.format(value)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#F0FFFC',
                        border: '1px solid #ADC4C2',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [metric.format(value), metric.label]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={metric.color}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
