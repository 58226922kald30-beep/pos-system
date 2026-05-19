"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Plus, CalendarDays, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { demoDb } from "@/lib/demoDb";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    const isDemoMode = false;
    
    if (isDemoMode) {
      setIsDemo(true);
      setExpenses(demoDb.getExpenses());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.from("expenses").select("*").order("date", { ascending: false });
      if (error) throw error;
      setExpenses(data || []);
    } catch (err) {
      toast.error("حدث خطأ في تحميل المصروفات");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("أدخل مبلغاً صحيحاً");
      return;
    }

    if (isDemo) {
      const newExp = demoDb.addExpense({ amount: numAmount, description });
      setExpenses([newExp, ...expenses]);
      setAmount("");
      setDescription("");
      toast.success("تم إضافة المصروف تجريبياً!");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("expenses").insert([{ amount: numAmount, description, created_by: user?.id }]);
      if (error) throw error;
      
      toast.success("تم إضافة المصروف بنجاح");
      setAmount("");
      setDescription("");
      fetchExpenses();
    } catch (err: any) {
      toast.error("فشل في الإضافة");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;

    if (isDemo) {
      demoDb.deleteExpense(id);
      setExpenses(expenses.filter(e => e.id !== id));
      toast.success("تم الحذف");
      return;
    }

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("تم الحذف");
      fetchExpenses();
    } catch (err) {
      toast.error("فشل في الحذف");
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-500">
              <Wallet className="w-6 h-6" />
            </div>
            المصروفات التشغيلية
          </h2>
          <p className="text-slate-500 font-semibold text-sm mt-2">سجل فواتير ورواتب المحل ليتم خصمها من الأرباح الصافية تلقائياً</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-6">
        {/* Add Expense Form */}
        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl h-fit overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-lg font-black text-slate-800">إضافة مصروف جديد</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleAddExpense} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-600 font-bold">المبلغ (ج.م)</Label>
                <Input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="مثال: 5000"
                  className="bg-white border-slate-200 text-slate-800 rounded-xl font-semibold focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all shadow-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 font-bold">الوصف / البيان</Label>
                <Input 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: فاتورة إنترنت"
                  className="bg-white border-slate-200 text-slate-800 rounded-xl font-semibold focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all shadow-sm"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-bold rounded-xl py-6 shadow-lg shadow-rose-200 border-0">
                <Plus className="w-5 h-5 ml-2" /> تسجيل المصروف
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <Card className="md:col-span-2 border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg font-black text-slate-800">سجل المصروفات</CardTitle>
              <CardDescription className="text-slate-500 font-semibold mt-1">جميع المصروفات المسجلة حديثاً</CardDescription>
            </div>
            <div className="text-left bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
              <span className="text-xs text-slate-400 font-bold block mb-1">الإجمالي</span>
              <div className="text-xl font-black text-rose-500">{totalExpenses.toLocaleString()} ج.م</div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-400 font-semibold">جاري التحميل...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-semibold">لا يوجد مصروفات مسجلة</div>
            ) : (
              <AnimatePresence>
                {expenses.map((exp) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={exp.id} 
                    className="flex justify-between items-center p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
                  >
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                        <Wallet className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-800">{exp.description}</h4>
                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-1">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          {format(new Date(exp.date), "dd MMMM yyyy", { locale: ar })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <span className="font-black text-rose-600 text-lg">{Number(exp.amount).toLocaleString()} ج.م</span>
                      <Button onClick={() => handleDelete(exp.id)} variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl bg-slate-50 border border-slate-100">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
