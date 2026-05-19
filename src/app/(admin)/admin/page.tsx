"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle,
  ArrowUpRight,
  ShoppingBag
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { supabase } from "@/lib/supabase/client";



import { demoDb } from "@/lib/demoDb";

export default function AdminDashboard() {
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">("week");
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    productCount: 0,
    lowStockCount: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [rawSales, setRawSales] = useState<any[]>([]);
  const [rawExpenses, setRawExpenses] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const isDemoMode = false;
      
      if (isDemoMode) {
        setIsDemo(true);
        const products = demoDb.getProducts();
        const sales = demoDb.getSales();
        const expenses = demoDb.getExpenses();
        setRawProducts(products);
        setRawSales(sales);
        setRawExpenses(expenses);
        return;
      }

      try {
        const { data: products, error: pError } = await supabase.from("products").select("id, name, stock, price, cost");
        if (pError) throw pError;

        const { data: sales, error: sError } = await supabase
          .from("sales")
          .select("id, total_price, discount, created_at, sale_items(product_id, quantity, unit_price, cost_price)");
        if (sError) throw sError;

        const { data: expenses, error: eError } = await supabase.from("expenses").select("amount, date");
        if (eError) throw eError;

        setRawProducts(products || []);
        setRawSales(sales || []);
        setRawExpenses(expenses || []);
      } catch (err) {
        setIsDemo(true);
        const products = demoDb.getProducts();
        const sales = demoDb.getSales();
        const expenses = demoDb.getExpenses();
        setRawProducts(products);
        setRawSales(sales);
        setRawExpenses(expenses);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (rawProducts.length === 0 && rawSales.length === 0 && rawExpenses.length === 0) {
      return;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Filter sales and expenses by timeframe
    const filteredSales = rawSales.filter(sale => {
      const saleDate = new Date(sale.created_at);
      if (timeframe === "day") return saleDate >= startOfToday && saleDate <= endOfToday;
      if (timeframe === "week") return saleDate >= startOfWeek && saleDate <= now;
      if (timeframe === "month") return saleDate >= startOfMonth && saleDate <= now;
      if (timeframe === "year") return saleDate >= startOfYear && saleDate <= now;
      return true;
    });

    const filteredExpenses = rawExpenses.filter(exp => {
      const expDate = new Date(exp.date);
      if (timeframe === "day") return expDate >= startOfToday && expDate <= endOfToday;
      if (timeframe === "week") return expDate >= startOfWeek && expDate <= now;
      if (timeframe === "month") return expDate >= startOfMonth && expDate <= now;
      if (timeframe === "year") return expDate >= startOfYear && expDate <= now;
      return true;
    });

    // 1. Calculate stats cards
    const timeframeSalesSum = filteredSales.reduce((sum, s) => sum + Number(s.total_price), 0);

    let timeframeProfitSum = 0;
    filteredSales.forEach(sale => {
      let saleProfit = 0;
      sale.sale_items?.forEach((item: any) => {
        saleProfit += (Number(item.unit_price) - Number(item.cost_price)) * Number(item.quantity);
      });
      saleProfit -= Number(sale.discount || 0);
      timeframeProfitSum += saleProfit;
    });
    const timeframeExpensesSum = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    timeframeProfitSum -= timeframeExpensesSum;

    const productCount = rawProducts.length;
    const lowStock = rawProducts.filter(p => p.stock <= 5);
    const lowStockCount = lowStock.length;
    setLowStockProducts(lowStock.slice(0, 5));

    setStats({
      totalSales: timeframeSalesSum,
      totalProfit: timeframeProfitSum,
      productCount,
      lowStockCount
    });

    // 2. Calculate Top Products in the timeframe
    const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    filteredSales.forEach(sale => {
      sale.sale_items?.forEach((item: any) => {
        const pId = item.product_id;
        const pName = rawProducts.find(p => p.id === pId)?.name || item.products?.name || "حذاء غير معروف";
        if (!productSalesMap[pId]) {
          productSalesMap[pId] = { name: pName, qty: 0, revenue: 0 };
        }
        productSalesMap[pId].qty += Number(item.quantity);
        productSalesMap[pId].revenue += Number(item.quantity) * Number(item.unit_price);
      });
    });
    const sortedTopProducts = Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
    setTopProducts(sortedTopProducts);

    // Helper to calculate profit of a single sale
    const calculateProfit = (sale: any) => {
      let saleProfit = 0;
      sale.sale_items?.forEach((item: any) => {
        saleProfit += (Number(item.unit_price) - Number(item.cost_price)) * Number(item.quantity);
      });
      saleProfit -= Number(sale.discount || 0);
      return saleProfit;
    };

    // 3. Calculate Chart Data
    if (timeframe === "day") {
      const blocks = [
        { name: "09:00", sales: 0, profit: 0 },
        { name: "12:00", sales: 0, profit: 0 },
        { name: "15:00", sales: 0, profit: 0 },
        { name: "18:00", sales: 0, profit: 0 },
        { name: "21:00", sales: 0, profit: 0 },
      ];

      filteredSales.forEach(sale => {
        const d = new Date(sale.created_at);
        const hour = d.getHours();
        let blockIndex = 0;
        if (hour < 10) blockIndex = 0;
        else if (hour < 13) blockIndex = 1;
        else if (hour < 16) blockIndex = 2;
        else if (hour < 19) blockIndex = 3;
        else blockIndex = 4;

        blocks[blockIndex].sales += Number(sale.total_price);
        blocks[blockIndex].profit += calculateProfit(sale);
      });
      setChartData(blocks);
    } else if (timeframe === "week") {
      const arabicDays = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
      const daysData = arabicDays.map(name => ({ name, sales: 0, profit: 0 }));

      filteredSales.forEach(sale => {
        const d = new Date(sale.created_at);
        const dayIndex = d.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
        const mappedIndex = (dayIndex + 1) % 7; // Map to Saturday-indexed arabicDays
        
        daysData[mappedIndex].sales += Number(sale.total_price);
        daysData[mappedIndex].profit += calculateProfit(sale);
      });
      setChartData(daysData);
    } else if (timeframe === "month") {
      const weeksData = [
        { name: "الأسبوع 1", sales: 0, profit: 0 },
        { name: "الأسبوع 2", sales: 0, profit: 0 },
        { name: "الأسبوع 3", sales: 0, profit: 0 },
        { name: "الأسبوع 4", sales: 0, profit: 0 },
      ];

      filteredSales.forEach(sale => {
        const d = new Date(sale.created_at);
        const day = d.getDate();
        let weekIndex = 0;
        if (day <= 7) weekIndex = 0;
        else if (day <= 14) weekIndex = 1;
        else if (day <= 21) weekIndex = 2;
        else weekIndex = 3;

        weeksData[weekIndex].sales += Number(sale.total_price);
        weeksData[weekIndex].profit += calculateProfit(sale);
      });
      setChartData(weeksData);
    } else if (timeframe === "year") {
      const arabicMonths = [
        "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
      ];
      const monthsData = arabicMonths.map(name => ({ name, sales: 0, profit: 0 }));

      filteredSales.forEach(sale => {
        const d = new Date(sale.created_at);
        const monthIndex = d.getMonth();

        monthsData[monthIndex].sales += Number(sale.total_price);
        monthsData[monthIndex].profit += calculateProfit(sale);
      });
      setChartData(monthsData);
    }
  }, [timeframe, rawProducts, rawSales, rawExpenses]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">نظرة عامة على النشاط</h2>
          <p className="text-slate-500 text-sm mt-1">
            {isDemo ? "الوضع التجريبي نشط - تعرض البيانات الافتراضية" : "مباشر من قاعدة بيانات Supabase"}
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm self-start">
          {[
            { id: "day", label: "اليوم" },
            { id: "week", label: "الأسبوع" },
            { id: "month", label: "الشهر" },
            { id: "year", label: "السنة" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeframe(t.id as any)}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
                timeframe === t.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500">إجمالي المبيعات</CardTitle>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800">{stats.totalSales.toLocaleString()} <span className="text-lg text-slate-400">ج.م</span></div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500">الأرباح الصافية</CardTitle>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800">{stats.totalProfit.toLocaleString()} <span className="text-lg text-slate-400">ج.م</span></div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500">المنتجات في المخزن</CardTitle>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-sky-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800">{stats.productCount} <span className="text-lg text-slate-400">موديل</span></div>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden group relative">
          <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-slate-500">نواقص المخزن</CardTitle>
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800">{stats.lowStockCount} <span className="text-lg text-slate-400">نواقص</span></div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl p-2">
          <CardHeader>
            <CardTitle className="text-slate-800 text-lg font-bold">مخطط المبيعات والأرباح</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px] pr-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "16px", color: "#1e293b", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                  labelStyle={{ fontWeight: "bold", color: "#64748b" }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "20px" }} />
                <Area type="monotone" dataKey="sales" name="المبيعات" stroke="#4f46e5" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="profit" name="الأرباح" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl p-2">
          <CardHeader>
            <CardTitle className="text-slate-800 text-lg font-bold">تنبيهات المخزن</CardTitle>
            <CardDescription className="text-slate-500">تحتاج لإعادة تعبئة فوراً</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">المخزون ممتاز!</p>
            ) : (
              lowStockProducts.map((p, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  key={idx} 
                  className="flex items-center justify-between p-3 rounded-2xl bg-red-50 border border-red-100"
                >
                  <div className="min-w-0">
                    <h5 className="text-sm font-bold text-slate-800 truncate max-w-[150px]">{p.name}</h5>
                    <span className="text-xs text-red-600 font-bold mt-1">الكمية المتبقية: {p.stock}</span>
                  </div>
                  <div className="text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-700 font-bold">
                    حرج
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2">
        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl p-2">
          <CardHeader>
            <CardTitle className="text-slate-800 text-lg font-bold">الأحذية الأكثر مبيعاً</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.map((p, idx) => (
              <motion.div 
                whileHover={{ scale: 1.02 }}
                key={idx} 
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-transparent transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <h5 className="text-sm font-bold text-slate-800">{p.name}</h5>
                    <span className="text-xs text-slate-500 font-semibold">بيعت {p.qty} قطعة</span>
                  </div>
                </div>
                <div className="text-sm font-black text-emerald-600">
                  {p.revenue.toLocaleString()} ج.م
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl p-2">
          <CardHeader>
            <CardTitle className="text-slate-800 text-lg font-bold">الوصول السريع</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/admin/inventory'}
              className="p-6 rounded-3xl border border-slate-100 bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-right shadow-lg shadow-indigo-200"
            >
              <Package className="w-8 h-8 text-white/80 mb-3" />
              <h5 className="text-base font-black">إضافة حذاء</h5>
              <p className="text-xs text-white/70 mt-1">تعبئة المخزون فوراً</p>
            </motion.button>

            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.href = '/pos'}
              className="p-6 rounded-3xl border border-slate-100 bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-right shadow-lg shadow-teal-200"
            >
              <ShoppingBag className="w-8 h-8 text-white/80 mb-3" />
              <h5 className="text-base font-black">شاشة الكاشير</h5>
              <p className="text-xs text-white/70 mt-1">المبيعات والنقاط</p>
            </motion.button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
