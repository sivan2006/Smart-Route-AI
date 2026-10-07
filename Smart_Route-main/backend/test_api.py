"""Comprehensive backend test suite for AI Last-Mile Delivery Optimizer."""
import pytest
from fastapi.testclient import TestClient
from main import app, MODEL_PATH


@pytest.fixture
def client():
    return TestClient(app)


def test_model_artifact_exists():
    assert MODEL_PATH.exists(), f"Model artifact not found at {MODEL_PATH}"


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_ready"] is True


def test_predict_eta_single(client):
    payload = {
        "distance_km": 6.5,
        "traffic_level": "medium",
        "hour_of_day": 14,
        "weather": "sunny",
        "package_weight_kg": 1.5,
        "stops_remaining": 2,
        "is_festival": False,
    }
    response = client.post("/predict-eta", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "predicted_eta_minutes" in data
    assert data["predicted_eta_minutes"] > 0


def test_optimize_multi_driver_cvrp(client):
    payload = {
        "depot_latitude": 12.9716,
        "depot_longitude": 77.5946,
        "stops": [
            {"id": "stop_1", "customer_name": "Ravi Kumar", "latitude": 12.9352, "longitude": 77.6146, "demand_kg": 5.0},
            {"id": "stop_2", "customer_name": "Anita Desai", "latitude": 12.9716, "longitude": 77.6412, "demand_kg": 4.0},
            {"id": "stop_3", "customer_name": "Sanjay Rao", "latitude": 12.9698, "longitude": 77.7499, "demand_kg": 6.0},
            {"id": "stop_4", "customer_name": "Meena Shah", "latitude": 13.0095, "longitude": 77.5670, "demand_kg": 3.0},
        ],
        "drivers": [
            {"driver_id": "DRV_1", "driver_name": "Rajesh (Van)", "vehicle_type": "van", "capacity_kg": 200.0, "speed_kmh": 40.0},
            {"driver_id": "DRV_2", "driver_name": "Karthik (Bike)", "vehicle_type": "bike", "capacity_kg": 35.0, "speed_kmh": 35.0},
        ],
    }
    response = client.post("/optimize-multi-driver-routes", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["solver"] == "google-or-tools-multi-cvrp"
    assert "total_distance_saved_km" in data
    assert "total_fuel_saved_inr" in data
    assert len(data["driver_routes"]) == 2
    assert data["total_stops_assigned"] == 4
