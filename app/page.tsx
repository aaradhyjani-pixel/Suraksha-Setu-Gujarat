"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadProfile } from "@/lib/options";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(loadProfile() ? "/dashboard" : "/onboarding");
  }, [router]);
  return <main />;
}
