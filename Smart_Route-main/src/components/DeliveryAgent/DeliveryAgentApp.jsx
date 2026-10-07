import React, { useState } from "react";
import mockOrders from "../../utils/mockOrders";
import { getDelaySeverity } from "../../utils/delayUtils";
import {
  Package,
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  MapPin,
  BatteryCharging,
  Wifi,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const DeliveryAgentApp = () => {
  const [orders, setOrders] = useState(mockOrders);
  const [deliveredIds, setDeliveredIds] = useState([]);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  const handleDelivered = (id, requiredOtp) => {
    if (otpInput && otpInput !== String(requiredOtp)) {
      setOtpError(`Invalid OTP. Expected: ${requiredOtp}`);
      return;
    }
    setOtpError("");
    setOtpInput("");
    setDeliveredIds([...deliveredIds, id]);
  };

  const handleReset = () => {
    setDeliveredIds([]);
    setOtpInput("");
    setOtpError("");
  };

  const nextOrder = orders.find((order) => !deliveredIds.includes(order.id));
  const remaining = orders.filter((order) => !deliveredIds.includes(order.id)).slice(1);
  const progressPercent = Math.round((deliveredIds.length / orders.length) * 100);

  return (
    <div className="max-w-md mx-auto my-4 text-left animate-fadeIn">
      {/* Smartphone frame container */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-[36px] p-4 shadow-2xl overflow-hidden relative">
        {/* Status Bar simulation */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800 text-[11px] text-slate-400">
          <div className="font-semibold text-slate-200">09:41 AM</div>
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
            <div className="flex items-center gap-1">
              <span>88%</span>
              <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Agent Profile & Dispatch Card */}
        <div className="p-4 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700/60 my-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold text-base">
                RS
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Rajesh Sharma</h3>
                <p className="text-xs text-slate-400">EV Fleet • ID #BLR-884</p>
              </div>
            </div>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 text-xs font-semibold border border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              On Route
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 pt-3 border-t border-slate-700/60">
            <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
              <span>Delivery Progress</span>
              <span>
                {deliveredIds.length} / {orders.length} Completed ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Active Delivery Card */}
        {nextOrder ? (
          <div className="glass-panel p-5 rounded-2xl border border-indigo-500/30 my-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs">
                NEXT STOP #{orders.indexOf(nextOrder) + 1}
              </span>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  getDelaySeverity(nextOrder.estimatedDelay) === "red"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40"
                    : getDelaySeverity(nextOrder.estimatedDelay) === "orange"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                }`}
              >
                {getDelaySeverity(nextOrder.estimatedDelay)} Delay Risk
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-200 mb-4">
              <div className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-400" />
                {nextOrder.customerName}
              </div>
              <div className="flex items-start gap-1.5 text-slate-400">
                <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>{nextOrder.address}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>ETA: {nextOrder.estimatedDelay} mins</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Distance: {nextOrder.distance} km</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => alert(`Calling customer ${nextOrder.customerName}...`)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                Call Customer
              </button>
              <button
                onClick={() => alert(`Launching GPS navigation to ${nextOrder.address}...`)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                Open GPS
              </button>
            </div>

            {/* OTP Verification & Complete */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Customer Delivery OTP:
                </span>
                <span className="font-mono font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                  {1000 + nextOrder.id}
                </span>
              </div>
              <input
                type="text"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder={`Enter OTP (${1000 + nextOrder.id})`}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {otpError && <p className="text-[11px] text-red-400 font-semibold">{otpError}</p>}
              <button
                onClick={() => handleDelivered(nextOrder.id, 1000 + nextOrder.id)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition transform hover:scale-[1.02]"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Stop as Delivered
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-8 rounded-2xl border border-emerald-500/40 my-6 text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">
              All Deliveries Completed!
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Great work! You have finished all assigned stops for this shift.
            </p>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Shift Simulation
            </button>
          </div>
        )}

        {/* Remaining Stops Queue */}
        {remaining.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Upcoming Stops Queue ({remaining.length})
            </h4>
            <div className="space-y-2">
              {remaining.map((order, idx) => (
                <div
                  key={order.id}
                  className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-[10px]">
                      {orders.indexOf(order) + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-200">{order.customerName}</div>
                      <div className="text-[11px] text-slate-400">{order.zone}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-indigo-400 font-semibold">{order.estimatedDelay}m</div>
                    <div className="text-[10px] text-slate-500">{order.distance} km</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryAgentApp;