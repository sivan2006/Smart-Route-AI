import React from "react";
import { Package, Layers, Sparkles, ArrowRight, MapPin } from "lucide-react";

const ConsolidationSuggestions = ({ orders = [] }) => {
  // Group stops by Chennai locality / zone clusters
  const clusters = {
    "Central Hub (T. Nagar / Mylapore / Alwarpet)": [],
    "South Corridor (Velachery / Adyar / Besant Nagar)": [],
    "OMR IT Corridor (Thoraipakkam / Sholinganallur)": [],
    "North & West Corridor (Anna Nagar / Kilpauk / Porur)": [],
  };

  orders.forEach((o) => {
    const z = (o.zone || "").toLowerCase();
    if (z.includes("t. nagar") || z.includes("mylapore") || z.includes("alwarpet") || z.includes("royapettah") || z.includes("nungambakkam") || z.includes("saidapet")) {
      clusters["Central Hub (T. Nagar / Mylapore / Alwarpet)"].push(o);
    } else if (z.includes("velachery") || z.includes("adyar") || z.includes("besant") || z.includes("kotturpuram") || z.includes("guindy")) {
      clusters["South Corridor (Velachery / Adyar / Besant Nagar)"].push(o);
    } else if (z.includes("omr") || z.includes("thoraipakkam") || z.includes("sholinganallur") || z.includes("tambaram")) {
      clusters["OMR IT Corridor (Thoraipakkam / Sholinganallur)"].push(o);
    } else {
      clusters["North & West Corridor (Anna Nagar / Kilpauk / Porur)"].push(o);
    }
  });

  const activeClusters = Object.entries(clusters).filter(([_, group]) => group.length > 0);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl my-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              AI Parcel Consolidation Bundles & Geographic Clusters
            </h3>
            <p className="text-xs text-slate-400">
              Multi-order grouping opportunities grouped by high-density delivery corridors
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          {activeClusters.length} Active Corridors
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeClusters.map(([clusterName, group], idx) => {
          const totalWeight = group.reduce((sum, o) => sum + (o.demand_kg || o.packageWeightKg || 2), 0).toFixed(1);
          const savedKm = ((group.length - 1) * 3.2).toFixed(1);

          return (
            <div
              key={idx}
              className="glass-card p-4 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-slate-100 text-xs sm:text-sm">{clusterName}</span>
                  </div>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-900/40 text-purple-300 font-bold border border-purple-700/50">
                    {group.length} Parcels ({totalWeight} kg)
                  </span>
                </div>

                <ul className="space-y-1.5">
                  {group.slice(0, 4).map((order, oIdx) => (
                    <li
                      key={order.id || oIdx}
                      className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-xl border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-purple-400" />
                        <span className="font-semibold text-slate-200">{order.customer_name || order.customerName}</span>
                      </div>
                      <span className="text-slate-400 font-medium">{order.zone}</span>
                    </li>
                  ))}
                  {group.length > 4 && (
                    <li className="text-[11px] text-slate-500 text-center py-1">
                      + {group.length - 4} more stops in this corridor
                    </li>
                  )}
                </ul>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-emerald-400 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" />
                  <span>Consolidation trip savings: ~{savedKm} km</span>
                </div>
                <span className="font-bold">₹{Math.round(savedKm * 3.5)} fuel cut</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConsolidationSuggestions;