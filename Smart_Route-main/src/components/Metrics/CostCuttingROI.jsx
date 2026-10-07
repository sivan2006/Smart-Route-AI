import React from "react";
import {
  DollarSign,
  TrendingDown,
  Fuel,
  Clock,
  Leaf,
  Truck,
  Package,
  Award,
  ChevronRight,
} from "lucide-react";

const CostCuttingROI = ({ multiDriverResult }) => {
  if (!multiDriverResult || !multiDriverResult.driver_routes) return null;

  const {
    total_distance_saved_km = 0,
    total_fuel_saved_inr = 0,
    total_co2_saved_kg = 0,
    fleet_efficiency_gain_pct = 0,
    total_optimized_distance_km = 0,
    total_baseline_distance_km = 0,
    driver_routes = [],
  } = multiDriverResult;

  return (
    <div className="space-y-6 my-6">
      {/* Hero ROI Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-purple-950/40 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5" />
                {fleet_efficiency_gain_pct}% Cost & Mileage Cut
              </span>
              <span className="text-xs text-slate-400">Google OR-Tools Multi-Vehicle VRP</span>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-100">
              Fleet Cost-Cutting & Operations ROI
            </h3>
            <p className="text-xs text-slate-400 max-w-xl mt-1">
              Real-time savings achieved by optimizing capacity constraints, eliminate driver backtracking, and grouping deliveries by geographic corridor.
            </p>
          </div>

          {/* Big Savings Value */}
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 text-right shrink-0 shadow-xl">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Fleet Fuel Saved
            </div>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">
              ₹{total_fuel_saved_inr.toLocaleString()}
            </div>
            <div className="text-[11px] text-teal-300 font-medium mt-1">
              {total_distance_saved_km} km eliminated
            </div>
          </div>
        </div>

        {/* 4 Cost KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="glass-card p-3.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-emerald-400" />
              Fuel Saved
            </div>
            <div className="text-lg font-bold text-slate-100 mt-1">₹{total_fuel_saved_inr}</div>
            <div className="text-[10px] text-emerald-400">Calculated on fleet mileage</div>
          </div>

          <div className="glass-card p-3.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-indigo-400" />
              Distance Cut
            </div>
            <div className="text-lg font-bold text-slate-100 mt-1">-{total_distance_saved_km} km</div>
            <div className="text-[10px] text-slate-400">From {total_baseline_distance_km} km baseline</div>
          </div>

          <div className="glass-card p-3.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-teal-400" />
              CO₂ Mitigated
            </div>
            <div className="text-lg font-bold text-teal-300 mt-1">{total_co2_saved_kg} kg</div>
            <div className="text-[10px] text-teal-400">Fleet carbon footprint offset</div>
          </div>

          <div className="glass-card p-3.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-400" />
              Fleet Efficiency
            </div>
            <div className="text-lg font-bold text-purple-300 mt-1">+{fleet_efficiency_gain_pct}%</div>
            <div className="text-[10px] text-purple-400">Optimal multi-vehicle load</div>
          </div>
        </div>
      </div>

      {/* Driver-by-Driver Breakdown Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-400" />
            Individual Driver Route & Payload Breakdown
          </h4>
          <span className="text-xs text-slate-400">
            {driver_routes.filter((d) => d.stops_count > 0).length} Active Drivers Dispatched
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {driver_routes
            .filter((d) => d.stops_count > 0)
            .map((driver, idx) => (
              <div
                key={driver.driver_id || idx}
                className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div>
                  {/* Driver Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-8 rounded-full shadow-md"
                        style={{ backgroundColor: driver.color }}
                      ></div>
                      <div>
                        <div className="font-bold text-slate-100 text-sm">{driver.driver_name}</div>
                        <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                          {driver.vehicle_type} • ID #{driver.driver_id}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 font-bold border border-slate-700">
                      {driver.stops_count} Stops
                    </span>
                  </div>

                  {/* Load Utilization Bar */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Payload Load</span>
                      <span className="font-semibold text-slate-200">
                        {driver.total_load_kg} / {driver.capacity_kg} kg ({driver.utilization_pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${driver.utilization_pct}%`,
                          backgroundColor: driver.color,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Distance & Trip Time */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-3">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Shortest Route</span>
                      <span className="font-bold text-slate-100">{driver.distance_km} km</span>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Est. Trip Duration</span>
                      <span className="font-bold text-slate-100">{driver.estimated_trip_hours} hrs</span>
                    </div>
                  </div>
                </div>

                {/* Driver Savings Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Fuel Cost Cut:</span>
                  <span className="font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
                    ₹{driver.fuel_saved_inr} saved
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CostCuttingROI;
