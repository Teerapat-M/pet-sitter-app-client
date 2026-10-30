"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function OwnerLayoutChrome({ children }) {
  const pathname = usePathname() || "";
  const hideNavOnMobile = pathname.startsWith("/owner/walks");
  return (
    <>
      <div className={hideNavOnMobile ? "hidden md:block" : undefined}>
        <Navbar />
      </div>
      {children}
    </>
  );
}
