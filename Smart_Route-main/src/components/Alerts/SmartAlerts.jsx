import React from "react";
import { Sparkles, Leaf, Fuel } from "lucide-react";

const SmartAlerts = ({ savings }) => {
  if (!savings || (savings.totalFuelSaved === "0.00" && savings.totalCO2Saved === "0.00")) {
    return null;
  }

  const { totalFuelSaved = "0.00", totalCO2Saved = "0.00" } = savings;

  return (
    <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 animate-fadeIn">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider font-bold text-emerald-400">
            Efficiency Optimization Active
          </div>
          <div className="text-sm font-semibold text-emerald-200">
            Route restructuring successfully reduced travel latency!
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/40 border border-emerald-700/50 font-bold">
          <Fuel className="w-3.5 h-3.5 text-emerald-400" />
          ₹{totalFuelSaved} Saved
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-900/40 border border-teal-700/50 font-bold">
          <Leaf className="w-3.5 h-3.5 text-teal-400" />
          {totalCO2Saved} kg CO₂ Offset
        </span>
      </div>
    </div>
  );
};

export default SmartAlerts;