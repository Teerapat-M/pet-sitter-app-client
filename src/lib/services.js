export const SERVICES = [
  {
    id: "boarding",
    label: "Boarding",
    icon: "🏠",
    blurb: "Stay at a verified sitter's home. Watch them live on CCTV.",
    short: "CCTV available",
    priceHint: "from ฿450 / night",
    mobileHint: "CCTV available",
    tint: "bg-primary-50",
  },
  {
    id: "dog_walking",
    label: "Dog walking",
    icon: "🐕",
    blurb: "Per walk or by duration, with live GPS tracking.",
    short: "Live GPS",
    priceHint: "from ฿150 / 30 min",
    mobileHint: "Live GPS",
    tint: "bg-accent-50",
  },
  {
    id: "in_home",
    label: "In-home sitter",
    icon: "🧳",
    blurb: "Daytime visits or overnight stays at your home.",
    short: "Day or overnight",
    priceHint: "from ฿350 / visit",
    mobileHint: "Day or overnight",
    tint: "bg-yellow-light",
  },
];

export function serviceById(id) {
  return SERVICES.find((item) => item.id === id) ?? null;
}
