import WalkFramesClient from "./WalkFramesClient";

export default async function WalkFramesPage({ searchParams }) {
  const params = searchParams ? await searchParams : {};
  const frame = typeof params.frame === "string" ? params.frame : "";
  return <WalkFramesClient frame={frame} />;
}
