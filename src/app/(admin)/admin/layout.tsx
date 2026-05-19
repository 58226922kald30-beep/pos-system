"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Package, 
  LogOut, 
  Menu, 
  X, 
  Store,
  ShieldCheck,
  ReceiptText,
  Wallet,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

interface SidebarItem {
  name: string;
  href: string;
  icon: any;
}

const sidebarItems: SidebarItem[] = [
  { name: "لوحة التحكم", href: "/admin", icon: LayoutDashboard },
  { name: "إدارة المخزن", href: "/admin/inventory", icon: Package },
  { name: "سجل المبيعات", href: "/admin/sales", icon: ReceiptText },
  { name: "المصروفات", href: "/admin/expenses", icon: Wallet },
  { name: "إعدادات المتجر", href: "/admin/settings", icon: Settings },
  { name: "شاشة الكاشير (POS)", href: "/pos", icon: Store },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("مدير النظام");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAdmin = async () => {
      const cachedRole = localStorage.getItem("pos_role");
      const cachedUser = localStorage.getItem("pos_user");

      if (cachedRole) {
        if (cachedRole === "admin") {
          if (cachedUser) {
            const user = JSON.parse(cachedUser);
            setUserName(user.name || "مدير تجريبي");
          }
          setAuthorized(true);
        } else {
          toast.error("غير مصرح لك بالدخول إلى لوحة التحكم");
          router.replace("/pos");
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", session.user.id)
        .single();

      if (error || !profile || profile.role !== "admin") {
        toast.error("غير مصرح لك بالدخول إلى لوحة التحكم");
        router.replace("/pos");
        return;
      }

      setUserName(profile.full_name || "مدير النظام");
      setAuthorized(true);
    };

    checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    localStorage.removeItem("pos_role");
    localStorage.removeItem("pos_user");
    await supabase.auth.signOut().catch(() => {});
    
    toast.success("تم تسجيل الخروج بنجاح");
    router.push("/login");
  };

  if (authorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex overflow-hidden">
      {/* Visual background accents (Light & Elegant) */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-indigo-100/50 to-purple-100/50 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-sky-100/50 to-teal-100/50 blur-[100px] pointer-events-none" />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-l border-slate-200/60 bg-white/60 backdrop-blur-xl relative z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
        <div className="h-20 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-200">
              S
            </div>
            <span className="font-extrabold text-xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">سول فيت</span>
          </div>
        </div>

        <div className="p-4 flex items-center gap-3 bg-white border border-slate-100 shadow-sm mx-4 my-6 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 max-w-[130px] truncate">{userName}</h4>
            <span className="text-xs text-indigo-500 font-medium">مدير النظام</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className="relative block"
              >
                {active && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-indigo-50 border-r-4 border-indigo-600 rounded-xl"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <div className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  active ? "text-indigo-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                }`}>
                  <Icon className={`w-5 h-5 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl py-5 font-semibold"
          >
            <LogOut className="w-5 h-5 ml-3" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm md:hidden" 
              onClick={() => setSidebarOpen(false)} 
            />
            <motion.aside 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 bottom-0 right-0 z-50 w-72 bg-white/90 backdrop-blur-2xl border-l border-slate-200 md:hidden flex flex-col shadow-2xl"
            >
              <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-200">
                    S
                  </div>
                  <span className="font-extrabold text-xl text-slate-800">سول فيت</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="rounded-full hover:bg-slate-100 text-slate-500">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-4 flex items-center gap-3 bg-slate-50 border border-slate-100 mx-4 my-6 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{userName}</h4>
                  <span className="text-xs text-indigo-500 font-medium">مدير النظام</span>
                </div>
              </div>

              <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                        active 
                          ? "bg-indigo-50 text-indigo-700 border-r-4 border-indigo-600" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-6 border-t border-slate-100">
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl py-6 font-semibold"
                >
                  <LogOut className="w-5 h-5 ml-3" />
                  تسجيل الخروج
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 flex items-center justify-between px-6 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl md:px-10 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden text-slate-600 hover:bg-white/60 hover:text-slate-900 rounded-full"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="hidden md:block">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">لوحة تحكم الإدارة</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-left md:text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-500">حالة النظام</p>
              <p className="text-xs font-bold text-emerald-600 flex items-center justify-end gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                متصل ولحظي
              </p>
            </div>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 rounded-xl font-bold px-4 py-2 flex items-center gap-2 shadow-sm bg-white/50 backdrop-blur-sm transition-all text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </Button>
          </div>
        </header>

        {/* Dashboard Content with Page Transition */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
