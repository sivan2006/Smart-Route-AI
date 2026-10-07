import React, { useState, useEffect, useMemo } from "react";
import mockOrders from "../../utils/mockOrders";
import { applyEmergencyMode, applyFestivalMode, getDelaySeverity } from "../../utils/delayUtils";
import { predictDelay } from "../../utils/delayPredictors";
import { computeRiskScore } from "../../utils/riskScorer";
import { optimizeMultiDriverRoutes, predictOrderEtas } from "../../services/aiService";
import DeliveryMap from "../Map/DeliveryMap";
import StatsCharts from "../Metrics/StatsCharts";
import SmartAlerts from "../Alerts/SmartAlerts";
import CostCuttingROI from "../Metrics/CostCuttingROI";
import ConsolidationSuggestions from "../Optimizer/ConsolidationSuggestions";
import FloatingChatbot from "../Chatbot/FloatingChatbot";
import DataUploaderModal from "../Upload/DataUploaderModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Zap,
  AlertTriangle,
  Sparkles,
  Download,
  Search,
  Filter,
  Fuel,
  Leaf,
  Clock,
  Package,
  CheckCircle,
  RefreshCw,
  Layers,
  Activity,
  WifiOff,
  UploadCloud,
  Truck,
  Users,
} from "lucide-react";

// Default Amazon Driver Fleet for initial launch
const DEFAULT_DRIVERS = [
  { driver_id: "AMZ_DRV_015", driver_name: "Rohan Deshmukh (Van)", vehicle_type: "van", capacity_kg: 300, speed_kmh: 40, color: "#6366f1" },
  { driver_id: "AMZ_DRV_001", driver_name: "Karthikeyan (Bike)", vehicle_type: "bike", capacity_kg: 45, speed_kmh: 38, color: "#10b981" },
  { driver_id: "AMZ_DRV_004", driver_name: "Saravanan (Bike)", vehicle_type: "bike", capacity_kg: 45, speed_kmh: 38, color: "#f59e0b" },
  { driver_id: "AMZ_DRV_021", driver_name: "Meenakshi (Van)", vehicle_type: "van", capacity_kg: 300, speed_kmh: 40, color: "#f43f5e" },
];

const Dashboard = () => {
  const [orders, setOrders] = useState(mockOrders);
  const [drivers, setDrivers] = useState(DEFAULT_DRIVERS);
  const [multiDriverResult, setMultiDriverResult] = useState(null);
  const [currentMode, setCurrentMode] = useState("normal");
  const [activeWeather, setActiveWeather] = useState("sunny"); // 'sunny' | 'stormy' | 'fog' | 'cloudy' | 'windy'
  const [etaCountdowns, setEtaCountdowns] = useState({});
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState("ALL");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Online / Offline listener
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Multi-Driver Routing & ETA Loader
  const runMultiDriverOptimization = async (
    currentOrders = orders,
    currentDrivers = drivers,
    mode = currentMode,
    weather = activeWeather
  ) => {
    setIsLoading(true);
    const isFestivalDay = mode === "festival";

    try {
      // 1. Predict ETAs with XGBoost using live Weather conditions
      const predictions = await predictOrderEtas(currentOrders, isFestivalDay, weather);
      let enriched = currentOrders.map((order, index) => {
        const estimatedDelay = predictions[index] || order.estimatedDelay || 15;
        return {
          ...order,
          weather,
          estimatedDelay,
          riskScore: computeRiskScore(order.zone, estimatedDelay),
        };
      });

      if (mode === "emergency") {
        enriched = applyEmergencyMode(enriched, "T. Nagar");
      }

      // 2. Solve Multi-Vehicle VRP with OR-Tools
      const result = await optimizeMultiDriverRoutes(enriched, currentDrivers);
      setMultiDriverResult(result);

      // Flatten assigned stops in optimal sequence
      const flattenedStops = result.driver_routes.flatMap((r) =>
        r.assigned_stops.map((s) => ({
          ...s,
          assignedDriverName: r.driver_name,
          assignedDriverColor: r.color,
          assignedVehicleType: r.vehicle_type,
        }))
      );

      const finalOrders = flattenedStops.length > 0 ? flattenedStops : enriched;
      setOrders(finalOrders);
      localStorage.setItem("cachedOrders", JSON.stringify(finalOrders));
    } catch (error) {
      console.warn("FastAPI service unreachable; running offline heuristic partitioning.", error);
      // Fallback simple allocation
      const weatherPenalty = weather === "stormy" ? 1.4 : weather === "fog" ? 1.25 : weather === "windy" ? 1.15 : 1.0;
      const enriched = currentOrders.map((order) => {
        const delay = Math.round(predictDelay(order.zone, order.distance, isFestivalDay) * weatherPenalty);
        return {
          ...order,
          weather,
          estimatedDelay: delay,
          riskScore: computeRiskScore(order.zone, delay),
        };
      });

      const chunk = Math.ceil(enriched.length / currentDrivers.length);
      const fallbackRoutes = currentDrivers.map((d, i) => {
        const slice = enriched.slice(i * chunk, (i + 1) * chunk);
        const dist = slice.reduce((sum, o) => sum + o.distance, 0);
        return {
          driver_id: d.driver_id,
          driver_name: d.driver_name,
          vehicle_type: d.vehicle_type,
          color: d.color,
          capacity_kg: d.capacity_kg,
          total_load_kg: slice.reduce((sum, o) => sum + (o.packageWeightKg || 2), 0),
          utilization_pct: 65.0,
          stops_count: slice.length,
          assigned_stops: slice,
          distance_km: dist,
          baseline_distance_km: +(dist * 1.4).toFixed(1),
          distance_saved_km: +(dist * 0.4).toFixed(1),
          fuel_saved_inr: +(dist * 0.4 * 3.5).toFixed(1),
          co2_saved_kg: +(dist * 0.4 * 0.12).toFixed(1),
          estimated_trip_hours: +(dist / 35).toFixed(1),
        };
      });

      setMultiDriverResult({
        solver: "offline-fallback-cvrp",
        total_optimized_distance_km: enriched.reduce((sum, o) => sum + o.distance, 0),
        total_baseline_distance_km: +(enriched.reduce((sum, o) => sum + o.distance, 0) * 1.4).toFixed(1),
        total_distance_saved_km: +(enriched.reduce((sum, o) => sum + o.distance, 0) * 0.4).toFixed(1),
        total_fuel_saved_inr: +(enriched.reduce((sum, o) => sum + o.distance, 0) * 0.4 * 3.5).toFixed(1),
        total_co2_saved_kg: +(enriched.reduce((sum, o) => sum + o.distance, 0) * 0.4 * 0.12).toFixed(1),
        fleet_efficiency_gain_pct: 28.5,
        driver_routes: fallbackRoutes,
      });
      setOrders(enriched);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runMultiDriverOptimization(orders, drivers, currentMode);
  }, [currentMode]);

  // Handle uploaded datasets
  const handleApplyCustomData = ({ orders: newOrders, drivers: newDrivers }) => {
    const updatedOrders = newOrders || orders;
    const updatedDrivers = newDrivers || drivers;
    if (newOrders) setOrders(updatedOrders);
    if (newDrivers) setDrivers(updatedDrivers);
    runMultiDriverOptimization(updatedOrders, updatedDrivers, currentMode);
  };

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("OptiRoute AI • Multi-Driver Dispatch Manifest", 14, 18);
    doc.setFontSize(10);
    doc.text(
      `Generated: ${new Date().toLocaleString()} | Mode: ${currentMode.toUpperCase()} | Active Fleet: ${drivers.length} Drivers`,
      14,
      25
    );

    const tableData = orders.map((o, i) => [
      o.stop_sequence || o.optimizedOrder || i + 1,
      o.customer_name || o.customerName,
      o.assignedDriverName || "Fleet Driver",
      o.zone,
      o.address,
      `${o.distance || 5} km`,
      `${o.estimatedDelay || 15} min`,
      getDelaySeverity(o.estimatedDelay || 15).toUpperCase(),
    ]);

    autoTable(doc, {
      head: [["Stop #", "Customer", "Assigned Driver", "Zone", "Address", "Distance", "ETA", "Status"]],
      body: tableData,
      startY: 32,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
    });

    doc.save(`multi_driver_manifest_${Date.now()}.pdf`);
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const cName = (order.customer_name || order.customerName || "").toLowerCase();
      const zName = (order.zone || "").toLowerCase();
      const dName = (order.assignedDriverName || "").toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch = cName.includes(query) || zName.includes(query) || dName.includes(query);
      const matchesZone = selectedZone === "ALL" || order.zone === selectedZone;

      const severity = getDelaySeverity(order.estimatedDelay || 15);
      const matchesRisk =
        selectedRisk === "ALL" ||
        (selectedRisk === "RISK" && severity === "red") ||
        (selectedRisk === "MODERATE" && severity === "orange") ||
        (selectedRisk === "ONTIME" && severity === "green");

      return matchesSearch && matchesZone && matchesRisk;
    });
  }, [orders, searchQuery, selectedZone, selectedRisk]);

  const uniqueZones = useMemo(() => {
    return ["ALL", ...new Set(orders.map((o) => o.zone).filter(Boolean))];
  }, [orders]);

  const depotCoords = useMemo(() => {
    if (orders.length > 0) {
      const first = orders[0];
      const sLat = first.storeLat || first.store_latitude || first.lat || first.latitude;
      const sLon = first.storeLon || first.store_longitude || first.lng || first.longitude;
      if (sLat && sLon && sLon > 80.0) {
        return [13.0067, 80.2033]; // Central Chennai Hub (Guindy)
      }
    }
    return [12.9716, 77.5946]; // Central Bengaluru Hub (MG Road)
  }, [orders]);

  return (
    <div className="w-full text-slate-100 animate-fadeIn space-y-6">
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="glass-panel p-3 rounded-xl border border-amber-500/40 bg-amber-950/30 text-amber-300 flex items-center gap-2 text-xs">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span><strong>Offline Operating Mode:</strong> Running local heuristics.</span>
        </div>
      )}

      {/* Top Operations Header */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left: Mode Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCurrentMode("normal")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              currentMode === "normal"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40"
                : "glass-card text-slate-300 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Normal Mode
          </button>

          <button
            onClick={() => setCurrentMode("emergency")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              currentMode === "emergency"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30 border border-red-400/40 animate-pulse"
                : "glass-card text-slate-300 hover:text-red-400"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Emergency Reroute
          </button>

          <button
            onClick={() => {
              setCurrentMode("festival");
              runMultiDriverOptimization(orders, drivers, "festival", activeWeather);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              currentMode === "festival"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-400/40"
                : "glass-card text-slate-300 hover:text-amber-400"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Festival Mode
          </button>
        </div>

        {/* Live Weather Simulator Bar */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-2xl border border-slate-800">
          <span className="text-[11px] text-slate-400 font-semibold px-2">Live Weather:</span>
          <button
            onClick={() => {
              setActiveWeather("sunny");
              runMultiDriverOptimization(orders, drivers, currentMode, "sunny");
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              activeWeather === "sunny"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Clear Skies / Normal Traffic"
          >
            ☀️ Sunny (32°C)
          </button>

          <button
            onClick={() => {
              setActiveWeather("stormy");
              runMultiDriverOptimization(orders, drivers, currentMode, "stormy");
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              activeWeather === "stormy"
                ? "bg-blue-600/30 text-blue-300 border border-blue-500/50 shadow-sm animate-pulse"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Heavy Storm & Rain (+35% XGBoost Delay Surge)"
          >
            🌧️ Rain/Storm (26°C)
          </button>

          <button
            onClick={() => {
              setActiveWeather("fog");
              runMultiDriverOptimization(orders, drivers, currentMode, "fog");
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              activeWeather === "fog"
                ? "bg-slate-700/60 text-slate-200 border border-slate-500/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
            title="Dense Fog / Low Visibility"
          >
            🌫️ Fog (22°C)
          </button>
        </div>

        {/* Right: Upload & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition transform hover:scale-105"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Orders / Fleet CSV</span>
          </button>

          <button
            onClick={() => runMultiDriverOptimization(orders, drivers, currentMode)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-card text-slate-200 hover:text-white text-xs font-semibold hover:border-indigo-500/40 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Optimizing..." : "Re-Optimize"}
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Cost-Cutting & ROI Analytics Panel */}
      <CostCuttingROI multiDriverResult={multiDriverResult} />

      {/* Multi-Driver Live Map */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">
              Multi-Driver Live Dispatch Map {orders[0]?.lng > 80.0 ? "(Chennai Fleet Hub)" : "(Bengaluru Hub)"}
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {multiDriverResult?.drivers_allocated || drivers.length} Active Vehicles Allocated
          </span>
        </div>
        <DeliveryMap
          orders={orders}
          driverRoutes={multiDriverResult?.driver_routes || []}
          depotCoords={depotCoords}
        />
      </div>

      {/* Analytics Charts */}
      <StatsCharts
        orders={orders}
        driverRoutes={multiDriverResult?.driver_routes || []}
      />

      {/* AI Consolidation */}
      <ConsolidationSuggestions orders={orders} />

      {/* Searchable Orders & Fleet Allocation Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Assigned Deliveries & Manifest</h3>
            <p className="text-xs text-slate-400">
              Stop-by-stop schedule partitioned by driver capacity
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer, zone, driver..."
                className="bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
              />
            </div>

            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              {uniqueZones.map((z) => (
                <option key={z} value={z}>
                  {z === "ALL" ? "All Zones" : z}
                </option>
              ))}
            </select>

            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="ONTIME">🟢 On-Time (&le;10m)</option>
              <option value="MODERATE">🟠 Moderate (&le;20m)</option>
              <option value="RISK">🔴 High Risk (&gt;20m)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Stop #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Assigned Driver</th>
                <th className="px-4 py-3">Zone & Address</th>
                <th className="px-4 py-3">Category & Demand</th>
                <th className="px-4 py-3">Predicted ETA</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No delivery records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const seqNum = order.stop_sequence || order.optimizedOrder || idx + 1;
                  const severity = getDelaySeverity(order.estimatedDelay || 15);
                  const driverColor = order.assignedDriverColor || "#6366f1";

                  return (
                    <tr key={order.id || idx} className="hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3.5">
                        <span
                          className="w-6 h-6 rounded-full text-white font-bold flex items-center justify-center text-xs shadow-sm"
                          style={{ backgroundColor: driverColor }}
                        >
                          {seqNum}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-100">
                        {order.customer_name || order.customerName}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: driverColor }}
                          ></span>
                          <span className="font-semibold text-slate-200">
                            {order.assignedDriverName || "Fleet Driver"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-200 font-medium">{order.zone}</div>
                        <div className="text-slate-500 text-[11px] truncate max-w-xs">{order.address}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-300 font-medium">{order.category || "General"}</div>
                        <div className="text-slate-500 text-[11px]">{order.demand_kg || order.packageWeightKg || 2} kg</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{order.estimatedDelay || 15} mins</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            severity === "red"
                              ? "bg-red-500/10 text-red-400 border border-red-500/30"
                              : severity === "orange"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {severity === "red" ? "High Risk" : severity === "orange" ? "Moderate" : "On Time"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <DataUploaderModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onApplyData={handleApplyCustomData}
      />

      {/* AI Chatbot */}
      <FloatingChatbot
        orders={orders}
        multiDriverResult={multiDriverResult}
        currentMode={currentMode}
      />
    </div>
  );
};

export default Dashboard;
