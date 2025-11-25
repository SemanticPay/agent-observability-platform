import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { TrendingUp, Zap } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface ThroughputData {
  time: string;
  operations: number;
  decisions: number;
}

const generateData = () => {
  const data: ThroughputData[] = [];
  const now = Date.now();
  
  for (let i = 30; i >= 0; i--) {
    const time = new Date(now - i * 60000);
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      operations: 600 + Math.random() * 300,
      decisions: 400 + Math.random() * 200,
    });
  }
  
  return data;
};

export function SystemThroughput() {
  const [data, setData] = useState<ThroughputData[]>(generateData());
  const [peakOps, setPeakOps] = useState(847);
  const [avgOps, setAvgOps] = useState(724);

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [...prev.slice(1)];
        const now = new Date();
        newData.push({
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          operations: 600 + Math.random() * 300,
          decisions: 400 + Math.random() * 200,
        });
        return newData;
      });
      
      setPeakOps(800 + Math.floor(Math.random() * 100));
      setAvgOps(700 + Math.floor(Math.random() * 50));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="bg-white border-slate-200 p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg text-slate-900 tracking-tight">System Throughput</h3>
          <p className="text-sm text-slate-600 mt-1">Real-time operations monitoring</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-slate-500">Peak: </span>
            <span className="text-blue-600">{peakOps} ops/s</span>
          </div>
          <div>
            <span className="text-slate-500">Avg: </span>
            <span className="text-emerald-600">{avgOps} ops/s</span>
          </div>
        </div>
      </div>

      <div className="h-[300px] mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="opsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="decisionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              stroke="rgb(148, 163, 184)" 
              fontSize={11}
              tickLine={false}
            />
            <YAxis 
              stroke="rgb(148, 163, 184)" 
              fontSize={11}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid rgb(226, 232, 240)',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: 'rgb(15, 23, 42)' }}
            />
            <Area
              type="monotone"
              dataKey="operations"
              stroke="rgb(59, 130, 246)"
              strokeWidth={2}
              fill="url(#opsGradient)"
              name="Operations"
            />
            <Area
              type="monotone"
              dataKey="decisions"
              stroke="rgb(99, 102, 241)"
              strokeWidth={2}
              fill="url(#decisionsGradient)"
              name="Decisions"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Operations</div>
          <div className="text-xl text-blue-600 tracking-tight">{(avgOps * 3600 / 1000).toFixed(1)}M</div>
          <div className="text-xs text-slate-600 mt-1">per hour</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Total Decisions</div>
          <div className="text-xl text-indigo-600 tracking-tight">{((avgOps * 0.6) * 3600 / 1000).toFixed(1)}M</div>
          <div className="text-xs text-slate-600 mt-1">per hour</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Efficiency Rate</div>
          <div className="text-xl text-emerald-600 tracking-tight">94.2%</div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <div className="text-xs text-emerald-600">+2.1%</div>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Active Streams</div>
          <div className="text-xl text-amber-600 tracking-tight">51</div>
          <div className="text-xs text-slate-600 mt-1">data channels</div>
        </div>
      </div>
    </Card>
  );
}
