export function TourBookScene() {
  return (
    <div
      data-tour="book"
      className="pointer-events-auto w-[min(100%,20rem)] overflow-hidden rounded-card bg-surface shadow-card"
    >
      <div className="relative flex aspect-[16/11] items-center justify-center bg-primary-50">
        <p className="text-body-2 text-primary-600">🐾 Pet photo</p>
        <span className="badge-cctv badge absolute top-3 left-3">
          <span className="size-1.5 rounded-full bg-live" aria-hidden />
          CCTV
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-h4">Ploy S.</h3>
        <p className="mt-1 text-caption text-ink-600">⭐ 4.9 (212) · 1.2 km</p>
        <p className="mt-2 text-body-2" aria-hidden>
          🏠 🐕
        </p>
        <p className="mt-3 text-label text-primary">from ฿450 / night</p>
      </div>
    </div>
  );
}

export function TourCctvScene() {
  return (
    <div
      data-tour="cctv"
      className="pointer-events-auto w-[min(100%,40rem)] rounded-card bg-ink-900 p-5 text-white shadow-float"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            <span className="size-1.5 rounded-full bg-white" aria-hidden />
            Live
          </span>
          <p className="mt-3 text-h4 text-white">3 cameras online at Ploy&apos;s place</p>
          <p className="mt-1 text-caption text-white/70">
            Access until Sun 15 Nov, 12:00 · only you can watch
          </p>
          <span className="mt-4 inline-flex h-10 items-center rounded-full bg-secondary px-5 text-caption font-bold text-white">
            Watch CCTV
          </span>
        </div>
        <div className="flex gap-2">
          {["Play room", "Garden", "Bedroom"].map((name) => (
            <div
              key={name}
              className="flex h-20 w-16 items-end rounded-xl bg-black/50 p-1.5 text-[10px] text-white/80"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TourGpsScene() {
  return (
    <div
      data-tour="gps"
      className="pointer-events-auto w-[min(100%,40rem)] overflow-hidden rounded-card bg-accent-50 p-5 shadow-float"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-caption font-bold text-accent-700">Walk 3 in progress</p>
          <p className="mt-2 text-h4 text-ink-900">Bobo is out with Ploy</p>
          <p className="mt-1 text-caption text-ink-600">32 min · 2.4 km · updated 5s ago</p>
          <span className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-secondary px-4 text-caption font-bold text-white">
            Track walk live
          </span>
        </div>
        <div className="relative hidden h-24 w-36 overflow-hidden rounded-xl bg-[#e7f3ea] sm:block" aria-hidden>
          <svg viewBox="0 0 144 96" className="size-full">
            <path
              d="M18 72 H70 V28 H126"
              fill="none"
              stroke="#FF8A3D"
              strokeWidth="6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx="18" cy="72" r="7" fill="#3CC8A8" />
            <circle cx="126" cy="28" r="8" fill="#3CC8A8" />
          </svg>
        </div>
      </div>
    </div>
  );
}
