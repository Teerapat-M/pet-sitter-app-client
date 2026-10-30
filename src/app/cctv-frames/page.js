import { notFound } from "next/navigation";
import CctvFramesClient from "./CctvFramesClient";

export const dynamic = "force-dynamic";

export default async function CctvFramesPage({ searchParams }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const params = searchParams ? await searchParams : {};
  const frame = typeof params.frame === "string" ? params.frame : "08";
  return <CctvFramesClient frame={frame} />;
}
