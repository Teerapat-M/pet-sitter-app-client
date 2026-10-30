import Link from "next/link";
import CctvBadge from "./CctvBadge";
import { Card } from "@/components/ui/card";
import { formatSitterCard } from "@/lib/sitterCard";

export default function PetSitterCard({ sitter, index = 0 }) {
  const card = formatSitterCard(sitter, index);
  const petIcons = card.petTypes
    .map((type) => {
      const key = String(type).toLowerCase();
      if (key === "dog") return "🐕";
      if (key === "cat") return "🐱";
      if (key === "bird") return "🐦";
      if (key === "rabbit") return "🐰";
      return null;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <Card
      as={Link}
      interactive
      href={`/find-sitter/${card.id}`}
      className="block overflow-hidden rounded-card bg-surface shadow-card"
    >
      <div className="relative aspect-[16/11] overflow-hidden" style={{ backgroundColor: card.photoTint }}>
        {card.photo ? (
          <img src={card.photo} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-body-2 text-primary-600">
            🐾 Pet photo
          </div>
        )}
        <div className="absolute top-3 left-3">
          <CctvBadge />
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-h4 text-ink-900">{card.name}</h3>
        <p className="mt-1 text-caption text-ink-600">
          ⭐ {card.ratingLabel}
          {card.distanceLabel ? ` · ${card.distanceLabel}` : ""}
        </p>
        <p className="mt-2 text-body-2" aria-hidden>
          🏠 {petIcons || "🐾"}
        </p>
        {card.priceLabel ? (
          <p className="mt-3 text-label text-primary">{card.priceLabel}</p>
        ) : (
          <p className="mt-3 text-label text-primary">View profile</p>
        )}
      </div>
    </Card>
  );
}
