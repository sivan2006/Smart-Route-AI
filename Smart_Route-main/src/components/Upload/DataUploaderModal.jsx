import React, { useState } from "react";
import Papa from "papaparse";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  X,
  Truck,
  Package,
  Sparkles,
  ArrowRight,
  MapPin,
} from "lucide-react";

const DataUploaderModal = ({ isOpen, onClose, onApplyData }) => {
  const [activeTab, setActiveTab] = useState("orders"); // 'orders' | 'drivers'
  const [ordersFile, setOrdersFile] = useState(null);
  const [parsedOrders, setParsedOrders] = useState([]);
  const [driversFile, setDriversFile] = useState(null);
  const [parsedDrivers, setParsedDrivers] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingPreset, setLoadingPreset] = useState(false);

  if (!isOpen) return null;

  const parseOrdersData = (raw) => {
    return raw
      .map((row, idx) => {
        const lat = parseFloat(
          row.Drop_Latitude || row.drop_lat || row.latitude || row.lat || row.Delivery_location_latitude
        );
        const lon = parseFloat(
          row.Drop_Longitude || row.drop_lon || row.longitude || row.lng || row.Delivery_location_longitude
        );
        const storeLat = parseFloat(row.Store_Latitude || row.store_lat || 13.0067);
        const storeLon = parseFloat(row.Store_Longitude || row.store_lon || 80.2033);

        if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) return null;

        const dlat = (lat - storeLat) * (Math.PI / 180);
        const dlon = (lon - storeLon) * (Math.PI / 180);
        const a =
          Math.sin(dlat / 2) ** 2 +
          Math.cos(storeLat * (Math.PI / 180)) *
            Math.cos(lat * (Math.PI / 180)) *
            Math.sin(dlon / 2) ** 2;
        const distKm = +(2 * 6371 * Math.asin(Math.sqrt(a))).toFixed(1);

        return {
          id: row.Order_ID || row.id || `ORD_${idx + 1}`,
          customerName: row.Customer_Name || row.customer_name || `Customer #${idx + 1}`,
          address: row.Address || row.address || `${row.Category || "Delivery"} Stop`,
          zone: row.Zone || row.zone || row.Area || "Chennai Hub",
          category: row.Category || row.category || "General",
          lat,
          lng: lon,
          storeLat,
          storeLon,
          distance: Math.max(distKm, 1.5),
          packageWeightKg: parseFloat(row.Package_Weight_Kg || row.weight || 2.0) || 2.0,
          demand_kg: parseFloat(row.Package_Weight_Kg || row.weight || 2.0) || 2.0,
          traffic: (row.Traffic || "medium").trim().toLowerCase(),
          weather: (row.Weather || "sunny").trim().toLowerCase(),
          estimatedDelay: Math.round(distKm * 2.2 + 8),
        };
      })
      .filter(Boolean);
  };

  const parseDriversData = (raw) => {
    const colors = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#a855f7", "#ec4899", "#84cc16"];
    return raw
      .map((row, idx) => {
        const driverId = row.driver_id || row.id || `DRV_${idx + 1}`;
        const name = row.driver_name || row.name || `Driver ${idx + 1}`;
        const vehicle = (row.vehicle_type || row.vehicle || "bike").toLowerCase();
        const cap = parseFloat(row.capacity_kg || (vehicle === "van" ? 300 : 45)) || 45;
        const speed = parseFloat(row.speed_kmh || (vehicle === "van" ? 40 : 35)) || 35;

        return {
          driver_id: driverId,
          driver_name: name,
          driver_phone: row.driver_phone || "+91-9876543210",
          vehicle_type: vehicle,
          capacity_kg: cap,
          speed_kmh: speed,
          hub_category: row.hub_category || "General",
          color: colors[idx % colors.length],
        };
      })
      .filter(Boolean);
  };

  const handleOrdersUpload = (file) => {
    if (!file) return;
    setOrdersFile(file);
    setErrorMsg("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const cleaned = parseOrdersData(results.data);
        if (cleaned.length === 0) {
          setErrorMsg("Could not find valid latitude/longitude coordinates in this orders CSV.");
          return;
        }
        setParsedOrders(cleaned.slice(0, 35));
      },
    });
  };

  const handleDriversUpload = (file) => {
    if (!file) return;
    setDriversFile(file);
    setErrorMsg("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const cleaned = parseDriversData(results.data);
        if (cleaned.length === 0) {
          setErrorMsg("Could not parse drivers from CSV.");
          return;
        }
        setParsedDrivers(cleaned.slice(0, 10));
      },
    });
  };

  // 1-Click Load Chennai Dataset Preset
  const handleLoadChennaiPreset = async () => {
    setLoadingPreset(true);
    setErrorMsg("");
    try {
      // 1. Fetch Chennai Orders
      const resOrders = await fetch("/templates/chennai_orders.csv");
      const textOrders = await resOrders.text();
      const parsedO = Papa.parse(textOrders, { header: true, skipEmptyLines: true });
      const cleanOrders = parseOrdersData(parsedO.data);

      // 2. Fetch Chennai Drivers
      const resDrivers = await fetch("/templates/chennai_drivers.csv");
      const textDrivers = await resDrivers.text();
      const parsedD = Papa.parse(textDrivers, { header: true, skipEmptyLines: true });
      const cleanDrivers = parseDriversData(parsedD.data);

      setParsedOrders(cleanOrders);
      setParsedDrivers(cleanDrivers);
      setOrdersFile({ name: "chennai_orders.csv (20 Delivery Stops)" });
      setDriversFile({ name: "chennai_drivers.csv (5 Dedicated Drivers)" });
    } catch (err) {
      setErrorMsg("Failed to load Chennai dataset preset: " + err.message);
    } finally {
      setLoadingPreset(false);
    }
  };

  const handleApply = () => {
    if (parsedOrders.length === 0 && parsedDrivers.length === 0) {
      setErrorMsg("Please upload at least an Orders CSV or Driver Fleet CSV (or load the Chennai preset).");
      return;
    }
    onApplyData({
      orders: parsedOrders.length > 0 ? parsedOrders : null,
      drivers: parsedDrivers.length > 0 ? parsedDrivers : null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-purple-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Upload Logistics Datasets
                <Sparkles className="w-4 h-4 text-purple-400" />
              </h3>
              <p className="text-xs text-slate-400">
                Upload customer manifests & driver rosters for multi-driver shortest path allocation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Chennai Preset Banner */}
        <div className="px-6 pt-4">
          <div className="glass-card p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-300">
                  Chennai Locality Dataset Preset Available
                </div>
                <div className="text-[11px] text-slate-400">
                  20 real stops (Adyar, T. Nagar, Anna Nagar, Velachery, OMR) & 5 Chennai fleet drivers
                </div>
              </div>
            </div>
            <button
              onClick={handleLoadChennaiPreset}
              disabled={loadingPreset}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition shrink-0"
            >
              {loadingPreset ? "Loading Chennai..." : "⚡ 1-Click Load Chennai"}
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition ${
              activeTab === "orders"
                ? "border-indigo-500 text-indigo-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Package className="w-4 h-4" />
            1. Customer Orders CSV
            {parsedOrders.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                {parsedOrders.length} Loaded
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("drivers")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition ${
              activeTab === "drivers"
                ? "border-emerald-500 text-emerald-400 bg-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Truck className="w-4 h-4" />
            2. Driver Fleet CSV
            {parsedDrivers.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                {parsedDrivers.length} Loaded
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === "orders" ? (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 bg-slate-950/40 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition group">
                <Upload className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 transition mb-3" />
                <div className="text-sm font-semibold text-slate-200">
                  {ordersFile ? ordersFile.name : "Click or drag & drop Orders CSV here"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Supports files from data/customer/ (chennai_orders.csv, amazon_delivery.csv) or custom orders
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleOrdersUpload(e.target.files[0])}
                />
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <a
                  href="/templates/chennai_orders.csv"
                  download="chennai_orders.csv"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Chennai Orders CSV Template
                </a>

                {parsedOrders.length > 0 && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {parsedOrders.length} valid delivery stops ready
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-950/40 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition group">
                <Truck className="w-10 h-10 text-slate-500 group-hover:text-emerald-400 transition mb-3" />
                <div className="text-sm font-semibold text-slate-200">
                  {driversFile ? driversFile.name : "Click or drag & drop Driver Fleet CSV here"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Supports files from data/driver/ (chennai_drivers.csv, drivers_fleet.csv) or custom fleet rosters
                </div>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => handleDriversUpload(e.target.files[0])}
                />
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                <a
                  href="/templates/chennai_drivers.csv"
                  download="chennai_drivers.csv"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Chennai Drivers CSV Template
                </a>

                {parsedDrivers.length > 0 && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {parsedDrivers.length} active fleet drivers ready
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition transform hover:scale-105"
          >
            <span>Assign & Optimize Chennai Multi-Driver Routes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataUploaderModal;
