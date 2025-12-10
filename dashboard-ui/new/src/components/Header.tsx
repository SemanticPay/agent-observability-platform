import logoImage from 'figma:asset/7c2533028b1e7d7a6fc46f25ec9fab96e3dd9c2e.png';
import { Settings } from 'lucide-react';

interface HeaderProps {
  timePeriod: string;
  onTimePeriodChange: (value: string) => void;
}

export function Header({ timePeriod, onTimePeriodChange }: HeaderProps) {
  return (
    <header className="bg-white border-b border-[#ADC4C2]">
      <div className="max-w-[1400px] mx-auto px-8 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <img src={logoImage} alt="Phare" className="h-8" />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timePeriod}
            onChange={(e) => onTimePeriodChange(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#ADC4C2] rounded text-[#000F0C] text-sm cursor-pointer hover:border-[#53706C] focus:outline-none focus:ring-2 focus:ring-[#53706C] focus:border-transparent"
          >
            <option value="1d">Last 24 hours</option>
            <option value="1mo">Last 30 days</option>
            <option value="3mo">Last 3 months</option>
            <option value="1yr">Last year</option>
            <option value="Max">All time</option>
          </select>
          
          <button 
            className="p-1.5 text-[#53706C] hover:text-[#000F0C] hover:bg-[#F0FFFC] rounded transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}