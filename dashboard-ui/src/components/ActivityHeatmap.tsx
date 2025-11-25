import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Calendar, TrendingUp } from "lucide-react";

interface HeatmapCell {
  hour: number;
  day: string;
  value: number;
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 24 }, (_, i) => i);

const generateHeatmapData = (): HeatmapCell[] => {
  const data: HeatmapCell[] = [];
  days.forEach((day) => {
    hours.forEach((hour) => {
      // Simulate higher activity during business hours (9-17)
      const baseValue = hour >= 9 && hour <= 17 ? 60 : 20;
      data.push({
        hour,
        day,
        value: baseValue + Math.random() * 40,
      });
    });
  });
  return data;
};

export function ActivityHeatmap() {
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>(generateHeatmapData());
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeatmapData((prev) =>
        prev.map((cell) => ({
          ...cell,
          value: Math.max(0, Math.min(100, cell.value + (Math.random() - 0.5) * 10)),
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getColor = (value: number) => {
    if (value > 80) return "bg-blue-600";
    if (value > 60) return "bg-blue-500";
    if (value > 40) return "bg-blue-400";
    if (value > 20) return "bg-blue-300";
    return "bg-slate-200";
  };

  const peakHour = heatmapData.reduce((max, cell) =>
    cell.value > max.value ? cell : max
  );

  const avgActivity = heatmapData.reduce((sum, cell) => sum + cell.value, 0) / heatmapData.length;

  return (
    <Card className="bg-white border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-blue-600" />
        <div>
          <h3 className="text-lg text-slate-900 tracking-tight">Activity Heatmap</h3>
          <p className="text-sm text-slate-600 mt-1">Weekly agent activity patterns</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex gap-1 mb-1.5">
          <div className="w-10"></div>
          {[0, 6, 12, 18].map((hour) => (
            <div
              key={hour}
              className="flex-1 text-xs text-slate-500 text-center"
            >
              {hour}h
            </div>
          ))}
        </div>
        {days.map((day, dayIndex) => (
          <div key={day} className="flex gap-1 mb-0.5">
            <div className="w-10 text-xs text-slate-600 flex items-center">
              {day}
            </div>
            <div className="flex-1 flex gap-0.5">
              {hours.map((hour) => {
                const cell = heatmapData.find(
                  (c) => c.day === day && c.hour === hour
                );
                return (
                  <motion.div
                    key={`${day}-${hour}`}
                    className={`flex-1 h-5 rounded-sm cursor-pointer transition-all ${getColor(
                      cell?.value || 0
                    )}`}
                    whileHover={{ scale: 1.2, zIndex: 10 }}
                    onClick={() => setSelectedCell(cell || null)}
                    title={`${day} ${hour}:00 - Activity: ${cell?.value.toFixed(0)}%`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-slate-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-300 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-400 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-sm"></div>
        </div>
        <span>More</span>
      </div>

      {selectedCell && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="text-xs text-slate-600 mb-1">
            {selectedCell.day} at {selectedCell.hour}:00
          </div>
          <div className="text-lg text-blue-600 tracking-tight">
            {selectedCell.value.toFixed(0)}% activity
          </div>
        </motion.div>
      )}
    </Card>
  );
}
