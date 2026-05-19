"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, Mail, Store, User as UserIcon, ShieldAlert, KeyRound, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState("manager");
  
  // Manager Credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Cashier PIN Credentials
  const [cashiers, setCashiers] = useState<any[]>([]);
  const [selectedCashierId, setSelectedCashierId] = useState("");
  const [cashierPin, setCashierPin] = useState("");
  
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchActiveCashiers();
  }, []);

  const fetchActiveCashiers = async () => {
    try {
      const { data, error } = await supabase
        .from("cashiers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
        
      if (!error && data) {
        setCashiers(data);
        if (data.length > 0) {
          setSelectedCashierId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First attempt Supabase auth
      let { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Fallback: If login fails (user not found), try to sign up automatically
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: "المدير" }
          }
        });
        
        if (signUpError) throw signUpError;
        
        // After signup, attempt to sign in again
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (retryError) throw retryError;
        data = retryData;
      }

      if (!data.user) throw new Error("فشل تسجيل الدخول: المستخدم غير موجود");

      // Check user role from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        // Fallback: If profile doesn't exist yet, insert one automatically as admin
        const { error: insertError } = await supabase.from("profiles").insert([
          { id: data.user.id, full_name: data.user.user_metadata?.full_name || "المدير", role: "admin" }
        ]);
        if (insertError) throw profileError;

        localStorage.setItem("pos_role", "admin");
        localStorage.setItem("pos_user", JSON.stringify({ name: data.user.user_metadata?.full_name || "المدير", email }));
      } else {
        localStorage.setItem("pos_role", profile.role);
        localStorage.setItem("pos_user", JSON.stringify({ name: profile.full_name, email }));
      }

      localStorage.setItem("pos_is_demo", "false");
      toast.success(`أهلاً بك كمدير للنظام، ${data.user.user_metadata?.full_name || 'المدير'}! 👑`);
      router.push("/admin");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "خطأ في تسجيل الدخول. تأكد من البيانات.");
    } finally {
      setLoading(false);
    }
  };

  const handleCashierLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCashierId) {
      toast.error("يرجى إضافة كشيرية أولاً من لوحة تحكم المدير!");
      return;
    }
    if (cashierPin.length !== 4 || isNaN(Number(cashierPin))) {
      toast.error("يجب إدخال رمز سري PIN مكون من 4 أرقام");
      return;
    }
    setLoading(true);

    try {
      // 1. Authenticate with Supabase under the hood using a shared cashier account.
      const sharedEmail = "cashier@soulfit.com";
      const sharedPassword = "SharedCashierPassword123!";

      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: sharedEmail,
        password: sharedPassword
      });

      if (authError) {
        // Try to automatically sign up this shared account if it doesn't exist
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: sharedEmail,
          password: sharedPassword,
          options: {
            data: {
              full_name: "كاشير النظام",
            }
          }
        });

        if (signUpError) throw signUpError;
        
        // Try sign in again after sign up
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email: sharedEmail,
          password: sharedPassword
        });

        if (retryError) throw retryError;
        authData = retryData;
      }

      // 2. Query cashiers table to verify PIN
      const { data: cashier, error: queryError } = await supabase
        .from("cashiers")
        .select("*")
        .eq("id", selectedCashierId)
        .eq("pin_code", cashierPin)
        .eq("is_active", true)
        .single();

      if (queryError || !cashier) {
        // Sign out from Supabase since PIN was wrong
        await supabase.auth.signOut().catch(() => {});
        throw new Error("الرمز السري PIN غير صحيح! يرجى المحاولة مرة أخرى.");
      }

      // Store cashier details in localStorage
      localStorage.setItem("pos_role", "cashier");
      localStorage.setItem("pos_user", JSON.stringify({ name: cashier.name, id: cashier.id }));
      localStorage.setItem("pos_is_demo", "false");

      toast.success(`أهلاً بك يا ${cashier.name}! بالتوفيق في ورديتك اليوم 🛒✨`);
      router.push("/pos");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "فشل تسجيل دخول الكاشير. تأكد من الرمز السري.");
    } finally {
      setLoading(false);
    }
  };

  const fillManagerCredentials = () => {
    setEmail("58226922kald10@gmail.com");
    setPassword("0112966494Kk@");
    toast.info("تمت تعبئة بيانات المدير الحقيقي الخاصة بك!");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-radial from-[#1e2330] via-[#0d0f14] to-[#0a0b0e] p-4">
      {/* Background visual decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md z-10 transition-all duration-300 hover:scale-[1.01]">
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden rounded-3xl">
          {/* Top subtle border highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <CardHeader className="text-center pt-8">
            <div className="mx-auto bg-gradient-to-tr from-indigo-600 to-violet-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-4 ring-1 ring-white/20">
              <Store className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              سول فيت <span className="text-indigo-400 text-lg font-light">SoulFit</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-1">
              نظام المبيعات وإدارة المخازن الذكي لمحلات الأحذية
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-2">
            <Tabs defaultValue="manager" onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl w-full grid grid-cols-2 mb-6">
                <TabsTrigger value="manager" className="rounded-xl font-bold py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs">
                  دخول الإدارة 👑
                </TabsTrigger>
                <TabsTrigger value="cashier" className="rounded-xl font-bold py-2.5 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs">
                  دخول الكاشير 🛒
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Manager Login */}
              <TabsContent value="manager">
                <form onSubmit={handleManagerLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300 font-bold text-xs">البريد الإلكتروني للمدير</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-2.5 h-5 w-5 text-slate-500" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@store.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder-slate-600 pr-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-semibold text-right"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-300 font-bold text-xs">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-2.5 h-5 w-5 text-slate-500" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder-slate-600 pr-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-semibold text-right"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-6 rounded-xl font-black shadow-lg shadow-indigo-600/30 transition-all text-base mt-2 border-0"
                  >
                    {loading ? "جاري الدخول..." : "تسجيل دخول المدير"}
                  </Button>
                </form>

                {/* Quick Fill Credentials for the user */}
                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={fillManagerCredentials}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline transition-colors"
                  >
                    اضغط هنا لتعبئة بيانات حساب المدير الحقيقي الخاص بك تلقائياً ✨
                  </button>
                </div>
              </TabsContent>

              {/* Tab 2: Cashier Login */}
              <TabsContent value="cashier">
                <form onSubmit={handleCashierLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cashierSelect" className="text-slate-300 font-bold text-xs">اسم الكاشير</Label>
                    {cashiers.length === 0 ? (
                      <div className="bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-xl p-4 text-xs font-semibold flex items-start gap-2.5">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          لا يوجد كاشيرية مضافين للنظام حالياً!
                          <span className="block mt-1 text-slate-400">يرجى تسجيل الدخول أولاً كمدير لإضافة الكاشيرية من إدارة الكاشيرية.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <UserIcon className="absolute right-3 top-3 h-5 w-5 text-slate-500" />
                        <select
                          id="cashierSelect"
                          value={selectedCashierId}
                          onChange={(e) => setSelectedCashierId(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-white pr-10 pl-3 py-3.5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-bold text-sm appearance-none cursor-pointer"
                        >
                          {cashiers.map((c) => (
                            <option key={c.id} value={c.id} className="bg-slate-900 text-white font-semibold">
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pinCode" className="text-slate-300 font-bold text-xs">الرمز السري (PIN)</Label>
                    <div className="relative">
                      <KeyRound className="absolute right-3 top-2.5 h-5 w-5 text-slate-500" />
                      <Input
                        id="pinCode"
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={cashierPin}
                        onChange={(e) => setCashierPin(e.target.value)}
                        required
                        disabled={cashiers.length === 0}
                        className="bg-white/5 border-white/10 text-white placeholder-slate-600 pr-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-mono text-center tracking-widest text-lg"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || cashiers.length === 0}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-6 rounded-xl font-black shadow-lg shadow-indigo-600/30 transition-all text-base mt-2 border-0"
                  >
                    {loading ? "جاري التحقق..." : "دخول سريع ككاشير"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="pb-8 pt-4 flex flex-col items-center">
            <span className="text-[10px] text-slate-600 font-bold">
              جميع الحقوق محفوظة © 2026 SoulFit
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
