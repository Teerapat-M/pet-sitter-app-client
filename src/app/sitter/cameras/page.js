"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SitterCameraDashboard from "@/components/cctv/SitterCameraDashboard";
import { getUser } from "@/lib/auth";

export default function SitterCamerasPage() {
  const router = useRouter();
  useEffect(() => {
    if (!getUser()?.isSitter) router.replace("/login");
  }, [router]);

  return <SitterCameraDashboard />;
}
