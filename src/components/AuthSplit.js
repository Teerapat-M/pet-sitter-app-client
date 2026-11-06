import Logo from "@/components/brand/Logo";

export default function AuthSplit({
  panel = "primary",
  headline,
  sub,
  photoLabel,
  children,
}) {
  const panelClass = panel === "mint" ? "bg-accent-50" : "bg-primary-50";
  const headlineClass = panel === "mint" ? "text-accent-700" : "text-ink-900";

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className={`relative hidden flex-col justify-between p-10 lg:flex ${panelClass}`}>
        <Logo />
        <div className="max-w-md">
          <h1 className={`text-display ${headlineClass}`}>{headline}</h1>
          {sub ? <p className="mt-4 text-body-lg text-ink-600">{sub}</p> : null}
        </div>
        <div className={`flex min-h-56 items-center justify-center rounded-tile ${panel === "mint" ? "bg-accent-mint/20" : "bg-primary/15"}`}>
          <p className="text-label text-primary-600">{photoLabel}</p>
        </div>
      </section>
      <section className="flex flex-col px-5 py-8 sm:px-10 lg:justify-center lg:px-16">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}
