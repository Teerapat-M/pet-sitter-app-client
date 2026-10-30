import Link from "next/link";
import Logo from "@/components/brand/Logo";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-line bg-background py-10">
      <div className="psp-container flex flex-col items-center text-center">
        <Logo />
        <p className="mt-3 text-body-2 text-ink-400">
          Trusted sitters. Live cameras. Happy pets.
        </p>
        <div className="mt-4 flex gap-4 text-caption text-ink-600">
          <Link href="/privacy-policy" className="hover:text-primary">
            Privacy
          </Link>
          <Link href="/terms-of-service" className="hover:text-primary">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
