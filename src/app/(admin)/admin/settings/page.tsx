"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Store, Receipt } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const [storeName, setStoreName] = useState("سول فيت SoulFit");
  const [storeAddress, setStoreAddress] = useState("شارع الموضة، مقابل السوق الرئيسي");
  const [receiptFooter, setReceiptFooter] = useState("شكراً لتسوقكم معنا! سياسة الاسترجاع خلال 14 يوم.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedSettings = localStorage.getItem("pos_settings");
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      if (parsed.storeName) setStoreName(parsed.storeName);
      if (parsed.storeAddress) setStoreAddress(parsed.storeAddress);
      if (parsed.receiptFooter) setReceiptFooter(parsed.receiptFooter);
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      localStorage.setItem("pos_settings", JSON.stringify({ storeName, storeAddress, receiptFooter }));
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (err) {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 max-w-5xl mx-auto">
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600 shadow-sm border border-slate-200">
              <Settings className="w-6 h-6" />
            </div>
            إعدادات النظام المتجر
          </h2>
          <p className="text-slate-500 font-semibold text-sm mt-2">تخصيص بيانات المتجر والفاتورة للعملاء لتعكس هويتك</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden h-fit">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-500" />
              المعلومات الأساسية
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-600 font-bold">اسم المتجر</Label>
                <Input 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="bg-white border-slate-200 text-slate-800 rounded-xl font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 font-bold">عنوان المتجر / الفرع</Label>
                <Input 
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  className="bg-white border-slate-200 text-slate-800 rounded-xl font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 font-bold">تذييل الفاتورة (ملاحظات للعميل)</Label>
                <Input 
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="bg-white border-slate-200 text-slate-800 rounded-xl font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-6 font-bold shadow-lg shadow-indigo-200 border-0 mt-2">
                <Save className="w-5 h-5 ml-2" />
                {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Receipt Preview */}
        <Card className="border border-slate-200 bg-slate-50 shadow-md rounded-3xl overflow-hidden h-fit">
          <CardHeader className="bg-white border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-500" />
              معاينة رأس وتذييل الفاتورة
            </CardTitle>
            <CardDescription className="text-slate-500 font-semibold mt-1">هكذا ستظهر بيانات المتجر عند طباعة الإيصال</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-8 bg-white rounded-2xl text-black text-center border-t-[12px] border-t-slate-800 shadow-xl shadow-slate-200"
            >
              <h3 className="text-2xl font-black uppercase tracking-wider text-slate-900">{storeName}</h3>
              <p className="text-sm font-semibold text-slate-500 mt-2">{storeAddress}</p>
              
              <div className="my-8 border-t-2 border-dashed border-slate-200 py-8 relative">
                <div className="absolute left-[-40px] top-[-10px] w-5 h-5 rounded-full bg-slate-50" />
                <div className="absolute right-[-40px] top-[-10px] w-5 h-5 rounded-full bg-slate-50" />
                <p className="text-slate-400 font-bold text-sm italic">... محتوى الفاتورة (المنتجات، الأسعار) ...</p>
              </div>

              <p className="text-xs font-bold text-slate-700 leading-relaxed">{receiptFooter}</p>
              <p className="text-[10px] font-semibold text-slate-400 mt-4 bg-slate-50 inline-block px-3 py-1 rounded-md border border-slate-100">النظام مدعوم بواسطة Anti-Gravity POS</p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
