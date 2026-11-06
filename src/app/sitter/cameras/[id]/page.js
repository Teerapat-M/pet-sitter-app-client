"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import SitterCameraMode from "@/components/cctv/SitterCameraMode";
import { getUser } from "@/lib/auth";

export default function SitterCameraModePage() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => {
    if (!getUser()?.isSitter) router.replace("/login");
  }, [router]);

  return <SitterCameraMode key={String(id)} cameraId={String(id)} />;
}
