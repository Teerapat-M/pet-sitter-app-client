"use client";

import SearchBar from "./SearchBar";

export default function HeroSection({ greeting = null }) {
  return (
    <section className="psp-container pt-6 pb-4 md:pt-10 md:pb-8">
      {greeting}

      <div className="relative rounded-tile bg-primary-50 px-5 py-8 md:px-12 md:py-14">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-tile"
          aria-hidden
        >
          <div className="absolute -right-8 top-4 hidden size-72 rounded-full bg-[#ffe8d4] md:block lg:right-16 lg:size-80" />
        </div>

        <div className="relative z-10 max-w-xl">
          <h1 className="hidden text-display text-ink-900 md:block">
            Trusted care for your pet, with eyes on every moment.
          </h1>
          <p className="mt-3 hidden max-w-md text-body-lg text-ink-600 md:block">
            Boarding with live CCTV · dog walks with GPS · in-home sitters
          </p>
          <div className="mt-6 hidden md:block">
            <SearchBar />
          </div>
        </div>

        <div className="relative z-10 flex min-h-28 items-center justify-center gap-3 md:absolute md:right-16 md:top-1/2 md:mt-0 md:min-h-0 md:-translate-y-1/2">
          <span className="text-5xl md:text-8xl" aria-hidden>
            🐶
          </span>
          <span className="text-5xl md:text-8xl" aria-hidden>
            🐱
          </span>
          <p className="text-h3 text-primary md:hidden">Happy pets</p>
        </div>
        <div className="absolute bottom-4 left-4 z-10 md:right-24 md:bottom-8 md:left-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-caption font-semibold text-ink-900 shadow-card">
            <span className="size-2 rounded-full bg-live" aria-hidden />
            Live walk · 1.8 km
          </span>
        </div>
      </div>

      <div className="mt-4 md:hidden">
        <SearchBar />
      </div>
    </section>
  );
}
