"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserPlus, 
  KeyRound, 
  UserCheck, 
  UserX, 
  Trash2, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  ShoppingBag,
  Eye,
  EyeOff,
  UserCheck2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Cashier {
  id: string;
  name: string;
  pin_code: string;
  is_active: boolean;
  created_at: string;
}

interface CashierStats {
  id: string;
  name: string;
  isActive: boolean;
  totalSales: number;
  totalOrders: number;
  weeklySales: number;
  monthlySales: number;
  yearlySales: number;
}

export default function CashiersManagement() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [stats, setStats] = useState<CashierStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

  // Form states
  const [name, setName] = useState("");
  const [pinCode, setPinCode] = useState("");

  useEffect(() => {
    fetchCashiersAndStats();
  }, []);

  const fetchCashiersAndStats = async () => {
    setLoading(true);
    try {
      // 1. Fetch cashiers
      const { data: cashiersData, error: cashiersError } = await supabase
        .from("cashiers")
        .select("*")
        .order("created_at", { ascending: false });

      if (cashiersError) throw cashiersError;
      
      const cashierList: Cashier[] = cashiersData || [];
      setCashiers(cashierList);

      // 2. Fetch sales to calculate stats
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("id, total_price, created_at, pos_cashier_id");

      if (salesError) throw salesError;

      const sales: any[] = salesData || [];

      // Calculate stats per cashier
      const calculatedStats: CashierStats[] = cashierList.map(cashier => {
        const cashierSales = sales.filter(s => s.pos_cashier_id === cashier.id);
        
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

        let totalSales = 0;
        let weeklySales = 0;
        let monthlySales = 0;
        let yearlySales = 0;

        cashierSales.forEach(s => {
          const price = Number(s.total_price) || 0;
          const saleDate = new Date(s.created_at);

          totalSales += price;
          if (saleDate >= oneWeekAgo) weeklySales += price;
          if (saleDate >= oneMonthAgo) monthlySales += price;
          if (saleDate >= oneYearAgo) yearlySales += price;
        });

        return {
          id: cashier.id,
          name: cashier.name,
          isActive: cashier.is_active,
          totalSales,
          totalOrders: cashierSales.length,
          weeklySales,
          monthlySales,
          yearlySales
        };
      });

      setStats(calculatedStats);
    } catch (err: any) {
      console.error(err);
      toast.error("حدث خطأ أثناء تحميل البيانات: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pinCode.trim()) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    if (pinCode.length !== 4 || isNaN(Number(pinCode))) {
      toast.error("يجب أن يتكون الرمز السري من 4 أرقام فقط");
      return;
    }

    try {
      const { error } = await supabase
        .from("cashiers")
        .insert([{ name: name.trim(), pin_code: pinCode.trim() }]);

      if (error) {
        if (error.code === "23505") throw new Error("اسم الكاشير مسجل بالفعل!");
        throw error;
      }

      toast.success(`تمت إضافة الكاشير "${name}" بنجاح!`);
      setName("");
      setPinCode("");
      setShowAddDialog(false);
      fetchCashiersAndStats();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الإضافة");
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("cashiers")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success("تم تحديث حالة الكاشير بنجاح");
      fetchCashiersAndStats();
    } catch (err: any) {
      toast.error("فشل التحديث: " + err.message);
    }
  };

  const handleDelete = async (id: string, cashierName: string) => {
    if (!confirm(`هل أنت متأكد من حذف الكاشير "${cashierName}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    
    try {
      const { error } = await supabase
        .from("cashiers")
        .delete()
        .eq("id", id);

      if (error) {
        if (error.code === "23503") {
          throw new Error("لا يمكن حذف الكاشير لوجود مبيعات مرتبطة به. يمكنك إلغاء تفعيل حسابه بدلاً من الحذف.");
        }
        throw error;
      }
      toast.success("تم حذف الكاشير بنجاح");
      fetchCashiersAndStats();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء الحذف");
    }
  };

  const togglePinVisibility = (id: string) => {
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            إدارة الكاشيرية والتقييم
          </h2>
          <p className="text-slate-500 text-sm mt-1">أضف كاشير جديد، وتابع أداء مبيعاتهم اليومية، الأسبوعية والسنوية بأرقام حقيقية.</p>
        </div>

        <Button 
          onClick={() => setShowAddDialog(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold py-6 px-6 shadow-lg shadow-indigo-100 flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          إضافة كاشير جديد
        </Button>
      </div>

      {/* Tabs list */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="bg-slate-100 p-1.5 rounded-2xl mb-6">
          <TabsTrigger value="stats" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-none">
            <TrendingUp className="w-4 h-4 ml-2" />
            تقييم أداء الكاشيرية 📊
          </TabsTrigger>
          <TabsTrigger value="list" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-none">
            <Users className="w-4 h-4 ml-2" />
            قائمة الحسابات والأمان 🔐
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Stats & Performance */}
        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {loading ? (
              <Card className="border-0 shadow-sm py-16 text-center">
                <CardContent className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-slate-500 text-sm font-semibold">جاري حساب المبيعات والتقييمات...</span>
                </CardContent>
              </Card>
            ) : stats.length === 0 ? (
              <Card className="border-0 shadow-sm py-16 text-center text-slate-400">
                <CardContent className="flex flex-col items-center gap-4">
                  <Users className="w-16 h-16 opacity-30 text-slate-500" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-700">لا يوجد كاشيرية مضافين حالياً</h3>
                    <p className="text-xs mt-1 text-slate-400">قم بإضافة كاشير جديد من الزر في الأعلى للبدء بالتقييم.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stats.map((c) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={c.id}
                  >
                    <Card className="border-slate-100 bg-white shadow-md rounded-3xl overflow-hidden hover:shadow-lg transition-all relative">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                      
                      <CardHeader className="flex flex-row justify-between items-center pb-4">
                        <div>
                          <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                            {c.name}
                            <span className={`w-2.5 h-2.5 rounded-full ${c.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} title={c.isActive ? "نشط" : "موقف"} />
                          </CardTitle>
                          <CardDescription className="text-xs">احصائيات ومبيعات حقيقية</CardDescription>
                        </div>
                        <div className="bg-indigo-50 text-indigo-700 font-extrabold text-xs px-3 py-1.5 rounded-xl border border-indigo-100/50">
                          {c.totalOrders} فواتير مباعة
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Weekly, Monthly, Yearly Cards grid */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                            <span className="text-[10px] text-slate-400 font-bold block mb-1">مبيعات أسبوعية</span>
                            <span className="text-slate-800 font-black text-xs md:text-sm">{c.weeklySales.toLocaleString()} ج.م</span>
                          </div>
                          <div className="bg-indigo-50/40 border border-indigo-50/60 p-3 rounded-2xl text-center">
                            <span className="text-[10px] text-indigo-500 font-bold block mb-1">مبيعات شهرية</span>
                            <span className="text-indigo-900 font-black text-xs md:text-sm">{c.monthlySales.toLocaleString()} ج.م</span>
                          </div>
                          <div className="bg-purple-50/40 border border-purple-50/60 p-3 rounded-2xl text-center">
                            <span className="text-[10px] text-purple-500 font-bold block mb-1">مبيعات سنوية</span>
                            <span className="text-purple-900 font-black text-xs md:text-sm">{c.yearlySales.toLocaleString()} ج.م</span>
                          </div>
                        </div>

                        {/* Total sales summary */}
                        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
                              <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                              <span className="text-[10px] text-indigo-200 font-bold block">إجمالي كافة المبيعات</span>
                              <span className="text-base font-black">{c.totalSales.toLocaleString()} ج.م</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-indigo-200 font-bold block">كفاءة الأداء</span>
                            <span className="text-xs font-extrabold text-emerald-400">ممتازة 🔥</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Accounts & Security */}
        <TabsContent value="list" className="space-y-6">
          <Card className="border-slate-100 shadow-md rounded-3xl overflow-hidden bg-white/70 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black text-slate-800">حسابات الكاشيرية النشطة والرموز السرية</CardTitle>
              <CardDescription className="text-xs">تحكم في تفعيل الحسابات أو تعديل الرموز السرية لضمان أمان النظام.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-10">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                </div>
              ) : cashiers.length === 0 ? (
                <div className="text-center py-10 text-slate-400 font-semibold text-sm">
                  لا يوجد حسابات كاشيرية مضافة حالياً.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                  <Table className="text-right">
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-right font-bold text-slate-500 py-4">اسم الكاشير</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 py-4">الرمز السري PIN</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 py-4">تاريخ الإضافة</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 py-4">حالة الحساب</TableHead>
                        <TableHead className="text-center font-bold text-slate-500 py-4">التحكم</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashiers.map((c) => (
                        <TableRow key={c.id} className="hover:bg-slate-50/40 border-b border-slate-100/60">
                          <TableCell className="font-extrabold text-slate-800 py-4">{c.name}</TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black tracking-widest text-indigo-600 bg-indigo-50/60 px-3 py-1 rounded-lg text-sm">
                                {visiblePins[c.id] ? c.pin_code : "••••"}
                              </span>
                              <button 
                                onClick={() => togglePinVisibility(c.id)}
                                className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                              >
                                {visiblePins[c.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500 py-4 text-xs font-semibold">
                            {new Date(c.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </TableCell>
                          <TableCell className="py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                              c.is_active 
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                : "bg-red-50 text-red-600 border border-red-100"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                              {c.is_active ? "نشط" : "موقف"}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleStatus(c.id, c.is_active)}
                                className={`rounded-xl font-bold text-xs ${
                                  c.is_active 
                                    ? "border-amber-200 text-amber-600 hover:bg-amber-50" 
                                    : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                }`}
                              >
                                {c.is_active ? "إيقاف مؤقت" : "تفعيل الحساب"}
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(c.id, c.name)}
                                className="border-red-100 text-red-600 hover:bg-red-50 rounded-xl"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add New Cashier Dialog */}
      <AnimatePresence>
        {showAddDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative border border-slate-100"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
              
              <div className="p-6 border-b border-slate-100 flex items-center justify-between mt-2">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  إضافة كاشير جديد للنظام
                </h3>
              </div>

              <form onSubmit={handleAddCashier} className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cashierName" className="text-slate-600 font-bold">اسم الكاشير بالكامل</Label>
                  <Input
                    id="cashierName"
                    type="text"
                    placeholder="مثال: أحمد محمد عبد الله"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl py-5 font-semibold text-right"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cashierPin" className="text-slate-600 font-bold">الرمز السري (PIN) للدخول السريع</Label>
                  <Input
                    id="cashierPin"
                    type="password"
                    maxLength={4}
                    placeholder="رمز مكون من 4 أرقام فقط (مثال: 1234)"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    required
                    className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl py-5 font-mono text-center tracking-widest"
                  />
                  <span className="text-[10px] text-slate-400 font-bold block">سيستخدم الكاشير هذا الرمز السري للدخول إلى شاشة المبيعات (POS) بسرعة.</span>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-6"
                  >
                    تأكيد وإضافة كاشير
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setName("");
                      setPinCode("");
                    }}
                    className="border-slate-200 text-slate-600 font-bold rounded-xl py-6"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
