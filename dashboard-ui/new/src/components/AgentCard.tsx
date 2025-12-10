import { Bot, Wrench } from 'lucide-react';

interface Agent {
  name: string;
  description: string;
  parent: string;
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
            <div className="text-[#53706C]">Parent</div>
            <div className="text-[#000F0C]">{agent.parent}</div>
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
            <div className="text-[#000F0C]">${agent.totalCost.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[#53706C]">Invocations</div>
            <div className="text-[#000F0C]">{agent.invocations.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[#53706C]">Cost/Invocation</div>
            <div className="text-[#000F0C]">${agent.costPerInvocation.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-[#53706C]">Success Rate</div>
            <div className="text-[#000F0C]">{agent.successRate}%</div>
          </div>
          <div>
            <div className="text-[#53706C]">Latency</div>
            <div className="text-[#000F0C]">{agent.avgLatency}ms</div>
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
        <div className="flex flex-wrap gap-1.5">
          {agent.tools.map((tool, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-white text-[#53706C] border border-[#ADC4C2] rounded text-xs"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}