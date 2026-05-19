"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      // 1. Check local storage first (for Demo Mode)
      const cachedRole = localStorage.getItem("pos_role");
      if (cachedRole) {
        if (cachedRole === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/pos");
        }
        return;
      }

      // 2. Check Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.replace("/login");
        return;
      }

      // If user session exists but no cached role, fetch user role
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (error || !profile) {
          router.replace("/login");
          return;
        }

        localStorage.setItem("pos_role", profile.role);
        
        if (profile.role === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/pos");
        }
      } catch (err) {
        router.replace("/login");
      }
    };

    checkUser();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Loading Spinner */}
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">جاري توجيهك...</p>
      </div>
    </div>
  );
}

