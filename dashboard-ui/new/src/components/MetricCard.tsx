import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  budget?: number;
  sparklineData?: number[];
  donutPercentage?: number;
  onClick: () => void;
  icon?: React.ReactNode;
  color?: string;
  delta?: number;
  deltaInverse?: boolean; // true if lower values are better (latency, cost)
}

export function MetricCard({ label, value, budget, sparklineData, donutPercentage, onClick, icon, color = '#000F0C', delta, deltaInverse }: MetricCardProps) {
  // Determine if delta is positive/negative and if that's good/bad
  const isPositive = delta ? delta > 0 : false;
  const isGood = deltaInverse ? !isPositive : isPositive;
  
  return (
    <div
      onClick={onClick}
      className="bg-[#F0FFFC] border border-[#ADC4C2] rounded-lg p-4 cursor-pointer hover:border-[#53706C] hover:shadow-sm transition-all"
    >
      {/* Header with icon and label */}
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <div className="flex items-center justify-center" style={{ color }}>
            {icon}
          </div>
        )}
        <div className="text-sm text-[#53706C]">{label}</div>
      </div>

      {/* Value and Delta */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[28px] text-[#000F0C] leading-none">
            {label === 'Cost' ? `$${value}` : value}
          </span>
          {budget && (
            <span className="text-[#ADC4C2]">
              / ${budget}
            </span>
          )}
        </div>
        {delta !== undefined && (
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
            isGood 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="font-medium">{Math.abs(delta).toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Full width chart */}
      <div className="w-full h-16">
        {donutPercentage !== undefined ? (
          <div className="flex flex-col justify-center h-full">
            <div className="flex items-center justify-between text-xs text-[#53706C] mb-2">
              <span>{donutPercentage.toFixed(1)}% of budget</span>
            </div>
            <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-[#ADC4C2]">
              <div 
                className="h-full transition-all duration-300 rounded-full"
                style={{ 
                  width: `${donutPercentage}%`,
                  backgroundColor: color
                }}
              />
            </div>
          </div>
        ) : sparklineData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData.map((value) => ({ value }))}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}