import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartModalProps {
  metricName: string;
  currentValue: number;  // Actual value from the metric card
  onClose: () => void;
  timePeriod: string;
}

/**
 * TODO: Replace mock data with real backend time-series data
 * 
 * Current issues:
 * - Data is completely mock (hardcoded base values + sine wave + random noise)
 * - Values are NOT aligned with actual backend metrics displayed in metric cards
 * - Success rate can incorrectly exceed 100% due to random variance calculation
 * - No real historical data from backend
 * 
 * To fix:
 * 1. Use useMetricsTimeSeries hook from hooks/useMetrics.ts (already available)
 * 2. Backend currently provides: cost, duration, tool_calls time-series
 * 3. Need backend endpoints for: sessions, agent_invocations, success_rate time-series
 * 4. Pass the actual current metric value to ensure chart aligns with card values
 * 5. Apply proper bounds (e.g., success_rate should be clamped to 0-100)
 */
export function ChartModal({ metricName, currentValue, onClose, timePeriod }: ChartModalProps) {
  // WARNING: This generates MOCK time-series data, but now uses the actual current value as base
  // See TODO above for proper implementation with real historical data
  const generateData = () => {
    const dataPoints = timePeriod === '1d' ? 24 : timePeriod === '1mo' ? 30 : timePeriod === '3mo' ? 90 : timePeriod === '1yr' ? 365 : 730;
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < dataPoints; i++) {
      // Use actual current value from the metric card as the base
      const baseValue = currentValue;

      // Generate variance around the actual value (still mock time-series, but aligned with card)
      const variancePercent = metricName === 'successRate' ? 0.02 : 0.15; // Less variance for success rate
      const variance = baseValue * variancePercent;
      const sineWave = Math.sin(i / 3) * variance;
      const randomNoise = (Math.random() - 0.5) * variance * 0.5;
      let value = baseValue + sineWave + randomNoise;
      
      // Clamp success rate to valid range (0-100)
      if (metricName === 'successRate') {
        value = Math.max(0, Math.min(100, value));
      }

      // Calculate date going backwards from now
      const date = new Date(now);
      if (timePeriod === '1d') {
        date.setHours(now.getHours() - (dataPoints - i - 1));
      } else {
        date.setDate(now.getDate() - (dataPoints - i - 1));
      }

      data.push({
        time: i,
        date: date,
        value: parseFloat(value.toFixed(4))
      });
    }
    
    return data;
  };

  const data = generateData();

  // NOTE: All labels include "(Mock Data)" since charts use generated mock data
  const metricLabels: Record<string, string> = {
    sessions: 'Sessions (Mock Data)',
    agentInvocations: 'Agent Invocations (Mock Data)',
    costVsBudget: 'Cost (Mock Data)',
    avgLatency: 'Latency (Mock Data)',
    avgCostPerSession: 'Cost/Session (Mock Data)',
    successRate: 'Success Rate (Mock Data)'
  };

  const formatValue = (value: number) => {
    switch (metricName) {
      case 'costVsBudget':
      case 'avgCostPerSession':
        return `$${value.toFixed(4)}`;
      case 'avgLatency':
        return `${value.toFixed(2)}s`;
      case 'successRate':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const formatDate = (date: Date) => {
    if (timePeriod === '1d') {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
    } else if (timePeriod === '1yr' || timePeriod === 'Max') {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Calculate tick interval to avoid overflow
  const getTickInterval = () => {
    const dataLength = data.length;
    if (timePeriod === '1d') return Math.ceil(dataLength / 6); // ~6 ticks for 24 hours
    if (timePeriod === '1mo') return Math.ceil(dataLength / 6); // ~6 ticks for 30 days
    if (timePeriod === '3mo') return Math.ceil(dataLength / 6); // ~6 ticks for 90 days
    if (timePeriod === '1yr') return Math.ceil(dataLength / 12); // ~12 ticks for 365 days
    return Math.ceil(dataLength / 12); // ~12 ticks for Max
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ADC4C2] p-6">
          <h3 className="text-[#000F0C]">{metricLabels[metricName]}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F0FFFC] rounded transition-colors"
          >
            <X className="w-5 h-5 text-[#53706C]" />
          </button>
        </div>

        {/* Chart */}
        <div className="p-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ADC4C2" />
                <XAxis
                  dataKey="time"
                  stroke="#53706C"
                  tick={{ fontSize: 12 }}
                  interval={getTickInterval()}
                  tickFormatter={(value) => {
                    const dataPoint = data[value];
                    return dataPoint ? formatDate(dataPoint.date) : '';
                  }}
                />
                <YAxis
                  stroke="#53706C"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatValue}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ADC4C2',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  labelFormatter={(value) => {
                    const dataPoint = data[value as number];
                    return dataPoint ? formatDate(dataPoint.date) : '';
                  }}
                  formatter={(value: number) => [formatValue(value), metricLabels[metricName]]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#53706C"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
