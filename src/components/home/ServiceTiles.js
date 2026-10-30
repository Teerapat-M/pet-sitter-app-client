import Link from "next/link";
import { SERVICES } from "@/lib/services";

export default function ServiceTiles() {
  return (
    <section className="psp-container py-4 md:py-10">
      <h2 className="text-h2">Our services</h2>
      <div
        data-tour="services"
        className="mt-4 grid grid-cols-3 gap-3 md:mt-6 md:gap-5"
      >
        {SERVICES.map((service) => (
          <Link
            key={service.id}
            href={`/find-sitter?service=${service.id}`}
            className={`rounded-tile p-3 md:p-5 ${service.tint}`}
          >
            <span className="text-2xl md:text-3xl" aria-hidden>
              {service.icon}
            </span>
            <h3 className="mt-3 text-[0.95rem] font-extrabold text-ink-900 md:mt-4 md:text-h4">
              <span className="md:hidden">{service.mobileLabel}</span>
              <span className="hidden md:inline">{service.label}</span>
            </h3>
            <p className="mt-2 hidden text-body-2 text-ink-600 md:block">{service.blurb}</p>
            <p className="mt-1 text-[0.7rem] leading-4 text-ink-600 md:hidden">
              {service.mobileHint}
            </p>
            <p className="mt-4 hidden text-label text-primary md:block">{service.priceHint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
