"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
  BarChart3,
  Calendar,
  Printer
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { demoDb } from "@/lib/demoDb";

const demoProducts: any[] = [];

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isDemo, setIsDemo] = useState(false);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [analyticsProduct, setAnalyticsProduct] = useState<any>(null);
  const [productAnalytics, setProductAnalytics] = useState<{
    today: { qty: number; sales: number; profit: number };
    week: { qty: number; sales: number; profit: number };
    month: { qty: number; sales: number; profit: number };
  } | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (!analyticsProduct) {
      setProductAnalytics(null);
      return;
    }

    if (isDemo) {
      // Real local storage sales analytics for the selected product in demo mode
      const demoSales = demoDb.getSales();
      let todayQty = 0;
      let todaySales = 0;
      let todayProfit = 0;

      let weekQty = 0;
      let weekSales = 0;
      let weekProfit = 0;

      let monthQty = 0;
      let monthSales = 0;
      let monthProfit = 0;

      const now = new Date();
      const oneDay = 24 * 60 * 60 * 1000;

      demoSales.forEach((sale: any) => {
        const saleDate = new Date(sale.created_at);
        sale.sale_items.forEach((item: any) => {
          if (item.product_id !== analyticsProduct.id) return;
          const qty = Number(item.quantity);
          const uPrice = Number(item.unit_price);
          const cPrice = Number(item.cost_price);
          const itemSales = qty * uPrice;
          const itemProfit = qty * (uPrice - cPrice);

          if (
            saleDate.getFullYear() === now.getFullYear() &&
            saleDate.getMonth() === now.getMonth() &&
            saleDate.getDate() === now.getDate()
          ) {
            todayQty += qty;
            todaySales += itemSales;
            todayProfit += itemProfit;
          }

          if (now.getTime() - saleDate.getTime() <= 7 * oneDay) {
            weekQty += qty;
            weekSales += itemSales;
            weekProfit += itemProfit;
          }

          if (
            saleDate.getFullYear() === now.getFullYear() &&
            saleDate.getMonth() === now.getMonth()
          ) {
            monthQty += qty;
            monthSales += itemSales;
            monthProfit += itemProfit;
          }
        });
      });

      setProductAnalytics({
        today: { qty: todayQty, sales: todaySales, profit: todayProfit },
        week: { qty: weekQty, sales: weekSales, profit: weekProfit },
        month: { qty: monthQty, sales: monthSales, profit: monthProfit }
      });
      return;
    }

    const fetchProductAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const { data, error } = await supabase
          .from("sale_items")
          .select("quantity, unit_price, cost_price, sales(created_at)")
          .eq("product_id", analyticsProduct.id);

        if (error) throw error;

        let todayQty = 0;
        let todaySales = 0;
        let todayProfit = 0;

        let weekQty = 0;
        let weekSales = 0;
        let weekProfit = 0;

        let monthQty = 0;
        let monthSales = 0;
        let monthProfit = 0;

        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        data?.forEach((item: any) => {
          const createdAtStr = item.sales?.created_at;
          if (!createdAtStr) return;

          const saleDate = new Date(createdAtStr);
          const qty = Number(item.quantity);
          const uPrice = Number(item.unit_price);
          const cPrice = Number(item.cost_price);
          const itemSales = qty * uPrice;
          const itemProfit = qty * (uPrice - cPrice);

          if (
            saleDate.getFullYear() === now.getFullYear() &&
            saleDate.getMonth() === now.getMonth() &&
            saleDate.getDate() === now.getDate()
          ) {
            todayQty += qty;
            todaySales += itemSales;
            todayProfit += itemProfit;
          }

          if (now.getTime() - saleDate.getTime() <= 7 * oneDay) {
            weekQty += qty;
            weekSales += itemSales;
            weekProfit += itemProfit;
          }

          if (
            saleDate.getFullYear() === now.getFullYear() &&
            saleDate.getMonth() === now.getMonth()
          ) {
            monthQty += qty;
            monthSales += itemSales;
            monthProfit += itemProfit;
          }
        });

        setProductAnalytics({
          today: { qty: todayQty, sales: todaySales, profit: todayProfit },
          week: { qty: weekQty, sales: weekSales, profit: weekProfit },
          month: { qty: monthQty, sales: monthSales, profit: monthProfit }
        });
      } catch (err) {
        console.error("Error fetching product analytics:", err);
        setProductAnalytics({
          today: { qty: 0, sales: 0, profit: 0 },
          week: { qty: 0, sales: 0, profit: 0 },
          month: { qty: 0, sales: 0, profit: 0 }
        });
      } finally {
        setLoadingAnalytics(false);
      }
    };

    fetchProductAnalytics();
  }, [analyticsProduct, isDemo]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const isDemoMode = false;
    
    if (isDemoMode) {
      setIsDemo(true);
      setProducts(demoDb.getProducts());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      setIsDemo(true);
      setProducts(demoProducts);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setName("");
    setPrice("");
    setCost("");
    setStock("");
    setBarcode("");
    setCategoryId("رياضي");
    setImageFile(null);
    setImageUrl("");
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (product: any) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setCost(product.cost.toString());
    setStock(product.stock.toString());
    setBarcode(product.barcode || "");
    setCategoryId(product.category_id || "رياضي");
    setImageUrl(product.image_url || "");
    setDialogOpen(true);
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "your_imgbb_api_key_here";
    if (!apiKey || apiKey.includes("your_imgbb")) {
      return URL.createObjectURL(file);
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) return data.data.url;
      throw new Error("ImgBB upload failed");
    } catch (err) {
      toast.error("فشل رفع الصورة إلى ImgBB، سيتم استخدام رابط افتراضي.");
      return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let uploadedUrl = imageUrl;
    if (imageFile) {
      toast.loading("جاري رفع الصورة...");
      uploadedUrl = await handleImageUpload(imageFile);
      toast.dismiss();
    }

    const productPayload = {
      name,
      price: Number(price),
      cost: Number(cost),
      stock: Number(stock),
      barcode: barcode || null,
      category_id: categoryId,
      image_url: uploadedUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    };

    if (isDemo) {
      const demoPayload = {
        ...productPayload,
        barcode: barcode || ""
      };
      if (editingProduct) {
        demoDb.updateProduct(editingProduct.id, demoPayload);
        toast.success("تم تعديل المنتج تجريبياً!");
      } else {
        demoDb.addProduct(demoPayload);
        toast.success("تم إضافة المنتج تجريبياً!");
      }
      fetchProducts();
      setDialogOpen(false);
      return;
    }

    try {
      if (editingProduct) {
        const { error } = await supabase.from("products").update(productPayload).eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("تم تعديل المنتج بنجاح");
      } else {
        const { error } = await supabase.from("products").insert([productPayload]);
        if (error) throw error;
        toast.success("تم إضافة المنتج بنجاح");
      }
      fetchProducts();
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "فشلت العملية");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا المنتج؟")) return;

    if (isDemo) {
      demoDb.deleteProduct(id);
      fetchProducts();
      toast.success("تم حذف المنتج تجريبياً");
      return;
    }

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("تم حذف المنتج بنجاح");
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "فشل الحذف");
    }
  };

  const printBarcode = (product: any) => {
    if (!product.barcode) {
      toast.error("هذا المنتج لا يملك باركود لطباعته");
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>طباعة باركود - ${product.name}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; direction: rtl; }
            .label { border: 2px solid #000; display: inline-block; padding: 15px; width: 280px; border-radius: 8px; }
            .name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
            .price { font-size: 16px; font-weight: bold; margin-top: 5px; color: #10b981; }
            svg { max-width: 100%; height: auto; }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <div class="label">
            <div class="name">${product.name}</div>
            <svg id="barcode"></svg>
            <div class="price">${product.price} ج.م</div>
          </div>
          <script>
            window.onload = () => {
              JsBarcode("#barcode", "${product.barcode}", {
                format: "CODE128",
                lineColor: "#000",
                width: 2,
                height: 50,
                displayValue: true,
                fontOptions: "bold",
                fontSize: 12
              });
              setTimeout(() => {
                window.print();
                window.close();
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(search));
    const matchesCategory = selectedCategory === "الكل" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["الكل", "رياضي", "كاجوال", "كلاسيك", "أطفال", "طبي"];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">إدارة المخزون</h2>
          <p className="text-slate-500 text-sm mt-1 font-semibold">تتبع وإضافة وتعديل الأحذية والأسعار في المتجر</p>
        </div>
        <Button 
          onClick={openAddDialog}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold px-8 py-6 rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5 ml-2" />
          إضافة حذاء جديد
        </Button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-4 items-center">
        <div className="md:col-span-2 relative">
          <Search className="absolute right-4 top-3.5 h-5 w-5 text-slate-400" />
          <Input 
            placeholder="البحث بالاسم أو الباركود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white border-slate-200 shadow-sm text-slate-800 pr-12 py-6 rounded-2xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-semibold text-base"
          />
        </div>

        <div className="md:col-span-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 text-sm font-bold rounded-xl border transition-all whitespace-nowrap shadow-sm ${
                selectedCategory === cat
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-none bg-white shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                <span className="text-slate-500 text-sm font-semibold">جاري سحب بيانات المخزون...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-24 space-y-3">
                <Package className="w-16 h-16 text-slate-300 mx-auto" />
                <h4 className="text-slate-800 font-bold text-lg">لا توجد نتائج مطابقة</h4>
                <p className="text-slate-500 text-sm font-semibold">تأكد من كتابة الكلمة بشكل صحيح أو أضف منتجات جديدة</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent border-0">
                      <TableHead className="text-slate-500 font-bold w-16 py-4">الصورة</TableHead>
                      <TableHead className="text-slate-500 font-bold text-right py-4">اسم المنتج</TableHead>
                      <TableHead className="text-slate-500 font-bold text-right py-4">الفئة</TableHead>
                      <TableHead className="text-slate-500 font-bold text-right py-4">سعر البيع</TableHead>
                      <TableHead className="text-slate-500 font-bold text-right py-4">سعر التكلفة</TableHead>
                      <TableHead className="text-slate-500 font-bold text-right py-4">المخزون</TableHead>
                      <TableHead className="text-slate-500 font-bold text-right py-4">الباركود</TableHead>
                      <TableHead className="text-slate-500 font-bold text-center w-32 py-4">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredProducts.map((p) => (
                        <motion.tr 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          layout
                          key={p.id} 
                          className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="py-3">
                            <img 
                              src={p.image_url || "/placeholder-shoe.jpg"} 
                              alt={p.name}
                              className="w-12 h-12 object-cover rounded-xl border border-slate-200 shadow-sm"
                            />
                          </TableCell>
                          <TableCell className="font-extrabold text-slate-800">{p.name}</TableCell>
                          <TableCell>
                            <span className="px-3 py-1 rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600 border border-indigo-100">
                              {p.category_id || "غير مصنف"}
                            </span>
                          </TableCell>
                          <TableCell className="text-emerald-600 font-black">{p.price.toLocaleString()} ج.م</TableCell>
                          <TableCell className="text-slate-500 font-semibold">{p.cost.toLocaleString()} ج.م</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-black ${p.stock <= 5 ? "text-red-500" : "text-slate-800"}`}>
                              {p.stock} قطعة
                            </span>
                            {p.stock <= 5 && (
                              <AlertTriangle className="w-4 h-4 inline-block mr-1.5 text-red-500 animate-pulse" />
                            )}
                          </TableCell>
                          <TableCell className="text-slate-400 font-mono text-xs font-semibold">{p.barcode || "—"}</TableCell>
                          <TableCell className="flex items-center justify-center gap-1.5 py-4">
                            <Button variant="ghost" size="icon" onClick={() => printBarcode(p)} className="h-9 w-9 text-slate-400 hover:text-slate-700 hover:bg-white shadow-sm border border-transparent hover:border-slate-200 rounded-xl">
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setAnalyticsProduct(p)} className="h-9 w-9 text-sky-500 hover:text-sky-700 hover:bg-sky-50 shadow-sm border border-transparent hover:border-sky-100 rounded-xl">
                              <BarChart3 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(p)} className="h-9 w-9 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 shadow-sm border border-transparent hover:border-indigo-100 rounded-xl">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 shadow-sm border border-transparent hover:border-red-100 rounded-xl">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-0 bg-white shadow-2xl text-slate-800 max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              {editingProduct ? "تعديل بيانات الحذاء" : "إضافة حذاء جديد للمخزن"}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-semibold text-xs mt-1">
              أدخل كافة البيانات والمقاسات وصورة المنتج ليتم إدراجها في شاشة المبيعات
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="prod-name" className="text-slate-600 font-bold">اسم الموديل</Label>
                <Input id="prod-name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl font-semibold focus:border-indigo-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-price" className="text-slate-600 font-bold">سعر البيع (ج.م)</Label>
                <Input id="prod-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl font-semibold focus:border-indigo-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-cost" className="text-slate-600 font-bold">سعر التكلفة (ج.م)</Label>
                <Input id="prod-cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl font-semibold focus:border-indigo-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-stock" className="text-slate-600 font-bold">الكمية المتوفرة</Label>
                <Input id="prod-stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} required className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl font-semibold focus:border-indigo-500" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-barcode" className="text-slate-600 font-bold">الباركود</Label>
                <Input id="prod-barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="bg-slate-50 border-slate-200 text-slate-800 rounded-xl font-semibold focus:border-indigo-500" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-slate-600 font-bold">تصنيف الفئة</Label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all">
                  <option value="رياضي">رياضي</option>
                  <option value="كاجوال">كاجوال</option>
                  <option value="كلاسيك">كلاسيك</option>
                  <option value="أطفال">أطفال</option>
                  <option value="طبي">طبي</option>
                </select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-slate-600 font-bold">صورة المنتج</Label>
                <div className="flex gap-4 items-center">
                  <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-6 cursor-pointer hover:bg-slate-50 transition-all text-slate-500 bg-white">
                    <ImageIcon className="w-8 h-8 mb-3 text-indigo-400" />
                    <span className="text-sm font-semibold">
                      {imageFile ? imageFile.name : "اسحب الصورة أو اضغط للرفع"}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                  </label>
                  {imageUrl && (
                    <div className="w-24 h-24 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="pt-5 gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold py-6 px-6">إلغاء</Button>
              <Button type="submit" disabled={uploadingImage} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-6 px-8 shadow-lg shadow-indigo-200">{uploadingImage ? "جاري الرفع..." : "حفظ المنتج"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!analyticsProduct} onOpenChange={() => setAnalyticsProduct(null)}>
        <DialogContent className="border-0 bg-white shadow-2xl text-slate-800 max-w-lg rounded-3xl p-6">
          {analyticsProduct && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <img src={analyticsProduct.image_url} alt={analyticsProduct.name} className="w-16 h-16 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                  <div>
                    <DialogTitle className="text-xl font-black text-slate-900">{analyticsProduct.name}</DialogTitle>
                    <DialogDescription className="text-slate-500 text-xs font-semibold mt-1">رمز الباركود: {analyticsProduct.barcode || "لا يوجد"}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              {loadingAnalytics || !productAnalytics ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-slate-500 text-sm font-semibold">جاري حساب حركة المبيعات...</span>
                </div>
              ) : (
                <div className="space-y-6 py-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                      <span className="text-xs text-indigo-600 font-bold">هامش الربح لكل قطعة</span>
                      <h4 className="text-2xl font-black text-indigo-700 mt-2">{(analyticsProduct.price - analyticsProduct.cost).toLocaleString()} ج.م</h4>
                      <span className="text-xs text-indigo-500 font-semibold block mt-1">نسبة ربح: {Math.round(((analyticsProduct.price - analyticsProduct.cost) / analyticsProduct.price) * 100)}%</span>
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <span className="text-xs text-slate-500 font-bold">المخزون الحالي</span>
                      <h4 className={`text-2xl font-black mt-2 ${analyticsProduct.stock <= 5 ? "text-red-500" : "text-slate-800"}`}>{analyticsProduct.stock} قطع</h4>
                      <span className="text-xs text-slate-500 font-semibold block mt-1">تحديث فوري</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">حركة المبيعات الحقيقية</h4>
                    <div className="space-y-2">
                      {[
                        { period: "اليوم", qty: productAnalytics.today.qty, totalSales: productAnalytics.today.sales, totalProfit: productAnalytics.today.profit },
                        { period: "هذا الأسبوع", qty: productAnalytics.week.qty, totalSales: productAnalytics.week.sales, totalProfit: productAnalytics.week.profit },
                        { period: "هذا الشهر", qty: productAnalytics.month.qty, totalSales: productAnalytics.month.sales, totalProfit: productAnalytics.month.profit }
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center"><Calendar className="w-5 h-5" /></div>
                            <span className="font-bold text-slate-800">{item.period}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-900 font-black text-lg">{item.qty} حذاء</div>
                            <div className="text-xs font-semibold text-slate-500 mt-1">ربح: <span className="text-emerald-600 font-bold">{(item.totalProfit).toLocaleString()} ج.م</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              <DialogFooter>
                <Button onClick={() => setAnalyticsProduct(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 w-full rounded-2xl font-bold py-6 text-base">إغلاق</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
