import { calculateBookingNights } from "./booking.js";

export const SERVICES = [
  {
    id: "boarding",
    label: "Boarding",
    tabLabel: "Boarding",
    mobileLabel: "Boarding",
    icon: "🏠",
    blurb: "Stay at a verified sitter's home. Watch them live on CCTV.",
    short: "CCTV available",
    priceHint: "from ฿450 / night",
    profilePrice: "฿450 / night",
    mobileHint: "CCTV available",
    tint: "bg-primary-50",
  },
  {
    id: "dog_walking",
    label: "Dog walking",
    tabLabel: "Walking",
    mobileLabel: "Dog walking",
    icon: "🐕",
    blurb: "Per walk or by duration, with live GPS tracking.",
    short: "Live GPS",
    priceHint: "from ฿150 / 30 min",
    profilePrice: "฿150 / 30 min",
    mobileHint: "Live GPS",
    tint: "bg-accent-50",
  },
  {
    id: "in_home",
    label: "In-home sitter",
    tabLabel: "In-home",
    mobileLabel: "In-home",
    icon: "🧳",
    blurb: "Daytime visits or overnight stays at your home.",
    short: "Day or overnight",
    priceHint: "from ฿350 / visit",
    profilePrice: "฿350 visit · ฿700 night",
    mobileHint: "Day or overnight",
    tint: "bg-yellow-light",
  },
];

export function serviceById(id) {
  return SERVICES.find((item) => item.id === id) ?? null;
}

export function quoteBooking(serviceId, startDate, endDate) {
  const nights = Math.max(1, calculateBookingNights(startDate, endDate) || 1);

  if (serviceId === "dog_walking") {
    return { nights: 1, unitPrice: 150, total: 150, line: "฿150 / 30 min" };
  }

  if (serviceId === "in_home") {
    return {
      nights,
      unitPrice: 700,
      total: nights * 700,
      line: `${nights} night${nights === 1 ? "" : "s"} × ฿700`,
    };
  }

  return {
    nights,
    unitPrice: 450,
    total: nights * 450,
    line: `${nights} night${nights === 1 ? "" : "s"} × ฿450`,
  };
}
