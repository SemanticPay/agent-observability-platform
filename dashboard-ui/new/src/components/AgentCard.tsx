import { Bot, Wrench, CheckCircle } from 'lucide-react';

interface Tool {
  name: string;
  calls: number;
  avg_duration: number;
  success_rate: number;
}

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
  tools: Tool[];
}

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  return (
    <div 
      className="bg-[#F0FFFC] border border-[#ADC4C2] rounded-lg overflow-hidden hover:border-[#53706C] hover:shadow-sm transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="border-b border-[#ADC4C2] p-4">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-4 h-4 text-[#53706C]" />
          <div className="text-[#000F0C]">{agent.name}</div>
        </div>
        <p className="text-xs text-[#53706C] mb-3 ml-6">{agent.description}</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-[#53706C]">Sub-agents</div>
            <div className="text-[#000F0C]">
              {agent.subAgents?.length > 0 ? agent.subAgents.join(', ') : '—'}
            </div>
          </div>
          <div>
            <div className="text-[#53706C]">Model</div>
            <div className="text-[#000F0C]">{agent.model}</div>
          </div>
          <div>
            <div className="text-[#53706C]">Workflow</div>
            <div className="text-[#000F0C] truncate" title={agent.workflow}>
              {agent.workflow}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4 border-b border-[#ADC4C2]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <div>
            <div className="text-[#53706C]">Total Cost</div>
            <div className="text-[#000F0C]">${agent.totalCost.toFixed(4)}</div>
          </div>
          <div>
            <div className="text-[#53706C]">Invocations</div>
            <div className="text-[#000F0C]">{agent.invocations.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[#53706C]">Cost/Invocation</div>
            <div className="text-[#000F0C]">${agent.costPerInvocation.toFixed(5)}</div>
          </div>
          <div>
            <div className="text-[#53706C]">Success Rate</div>
            <div className="text-[#000F0C]">{agent.successRate}%</div>
          </div>
          <div>
            <div className="text-[#53706C]">Latency</div>
            <div className="text-[#000F0C]">{agent.avgLatency.toFixed(2)}ms</div>
          </div>
          <div>
            <div className="text-[#53706C]">Tool Calls</div>
            <div className="text-[#000F0C]">{agent.toolCalls.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Tools */}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Wrench className="w-3.5 h-3.5 text-[#53706C]" />
          <div className="text-xs text-[#53706C]">MCP Tools</div>
        </div>
        {agent.tools.length === 0 ? (
          <div className="text-xs text-[#53706C] italic">No tool calls yet</div>
        ) : (
          <div className="space-y-2">
            {agent.tools.map((tool, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white border border-[#ADC4C2] rounded px-4 py-4"
              >
                <span className="text-xs text-[#000F0C]">{tool.name}</span>
                <div className="flex items-center gap-2 text-xs text-[#53706C]">
                  <span>{tool.calls} calls</span>
                  <span className={`inline-flex items-center gap-0.5 ${
                    tool.calls === 0 ? 'text-[#53706C]' : 
                    tool.success_rate >= 0.95 ? 'text-green-600' : 
                    tool.success_rate >= 0.8 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    <CheckCircle className="w-3 h-3" />
                    {tool.calls === 0 ? 'N/A' : `${(tool.success_rate * 100).toFixed(0)}%`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
