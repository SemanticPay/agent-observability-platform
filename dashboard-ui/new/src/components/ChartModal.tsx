import { X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface ChartModalProps {
  metricName: string;
  onClose: () => void;
  timePeriod: string;
}

export function ChartModal({ metricName, onClose, timePeriod }: ChartModalProps) {
  // Generate mock time series data
  const generateData = () => {
    const dataPoints = timePeriod === '1d' ? 24 : timePeriod === '1mo' ? 30 : timePeriod === '3mo' ? 90 : timePeriod === '1yr' ? 365 : 730;
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < dataPoints; i++) {
      const baseValue = {
        sessions: 12000,
        agentInvocations: 45000,
        costVsBudget: 800,
        avgLatency: 1.2,
        avgCostPerSession: 0.07,
        successRate: 98
      }[metricName] || 0;

      // Create more variation with sine wave + random noise
      const variance = baseValue * 0.15;
      const sineWave = Math.sin(i / 3) * variance;
      const randomNoise = (Math.random() - 0.5) * variance * 0.5;
      const value = baseValue + sineWave + randomNoise;

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
        value: parseFloat(value.toFixed(2))
      });
    }
    
    return data;
  };

  const data = generateData();

  const metricLabels: Record<string, string> = {
    sessions: 'Sessions',
    agentInvocations: 'Agent Invocations',
    costVsBudget: 'Cost',
    avgLatency: 'Latency',
    avgCostPerSession: 'Cost/Session',
    successRate: 'Success Rate'
  };

  const formatValue = (value: number) => {
    switch (metricName) {
      case 'costVsBudget':
      case 'avgCostPerSession':
        return `$${value.toFixed(2)}`;
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