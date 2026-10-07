"""Train the ETA regressor from Amazon & Kaggle Delivery datasets."""
from __future__ import annotations

import argparse
import json
import re
from math import asin, cos, radians, sin, sqrt
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor


def haversine_km(lat1, lon1, lat2, lon2):
    dlat, dlon = np.radians(lat2 - lat1), np.radians(lon2 - lon1)
    a = np.sin(dlat / 2) ** 2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2) ** 2
    return 2 * 6371 * np.arcsin(np.sqrt(a))


def find_column(frame: pd.DataFrame, *candidates: str) -> str | None:
    norm_cols = {c.strip().lower().replace("_", "").replace(" ", ""): c for c in frame.columns}
    for cand in candidates:
        norm_cand = cand.strip().lower().replace("_", "").replace(" ", "")
        if norm_cand in norm_cols:
            return norm_cols[norm_cand]
    return None


def prepare_data(raw: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    raw.columns = [c.strip() for c in raw.columns]

    target_col = find_column(raw, "Delivery_Time", "Time_taken(min)", "delivery_time_minutes", "time_taken")
    store_lat_col = find_column(raw, "Store_Latitude", "Restaurant_latitude", "store_lat", "origin_lat")
    store_lon_col = find_column(raw, "Store_Longitude", "Restaurant_longitude", "store_lon", "origin_lon")
    drop_lat_col = find_column(raw, "Drop_Latitude", "Delivery_location_latitude", "drop_lat", "destination_lat")
    drop_lon_col = find_column(raw, "Drop_Longitude", "Delivery_location_longitude", "drop_lon", "destination_lon")
    traffic_col = find_column(raw, "Traffic", "Road_traffic_density", "traffic_level")
    weather_col = find_column(raw, "Weather", "Weatherconditions", "weather_condition")
    order_time_col = find_column(raw, "Order_Time", "Time_Orderd", "order_time")
    festival_col = find_column(raw, "Festival", "is_festival")
    multi_col = find_column(raw, "multiple_deliveries", "stops_remaining")

    if not all([target_col, store_lat_col, store_lon_col, drop_lat_col, drop_lon_col]):
        raise ValueError("Missing core required geographic or target columns.")

    store_lat = pd.to_numeric(raw[store_lat_col], errors="coerce")
    store_lon = pd.to_numeric(raw[store_lon_col], errors="coerce")
    drop_lat = pd.to_numeric(raw[drop_lat_col], errors="coerce")
    drop_lon = pd.to_numeric(raw[drop_lon_col], errors="coerce")

    # Filter invalid GPS bounds
    valid_coords = (store_lat > 5) & (store_lat < 40) & (store_lon > 65) & (store_lon < 100) & \
                   (drop_lat > 5) & (drop_lat < 40) & (drop_lon > 65) & (drop_lon < 100)

    raw_valid = raw[valid_coords].copy()
    store_lat = store_lat[valid_coords]
    store_lon = store_lon[valid_coords]
    drop_lat = drop_lat[valid_coords]
    drop_lon = drop_lon[valid_coords]

    dist = haversine_km(store_lat, store_lon, drop_lat, drop_lon)

    # Traffic parsing
    if traffic_col and traffic_col in raw_valid:
        traffic_vals = raw_valid[traffic_col].astype(str).str.strip().str.lower()
        traffic_vals = traffic_vals.replace({"nan": "medium", "none": "medium", "jam ": "jam"})
        traffic_vals = traffic_vals.where(traffic_vals.isin(["low", "medium", "high", "jam"]), "medium")
    else:
        traffic_vals = pd.Series("medium", index=raw_valid.index)

    # Weather parsing
    if weather_col and weather_col in raw_valid:
        weather_vals = raw_valid[weather_col].astype(str).str.replace("conditions ", "", regex=False).str.strip().str.lower()
        weather_vals = weather_vals.replace({"nan": "sunny", "sandstorms": "stormy", "none": "sunny"})
        weather_vals = weather_vals.where(weather_vals.isin(["sunny", "cloudy", "fog", "stormy", "windy"]), "sunny")
    else:
        weather_vals = pd.Series("sunny", index=raw_valid.index)

    # Order time hour
    if order_time_col and order_time_col in raw_valid:
        hours = pd.to_datetime(raw_valid[order_time_col].astype(str), format="%H:%M:%S", errors="coerce").dt.hour.fillna(12)
    else:
        hours = pd.Series(12, index=raw_valid.index)

    # Festival flag
    if festival_col and festival_col in raw_valid:
        festivals = raw_valid[festival_col].astype(str).str.strip().str.lower().isin(["yes", "true", "1"])
    else:
        festivals = pd.Series(False, index=raw_valid.index)

    # Multi deliveries
    if multi_col and multi_col in raw_valid:
        stops = pd.to_numeric(raw_valid[multi_col], errors="coerce").fillna(0)
    else:
        stops = pd.Series(0, index=raw_valid.index)

    frame = pd.DataFrame({
        "distance_km": dist,
        "traffic_level": traffic_vals,
        "hour_of_day": hours,
        "weather": weather_vals,
        "package_weight_kg": 1.0,
        "stops_remaining": stops,
        "is_festival": festivals,
    })

    cleaned_target = raw_valid[target_col].astype(str).str.extract(r"(\d+(?:\.\d+)?)")[0]
    labels = pd.to_numeric(cleaned_target, errors="coerce")

    valid = frame["distance_km"].notna() & (frame["distance_km"] < 200) & labels.notna() & (labels > 0) & (labels < 400)
    return frame.loc[valid], labels.loc[valid]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to the delivery dataset CSV")
    arguments = parser.parse_args()

    features, labels = prepare_data(pd.read_csv(arguments.data))
    print(f"Prepared {len(features)} valid records for training.")

    numeric = ["distance_km", "hour_of_day", "package_weight_kg", "stops_remaining", "is_festival"]
    categorical = ["traffic_level", "weather"]

    preprocessor = ColumnTransformer([
        ("numeric", Pipeline([("impute", SimpleImputer(strategy="median"))]), numeric),
        ("categorical", Pipeline([
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("encode", OneHotEncoder(handle_unknown="ignore")),
        ]), categorical),
    ])

    model = Pipeline([
        ("preprocess", preprocessor),
        ("model", XGBRegressor(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            objective="reg:squarederror",
            random_state=42,
        )),
    ])

    x_train, x_test, y_train, y_test = train_test_split(features, labels, test_size=0.2, random_state=42)
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)

    metrics = {
        "mae_minutes": round(mean_absolute_error(y_test, predictions), 3),
        "rmse_minutes": round(float(np.sqrt(mean_squared_error(y_test, predictions))), 3),
        "r2": round(r2_score(y_test, predictions), 3),
        "training_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "dataset": Path(arguments.data).name,
        "model": "XGBoostRegressor",
    }

    output_directory = Path(__file__).parent / "models"
    output_directory.mkdir(exist_ok=True)
    joblib.dump(model, output_directory / "eta_model.joblib")
    (output_directory / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
