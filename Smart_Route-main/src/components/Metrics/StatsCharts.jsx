import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  Cell,
} from "recharts";
import { BarChart3, TrendingDown, Fuel, Sparkles, Truck, Users } from "lucide-react";

const CustomDriverTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-2xl shadow-2xl text-xs text-slate-200 min-w-[180px]">
        <div className="font-bold text-slate-100 mb-2 border-b border-slate-800 pb-1">{label}</div>
        {payload.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center py-0.5">
            <span className="text-slate-400">{item.name}:</span>
            <span className="font-bold text-slate-100" style={{ color: item.color }}>
              {item.value} {item.unit || ""}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const StatsCharts = ({ orders = [], driverRoutes = [] }) => {
  // Aggregate data from driverRoutes or fallback to orders
  const driverChartData = (driverRoutes && driverRoutes.length > 0
    ? driverRoutes.filter((d) => d.stops_count > 0)
    : [
        { driver_name: "Murugavel (Van)", distance_km: 18.5, stops_count: 4, fuel_saved_inr: 450, color: "#3b82f6" },
        { driver_name: "Karthikeyan (Bike)", distance_km: 12.0, stops_count: 4, fuel_saved_inr: 280, color: "#10b981" },
        { driver_name: "Senthil (Bike)", distance_km: 14.2, stops_count: 4, fuel_saved_inr: 320, color: "#f59e0b" },
        { driver_name: "Saravanan (Bike)", distance_km: 11.5, stops_count: 4, fuel_saved_inr: 260, color: "#a855f7" },
        { driver_name: "Divya (Van)", distance_km: 21.0, stops_count: 4, fuel_saved_inr: 520, color: "#f43f5e" },
      ]
  ).map((d) => ({
    name: d.driver_name.split("(")[0].trim(),
    fullName: d.driver_name,
    distance_km: Number(d.distance_km || 0),
    stops_count: Number(d.stops_count || 0),
    fuel_saved_inr: Number(d.fuel_saved_inr || 0),
    baseline_km: Number(d.baseline_distance_km || d.distance_km * 1.5),
    utilization_pct: Number(d.utilization_pct || 65),
    color: d.color || "#6366f1",
  }));

  // Zone delivery distribution
  const zoneCounts = {};
  orders.forEach((o) => {
    const z = o.zone || "Central";
    zoneCounts[z] = (zoneCounts[z] || 0) + 1;
  });
  const zoneChartData = Object.entries(zoneCounts)
    .map(([zone, count]) => ({ zone, count }))
    .slice(0, 7);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
      {/* Chart 1: Driver Workload & Mileage Comparison */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Driver Workload & Travel Mileage</h3>
              <p className="text-xs text-slate-400">Total distance (km) & assigned stops per driver</p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
            OR-Tools CVRP
          </span>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={driverChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip content={<CustomDriverTooltip />} />
              <Bar dataKey="distance_km" name="Route Distance" unit="km" radius={[6, 6, 0, 0]}>
                {driverChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Fuel Cost Saved per Driver */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Fuel Cost Cut (₹) per Driver</h3>
              <p className="text-xs text-slate-400">Money saved by eliminating empty deadheads & backtracking</p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Direct Cost Cut
          </span>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={driverChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <Tooltip content={<CustomDriverTooltip />} />
              <Bar dataKey="fuel_saved_inr" name="Fuel Saved" unit="₹" fill="#10b981" radius={[6, 6, 0, 0]}>
                {driverChartData.map((entry, index) => (
                  <Cell key={`cell-fuel-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StatsCharts;
