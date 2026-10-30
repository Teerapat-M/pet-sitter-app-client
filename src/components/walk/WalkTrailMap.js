"use client";

import dynamic from "next/dynamic";

const WalkTrailMapInner = dynamic(() => import("./WalkTrailMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-accent-50 text-caption font-semibold text-ink-400">
      Loading map…
    </div>
  ),
});

export default function WalkTrailMap(props) {
  return <WalkTrailMapInner {...props} />;
}
