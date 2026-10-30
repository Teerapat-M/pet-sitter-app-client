"use client";

import dynamic from "next/dynamic";

const WalkTrailMapInner = dynamic(() => import("./WalkTrailMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#d9efe6]" />,
});

export default function WalkTrailMap(props) {
  return <WalkTrailMapInner {...props} />;
}
