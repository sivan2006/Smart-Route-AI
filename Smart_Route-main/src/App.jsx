import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard/Dashboard";
import DeliveryAgentApp from "./components/DeliveryAgent/DeliveryAgentApp";
import { LayoutDashboard, Smartphone, Truck, ShieldCheck, Sparkles, Activity } from "lucide-react";

const App = () => {
  const [view, setView] = useState("dashboard"); // 'dashboard' | 'agent'
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("/ai-api/health");
        if (res.ok) {
          const data = await res.json();
          setApiStatus(data.status === "ok" ? "online" : "degraded");
        } else {
          setApiStatus("offline");
        }
      } catch (err) {
        setApiStatus("offline");
      }
    };
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-indigo-400">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-slate-100 via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                  OptiRoute AI
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-2.5 h-2.5" /> XGBoost & VRP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Last-Mile Operations Intelligence Platform
              </p>
            </div>
          </div>

          {/* View Switcher & Status */}
          <div className="flex items-center gap-3">
            {/* Live API Health indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiStatus === "online"
                    ? "bg-emerald-400 animate-pulse"
                    : apiStatus === "checking"
                    ? "bg-amber-400"
                    : "bg-red-400"
                }`}
              ></span>
              <span className="text-slate-400 text-[11px]">
                {apiStatus === "online" ? "FastAPI Online" : apiStatus === "checking" ? "Connecting..." : "Offline Fallback"}
              </span>
            </div>

            {/* Toggle Buttons */}
            <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setView("dashboard")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  view === "dashboard"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Operations</span> Dashboard
              </button>

              <button
                onClick={() => setView("agent")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  view === "agent"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Driver</span> Agent App
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {view === "dashboard" ? <Dashboard /> : <DeliveryAgentApp />}
      </main>

      {/* Modern Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AI Last-Mile Delivery Optimizer • XGBoost Regressor & Google OR-Tools CVRP
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Multi-Vehicle Fleet Telemetry</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Activity className="w-3 h-3" /> Live Operations
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;