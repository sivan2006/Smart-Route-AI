const AI_API_URL = import.meta.env.VITE_AI_API_URL ?? "/ai-api";

const trafficForZone = (zone, isFestival) => {
  if (isFestival) return "jam";
  return ["Koramangala", "Whitefield", "T. Nagar", "OMR", "Velachery"].includes(zone) ? "high" : "medium";
};

export async function predictOrderEtas(orders, isFestival = false, overrideWeather = null) {
  const hour = new Date().getHours();
  const response = await fetch(`${AI_API_URL}/predict-etas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deliveries: orders.map((order, index) => ({
        distance_km: Math.max(Number(order.distance) || 3.0, 0.5),
        traffic_level: order.traffic || trafficForZone(order.zone, isFestival),
        hour_of_day: hour,
        weather: overrideWeather || order.weather || "sunny",
        package_weight_kg: Number(order.packageWeightKg || order.demand_kg || 1.5),
        stops_remaining: Math.max(orders.length - index - 1, 0),
        is_festival: isFestival,
      })),
    }),
  });
  if (!response.ok) throw new Error(`ETA service returned ${response.status}`);
  const { predictions } = await response.json();
  return predictions;
}

export async function optimizeMultiDriverRoutes(orders, drivers) {
  if (!orders.length) return null;

  const depotLat = orders[0]?.storeLat || 13.0067;
  const depotLon = orders[0]?.storeLon || 80.2033;

  const payload = {
    depot_latitude: depotLat,
    depot_longitude: depotLon,
    stops: orders.map((order, idx) => ({
      id: String(order.id || `stop_${idx + 1}`),
      customer_name: order.customerName || `Customer ${idx + 1}`,
      address: order.address || `${order.zone || 'Chennai'}`,
      zone: order.zone || "Central",
      category: order.category || "General",
      latitude: Number(order.lat || order.dropLat),
      longitude: Number(order.lng || order.dropLon),
      demand_kg: Number(order.packageWeightKg || order.demand_kg || 2.0),
    })),
    drivers: drivers.map((d, idx) => ({
      driver_id: String(d.driver_id || d.id || `DRV_${idx + 1}`),
      driver_name: d.driver_name || d.name || `Driver ${idx + 1}`,
      driver_phone: d.driver_phone || "+91-9876543210",
      vehicle_type: d.vehicle_type || "bike",
      capacity_kg: Number(d.capacity_kg || (d.vehicle_type === "van" ? 300.0 : 45.0)),
      speed_kmh: Number(d.speed_kmh || (d.vehicle_type === "van" ? 40.0 : 35.0)),
      start_lat: depotLat,
      start_lon: depotLon,
      hub_category: d.hub_category || "General",
      color: d.color || "#6366f1",
    })),
  };

  const response = await fetch(`${AI_API_URL}/optimize-multi-driver-routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Multi-Driver Route service returned ${response.status}`);
  return await response.json();
}

// Fallback compatibility wrapper
export async function optimizeOrderRoute(orders) {
  if (!orders.length) return [];
  const defaultDrivers = [
    { driver_id: "DRV_01", driver_name: "Fleet Van #01", vehicle_type: "van", capacity_kg: 300, color: "#3b82f6" },
    { driver_id: "DRV_02", driver_name: "Fleet Bike #02", vehicle_type: "bike", capacity_kg: 45, color: "#10b981" },
  ];
  const result = await optimizeMultiDriverRoutes(orders, defaultDrivers);
  const flatStops = result.driver_routes.flatMap((r) => r.assigned_stops);
  const byId = new Map(orders.map((o) => [String(o.id), o]));
  return flatStops.map((s, idx) => ({
    ...(byId.get(String(s.id)) || s),
    optimizedOrder: idx + 1,
    assignedDriver: s.driver_name,
  }));
}
