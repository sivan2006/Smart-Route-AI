"""Extract drivable road network from OSM PBF for delivery routing."""
from __future__ import annotations

import math
import time
from pathlib import Path

import joblib
import networkx as nx
import osmium


# Bounding box for Bengaluru metropolitan region
MIN_LAT, MAX_LAT = 12.75, 13.20
MIN_LON, MAX_LON = 77.40, 77.85

DRIVABLE_HIGHWAYS = {
    "motorway",
    "trunk",
    "primary",
    "secondary",
    "tertiary",
    "unclassified",
    "residential",
    "motorway_link",
    "trunk_link",
    "primary_link",
    "secondary_link",
    "tertiary_link",
    "living_street",
}

# Average urban speeds in km/h for different road types
ROAD_SPEEDS = {
    "motorway": 55,
    "trunk": 45,
    "primary": 35,
    "secondary": 28,
    "tertiary": 22,
    "residential": 18,
    "living_street": 12,
    "unclassified": 20,
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance in meters between two lat/lon points."""
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return 2 * 6_371_000 * math.asin(math.sqrt(a))


class RoadNetworkHandler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.graph = nx.DiGraph()
        self.node_coords = {}
        self.ways_count = 0

    def way(self, w):
        highway = w.tags.get("highway")
        if highway not in DRIVABLE_HIGHWAYS:
            return

        # Check if way falls within Bengaluru bounding box
        coords = []
        for n in w.nodes:
            if not n.location.valid():
                return
            coords.append((n.ref, n.location.lat, n.location.lon))

        # Fast bounding box check
        in_bbox = any(
            MIN_LAT <= lat <= MAX_LAT and MIN_LON <= lon <= MAX_LON
            for _, lat, lon in coords
        )
        if not in_bbox:
            return

        self.ways_count += 1
        oneway = w.tags.get("oneway") in ["yes", "1", "true"]

        base_highway = highway.replace("_link", "")
        speed_kmh = ROAD_SPEEDS.get(base_highway, 20)

        for i in range(len(coords) - 1):
            u_id, u_lat, u_lon = coords[i]
            v_id, v_lat, v_lon = coords[i + 1]

            self.node_coords[u_id] = (u_lat, u_lon)
            self.node_coords[v_id] = (v_lat, v_lon)

            dist_m = haversine_distance(u_lat, u_lon, v_lat, v_lon)
            time_sec = (dist_m / 1000) / speed_kmh * 3600

            self.graph.add_edge(
                u_id,
                v_id,
                length=dist_m,
                time_sec=time_sec,
                highway=highway,
            )
            if not oneway:
                self.graph.add_edge(
                    v_id,
                    u_id,
                    length=dist_m,
                    time_sec=time_sec,
                    highway=highway,
                )


def extract_and_save(pbf_path: Path, output_path: Path):
    print(f"Reading OSM PBF from {pbf_path}...")
    start = time.time()
    handler = RoadNetworkHandler()
    handler.apply_file(str(pbf_path), locations=True)

    print(f"Extracted {handler.ways_count} ways in {round(time.time() - start, 2)}s.")
    print(f"Graph nodes: {len(handler.node_coords)}, Edges: {handler.graph.number_of_edges()}")

    # Store node coordinates as node attributes
    for node_id, (lat, lon) in handler.node_coords.items():
        if node_id in handler.graph:
            handler.graph.nodes[node_id]["lat"] = lat
            handler.graph.nodes[node_id]["lon"] = lon

    output_path.parent.mkdir(exist_ok=True)
    payload = {
        "graph": handler.graph,
        "node_coords": handler.node_coords,
        "bbox": (MIN_LAT, MAX_LAT, MIN_LON, MAX_LON),
    }
    joblib.dump(payload, output_path, compress=3)
    print(f"Saved road network graph to {output_path} ({round(output_path.stat().st_size / (1024*1024), 2)} MB)")


if __name__ == "__main__":
    pbf = Path(__file__).parent.parent / "Map" / "india-260823.osm.pbf"
    out = Path(__file__).parent / "models" / "bengaluru_road_graph.joblib"
    extract_and_save(pbf, out)
