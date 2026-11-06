"use client";

import dynamic from "next/dynamic";

const WalkTrailMapInner = dynamic(() => import("./WalkTrailMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100" />,
});

export default function WalkTrailMap(props) {
  return <WalkTrailMapInner {...props} />;
}
