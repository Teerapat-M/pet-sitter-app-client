import Link from "next/link";
import { SERVICES } from "@/lib/services";

export default function ServiceTiles() {
  return (
    <section className="psp-container py-6 md:py-10">
      <h2 className="text-h2">Our services</h2>
      <div
        data-tour="services"
        className="mt-4 flex gap-3 overflow-x-auto pb-2 md:mt-6 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible"
      >
        {SERVICES.map((service) => (
          <Link
            key={service.id}
            href={`/find-sitter?service=${service.id}`}
            className={`min-w-[11.5rem] shrink-0 rounded-tile p-5 md:min-w-0 ${service.tint}`}
          >
            <span className="text-3xl" aria-hidden>
              {service.icon}
            </span>
            <h3 className="mt-4 text-h4">{service.label}</h3>
            <p className="mt-2 hidden text-body-2 text-ink-600 md:block">
              {service.blurb}
            </p>
            <p className="mt-2 text-caption text-ink-600 md:hidden">
              {service.mobileHint}
            </p>
            <p className="mt-4 hidden text-label text-primary md:block">
              {service.priceHint}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
