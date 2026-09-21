"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT, type Key } from "@/lib/i18n";

const TABS: { href: string; label: Key }[] = [
  { href: "/dashboard", label: "nav_alert" },
  { href: "/help", label: "nav_help" },
  { href: "/offline", label: "nav_offline" },
];

export default function Nav() {
  const path = usePathname();
  const { t } = useT();
  if (path === "/onboarding" || path === "/") return null;
  return (
    <nav className="tabs">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} aria-current={path === tab.href ? "page" : undefined}>
          {t(tab.label)}
        </Link>
      ))}
    </nav>
  );
}
