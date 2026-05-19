"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ReceiptText, ArrowRightLeft, User, CalendarDays, Eye, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const demoSales = [
  { id: "1234-abcd", total_price: 1400, discount: 0, created_at: new Date().toISOString(), cashier: { full_name: "مدير تجريبي" }, items: [{ product: { name: "نايكي إير ماكس 270", price: 1400 }, quantity: 1 }] },
  { id: "5678-efgh", total_price: 2500, discount: 100, created_at: new Date(Date.now() - 86400000).toISOString(), cashier: { full_name: "كاشير تجريبي" }, items: [{ product: { name: "أديداس ألترا بوست", price: 1600 }, quantity: 1 }, { product: { name: "بوما سويد كلاسيك", price: 1000 }, quantity: 1 }] },
];

import { demoDb } from "@/lib/demoDb";

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    const isDemoMode = false;
    
    if (isDemoMode) {
      setIsDemo(true);
      setSales(demoDb.getSales());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id, total_price, discount, created_at,
          profiles(full_name),
          sale_items(quantity, unit_price, products(name, price))
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err: any) {
      setIsDemo(true);
      setSales(demoDb.getSales());
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (saleId: string) => {
    if (!confirm("هل أنت متأكد من إرجاع هذه الفاتورة؟ سيتم إعادة المنتجات للمخزن.")) return;

    if (isDemo) {
      const success = demoDb.refundSale(saleId);
      if (success) {
        toast.success("تم إرجاع الفاتورة التجريبية وإعادة المخزون بنجاح!");
        setSales(sales.filter(s => s.id !== saleId));
        setSelectedSale(null);
      } else {
        toast.error("فشل في إرجاع الفاتورة التجريبية.");
      }
      return;
    }

    try {
      const saleToRefund = sales.find(s => s.id === saleId);
      if (!saleToRefund) return;

      for (const item of saleToRefund.sale_items) {
        const { data: pData } = await supabase.from("products").select("stock").eq("name", item.products.name).single();
        if (pData) {
          await supabase.from("products").update({ stock: pData.stock + item.quantity }).eq("name", item.products.name);
        }
      }

      const { error } = await supabase.from("sales").delete().eq("id", saleId);
      if (error) throw error;

      toast.success("تم إرجاع الفاتورة وإعادة المخزون بنجاح.");
      setSelectedSale(null);
      fetchSales();
    } catch (err: any) {
      toast.error("فشل في إرجاع الفاتورة.");
    }
  };

  const filteredSales = sales.filter(s => s.id.toLowerCase().includes(search.toLowerCase()));

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ReceiptText className="w-6 h-6" />
            </div>
            سجل المبيعات والمرتجعات
          </h2>
          <p className="text-slate-500 font-semibold text-sm mt-2">مراجعة الفواتير السابقة وإجراء المرتجعات بسهولة</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid md:grid-cols-3 gap-6">
        {/* Sales List */}
        <Card className="md:col-span-2 border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <div className="relative">
              <Search className="absolute right-4 top-3.5 h-5 w-5 text-slate-400" />
              <Input
                placeholder="ابحث برقم الفاتورة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-white border-slate-200 text-slate-800 pr-11 py-6 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-semibold shadow-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400 font-semibold">جاري التحميل...</div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-semibold">لا توجد فواتير مطابقة</div>
            ) : (
              <AnimatePresence>
                {filteredSales.map((sale) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    key={sale.id}
                    onClick={() => setSelectedSale(sale)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedSale?.id === sale.id 
                      ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                      : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 shadow-sm"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black font-mono text-slate-800">#{sale.id.slice(0,8)}</span>
                        <span className="text-xs text-indigo-700 bg-indigo-100/50 px-3 py-1 rounded-lg font-bold border border-indigo-100">
                          {sale.profiles?.full_name || sale.cashier?.full_name || "مجهول"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
                        <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-slate-400"/> {format(new Date(sale.created_at), "dd MMMM yyyy - hh:mm a", { locale: ar })}</span>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-0 flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
                      <div className="text-right">
                        <div className="text-base font-black text-emerald-600">{sale.total_price.toLocaleString()} ج.م</div>
                        {sale.discount > 0 && <div className="text-xs text-red-500 font-bold mt-0.5">خصم: {sale.discount}</div>}
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl">
                        <Eye className="w-5 h-5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>

        {/* Sale Details Pane */}
        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl h-fit sticky top-6 overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-lg font-black text-slate-800">تفاصيل الفاتورة</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <AnimatePresence mode="wait">
              {selectedSale ? (
                <motion.div 
                  key={selectedSale.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  className="space-y-5"
                >
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 text-sm font-semibold text-slate-600">
                    <div className="flex justify-between items-center">
                      <span>رقم الفاتورة:</span>
                      <span className="font-mono text-slate-900 font-bold bg-white px-2 py-1 rounded-md border border-slate-200">{selectedSale.id.slice(0,8)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>الكاشير:</span>
                      <span className="text-slate-900 font-bold">{selectedSale.profiles?.full_name || selectedSale.cashier?.full_name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>التاريخ:</span>
                      <span className="text-slate-900 font-bold">{format(new Date(selectedSale.created_at), "dd/MM/yyyy")}</span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-black text-slate-400 mb-3 uppercase tracking-wider">المنتجات المباعة:</h5>
                    <div className="space-y-3">
                      {(selectedSale.sale_items || selectedSale.items).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="text-slate-800 font-bold">{item.products?.name || item.product?.name}</p>
                            <p className="text-xs text-slate-500 font-semibold mt-1">{item.quantity} x {item.unit_price || item.product?.price} ج.م</p>
                          </div>
                          <span className="font-black text-indigo-600">{(item.quantity * (item.unit_price || item.product?.price)).toLocaleString()} ج.م</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <Button 
                      onClick={() => handleRefund(selectedSale.id)}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-2xl py-6 font-bold shadow-sm"
                    >
                      <ArrowRightLeft className="w-5 h-5 ml-2" />
                      إرجاع الفاتورة (Refund)
                    </Button>
                    <p className="text-[10px] text-center font-semibold text-slate-400 mt-3 px-4">سيتم خصم الفاتورة من الأرباح وإعادة المنتجات للمخزون تلقائياً.</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-slate-400 flex flex-col items-center gap-3">
                  <ReceiptText className="w-12 h-12 text-slate-200" />
                  <span className="font-semibold">اختر فاتورة لعرض التفاصيل وإدارة المرتجعات</span>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
