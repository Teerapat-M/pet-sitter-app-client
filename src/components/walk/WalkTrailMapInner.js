"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BANGKOK_CENTER, pointsToLatLngs } from "@/lib/walkTracking";
import { cn } from "@/lib/utils";

function FitTrail({ latLngs, followLast }) {
  const map = useMap();

  useEffect(() => {
    if (!latLngs.length) return;
    if (latLngs.length === 1) {
      map.setView(latLngs[0], Math.max(map.getZoom(), 16));
      return;
    }
    map.fitBounds(latLngs, { padding: [36, 36], maxZoom: 17 });
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
  const samePoint = start && last && start[0] === last[0] && start[1] === last[1];

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom
      zoomControl={false}
      className={cn("walk-map", className)}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitTrail latLngs={latLngs} followLast={live} />
      {latLngs.length > 1 ? (
        <Polyline
          positions={latLngs}
          pathOptions={{ color: "#FF8A3D", weight: 5, lineCap: "round", lineJoin: "round" }}
        />
      ) : null}
      {start && !samePoint ? (
        <CircleMarker
          center={start}
          radius={7}
          pathOptions={{ color: "#ffffff", fillColor: "#1F7A66", fillOpacity: 1, weight: 2 }}
        />
      ) : null}
      {last ? (
        <CircleMarker
          center={last}
          radius={live ? 9 : 8}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#3CC8A8",
            fillOpacity: 1,
            weight: 3,
          }}
        />
      ) : null}
    </MapContainer>
  );
}
