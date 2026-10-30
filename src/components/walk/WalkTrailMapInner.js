"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BANGKOK_CENTER, pointsToLatLngs } from "@/lib/walkTracking";

function FitTrail({ latLngs, followLast }) {
  const map = useMap();

  useEffect(() => {
    if (!latLngs.length) return;
    if (latLngs.length === 1) {
      map.setView(latLngs[0], Math.max(map.getZoom(), 16));
      return;
    }
    map.fitBounds(latLngs, { padding: [32, 32], maxZoom: 17 });
  }, [latLngs, map]);

  useEffect(() => {
    if (!followLast || !latLngs.length) return;
    const last = latLngs[latLngs.length - 1];
    map.panTo(last, { animate: true });
  }, [followLast, latLngs, map]);

  useEffect(() => {
    const container = map.getContainer();
    function refresh() {
      if (!container.parentNode) return;
      map.invalidateSize({ animate: false });
    }
    const observer = new ResizeObserver(refresh);
    observer.observe(container);
    map.whenReady(refresh);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export default function WalkTrailMapInner({
  points = [],
  className = "h-full w-full",
  live = false,
}) {
  const latLngs = pointsToLatLngs(points);
  const last = latLngs[latLngs.length - 1];
  const start = latLngs[0];
  const center = last || start || BANGKOK_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom
      className={className}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitTrail latLngs={latLngs} followLast={live} />
      {latLngs.length > 1 ? (
        <Polyline
          positions={latLngs}
          pathOptions={{ color: "#FF8A3D", weight: 5, lineCap: "round", lineJoin: "round" }}
        />
      ) : null}
      {start ? (
        <CircleMarker
          center={start}
          radius={8}
          pathOptions={{ color: "#1F7A66", fillColor: "#3CC8A8", fillOpacity: 1, weight: 2 }}
        />
      ) : null}
      {last ? (
        <CircleMarker
          center={last}
          radius={live ? 10 : 8}
          pathOptions={{
            color: live ? "#E5484D" : "#1F7A66",
            fillColor: live ? "#E5484D" : "#3CC8A8",
            fillOpacity: 1,
            weight: 2,
          }}
        />
      ) : null}
    </MapContainer>
  );
}
