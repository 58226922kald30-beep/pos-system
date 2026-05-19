"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, Store, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // Sign Up Mode
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || "المدير",
            }
          }
        });

        if (error) throw error;

        // Immediately attempt to log in or instruct
        toast.success("تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...");
        
        // Wait 1 second and login
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        localStorage.setItem("pos_role", "admin");
        localStorage.setItem("pos_user", JSON.stringify({ name: fullName || "المدير", email }));
        localStorage.setItem("pos_is_demo", "false");

        toast.success(`أهلاً بك كمدير للنظام!`);
        router.push("/admin");
        return;
      }

      // First attempt Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Check user role from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        // Fallback: If profile doesn't exist yet, insert one automatically as admin
        const { error: insertError } = await supabase.from("profiles").insert([
          { id: data.user.id, full_name: data.user.user_metadata?.full_name || "مستخدم", role: "admin" }
        ]);
        if (insertError) throw profileError;

        localStorage.setItem("pos_role", "admin");
        localStorage.setItem("pos_user", JSON.stringify({ name: data.user.user_metadata?.full_name || "مستخدم", email }));
      } else {
        localStorage.setItem("pos_role", profile.role);
        localStorage.setItem("pos_user", JSON.stringify({ name: profile.full_name, email }));
      }

      localStorage.setItem("pos_is_demo", "false");
      toast.success(`أهلاً بك، ${data.user.user_metadata?.full_name || 'مستخدم'}!`);

      const currentRole = localStorage.getItem("pos_role") || "admin";
      if (currentRole === "admin") {
        router.push("/admin");
      } else {
        router.push("/pos");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "خطأ في تسجيل الدخول. تأكد من البيانات.");
    } finally {
      setLoading(false);
    }
  };



  const fillManagerCredentials = () => {
    setFullName("مدير المتجر الحقيقي");
    setEmail("58226922kald10@gmail.com");
    setPassword("0112966494Kk@");
    toast.info("تمت تعبئة بيانات المدير الحقيقي الخاصة بك!");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-radial from-[#1e2330] via-[#0d0f14] to-[#0a0b0e] p-4">
      {/* Background visual decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md z-10 transition-all duration-300 hover:scale-[1.01]">
        <Card className="border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          {/* Top subtle border highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <CardHeader className="text-center pt-8">
            <div className="mx-auto bg-gradient-to-tr from-violet-600 to-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-4 ring-1 ring-white/20">
              <Store className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              سول فيت <span className="text-indigo-400 text-lg font-light">SoulFit</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm mt-1">
              {isSignUp ? "سجل حسابك الحقيقي لتفعيل النظام بالكامل" : "نظام المبيعات وإدارة المخازن الذكي لمحلات الأحذية"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-slate-300">الاسم الكامل</Label>
                  <div className="relative">
                    <UserIcon className="absolute right-3 top-2.5 h-5 w-5 text-slate-500" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="الاسم الثلاثي"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={isSignUp}
                      className="bg-white/5 border-white/10 text-white placeholder-slate-500 pr-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-semibold"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-2.5 h-5 w-5 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@store.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder-slate-500 pr-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-semibold text-right"
                    style={{ direction: 'ltr' }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-2.5 h-5 w-5 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder-slate-500 pr-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl font-semibold text-right"
                    style={{ direction: 'ltr' }}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-6 rounded-xl font-bold shadow-lg shadow-indigo-600/30 transition-all text-base"
              >
                {loading ? "جاري المعالجة..." : isSignUp ? "إنشاء الحساب وتفعيله" : "تسجيل الدخول"}
              </Button>
            </form>

            {/* Quick Fill Credentials for the user */}
            <div className="text-center">
              <button
                type="button"
                onClick={fillManagerCredentials}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline transition-colors"
              >
                اضغط هنا لتعبئة بيانات حساب المدير الحقيقي الخاص بك تلقائياً ✨
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
              >
                {isSignUp ? "لديك حساب بالفعل؟ سجل دخولك" : "ليس لديك حساب؟ أنشئ حساباً جديداً"}
              </button>
            </div>


          </CardContent>

          <CardFooter className="pb-8 pt-4 flex flex-col items-center">
            <span className="text-xs text-slate-600 font-bold">
              جميع الحقوق محفوظة © 2026 SoulFit
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

