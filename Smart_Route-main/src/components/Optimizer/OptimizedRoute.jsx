import React from "react";
import { Route, Clock, MapPin, CheckCircle, Navigation } from "lucide-react";
import { getDelaySeverity } from "../../utils/delayUtils";

const OptimizedRoute = ({ orders = [], etaCountdowns = {} }) => {
  if (!orders.length) return null;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl my-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Route className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              OR-Tools Optimized Stop Sequence
            </h3>
            <p className="text-xs text-slate-400">
              Capacity-constrained shortest travel sequence from Central Depot
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {orders.length} Scheduled Stops
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order, index) => {
          const stopNumber = order.optimizedOrder || index + 1;
          const severity = getDelaySeverity(order.estimatedDelay);
          const currentEta = etaCountdowns[order.id] ?? order.estimatedDelay;

          return (
            <div
              key={order.id}
              className="glass-card p-4 rounded-xl border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-md">
                      #{stopNumber}
                    </span>
                    <span className="font-semibold text-slate-100 text-sm group-hover:text-indigo-300 transition-colors">
                      {order.customerName}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      severity === "red"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : severity === "orange"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {severity === "red" ? "Risk" : severity === "orange" ? "Moderate" : "On-Time"}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-400 mt-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{order.zone} ({order.distance} km)</span>
                  </div>
                  <div className="truncate text-slate-400 pl-5">
                    {order.address}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>ETA: {currentEta} mins</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-slate-500" />
                  <span>Risk Score: {order.riskScore ?? 0}/100</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OptimizedRoute;
