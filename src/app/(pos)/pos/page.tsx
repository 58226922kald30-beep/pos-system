"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Phone, 
  Percent, 
  LogOut, 
  Loader2, 
  QrCode,
  Printer
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { demoDb } from "@/lib/demoDb";

// Demo Products Fallback
const demoProducts: any[] = [];

interface CartItem {
  product: any;
  quantity: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashierName, setCashierName] = useState("الكاشير");
  const [isDemo, setIsDemo] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Customer CRM Info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Discount
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed");

  // Receipt preview modal state
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSaleDetails, setLastSaleDetails] = useState<any>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    const isDemoMode = false;

    if (isDemoMode) {
      const cachedRole = localStorage.getItem("pos_role");
      const cachedUser = localStorage.getItem("pos_user");
      if (cachedUser) {
        const user = JSON.parse(cachedUser);
        setCashierName(user.name);
      }
      setIsDemo(true);
      setIsAdmin(cachedRole === "admin");
      setProducts(demoDb.getProducts());
      setLoading(false);
    } else {
      checkAuthAndFetch();
    }
  }, []);

  // Global Barcode Scanner Keyboard Listener
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      
      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          const barcodeStr = buffer.trim();
          const product = products.find(p => p.barcode === barcodeStr);
          if (product) {
            addToCart(product);
            toast.success(`تمت إضافة ${product.name} إلى السلة 🏷️`);
            buffer = "";
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        buffer = "";
        return;
      }

      if (e.key.length === 1) {
        // Scanner keystrokes are typed extremely fast (< 45ms key interval)
        if (diff > 50) {
          // Too slow - probably manual typing.
          // Intercept and buffer only if user is NOT in a form field.
          buffer = isInput ? "" : e.key;
        } else {
          // Fast sequence, likely a scanner input
          buffer += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, true);
  }, [products, cart]);

  const checkAuthAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/login");
      return;
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", session.user.id)
        .single();
      
      if (profile) {
        setCashierName(profile.full_name || "كاشير النظام");
        setIsAdmin(profile.role === "admin");
      }

      const { data: prodData, error } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (error) throw error;
      setProducts(prodData || []);

      const channel = supabase
        .channel("pos_realtime_changes")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (payload) => {
          setProducts(prev => prev.map(p => p.id === payload.new.id ? { ...p, stock: payload.new.stock } : p));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.error(err);
      setIsDemo(true);
      setProducts(demoProducts);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: any) => {
    if (product.stock <= 0) {
      toast.error("هذا المنتج نفذ من المخزن!");
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= product.stock) {
        toast.error("الكمية المضافة تفوق المتاح بالمخزن!");
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, increment: boolean) => {
    const index = cart.findIndex(item => item.product.id === productId);
    if (index === -1) return;

    const currentItem = cart[index];
    const updated = [...cart];

    if (increment) {
      if (currentItem.quantity >= currentItem.product.stock) {
        toast.error("عذراً، نفذت الكمية في المخزن!");
        return;
      }
      updated[index].quantity += 1;
    } else {
      if (currentItem.quantity > 1) {
        updated[index].quantity -= 1;
      } else {
        updated.splice(index, 1);
      }
    }
    setCart(updated);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const getDiscountAmount = () => {
    const subtotal = getSubtotal();
    const val = Number(discountValue) || 0;
    if (discountType === "percentage") {
      return (subtotal * val) / 100;
    }
    return val;
  };

  const getTotal = () => {
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    return Math.max(0, subtotal - discount);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("العربة فارغة! أضف أحذية أولاً");
      return;
    }

    setLoading(true);

    const total_price = getTotal();
    const discount = getDiscountAmount();
    
    const salePayload = {
      total_price,
      discount,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
    };

    if (isDemo) {
      const saleItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        cost_price: item.product.cost,
        products: {
          name: item.product.name,
          price: item.product.price
        }
      }));

      const newSale = demoDb.addSale({
        total_price,
        discount,
        sale_items: saleItems,
        cashier: { full_name: cashierName },
        profiles: { full_name: cashierName }
      });

      // Update products state with the updated stock from localStorage
      setProducts(demoDb.getProducts());

      setLastSaleDetails({
        id: newSale.id.slice(0, 8),
        cashier: cashierName,
        total: total_price,
        discount,
        items: [...cart],
        customer: { name: customerName, phone: customerPhone },
        created_at: new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      });

      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountValue("");
      setShowReceipt(true);
      toast.success("تمت عملية البيع بنجاح (وضع تجريبي)");
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert([{
          cashier_id: user?.id,
          total_price,
          discount
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      for (const item of cart) {
        const { error: itemError } = await supabase
          .from("sale_items")
          .insert([{
            sale_id: saleData.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.price,
            cost_price: item.product.cost
          }]);

        if (itemError) throw itemError;

        const { error: stockError } = await supabase
          .from("products")
          .update({ stock: item.product.stock - item.quantity })
          .eq("id", item.product.id);

        if (stockError) throw stockError;
      }

      setLastSaleDetails({
        id: saleData.id.slice(0, 8),
        cashier: cashierName,
        total: total_price,
        discount,
        items: [...cart],
        customer: { name: customerName, phone: customerPhone },
        created_at: new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      });

      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountValue("");
      setShowReceipt(true);
      toast.success("تم تأكيد الفاتورة وخصم المخزون بنجاح!");
      checkAuthAndFetch(); 
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء إتمام العملية");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => {
    if (!lastSaleDetails) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("فشل فتح نافذة الطباعة. الرجاء السماح بالنوافذ المنبثقة.");
      return;
    }

    const itemsRows = lastSaleDetails.items.map((item: any) => `
      <tr style="border-bottom: 1px dashed #ddd;">
        <td style="padding: 6px 0; font-weight: bold;">${item.product.name}</td>
        <td style="padding: 6px 0; text-align: center;">${item.quantity}</td>
        <td style="padding: 6px 0; text-align: left; font-weight: bold;">${(item.product.price * item.quantity).toLocaleString()} ج.م</td>
      </tr>
    `).join('');

    const customerHtml = lastSaleDetails.customer.name ? `
      <div style="margin-top: 10px; border-top: 1px dashed #bbb; padding-top: 8px;">
        <div><b>العميل:</b> ${lastSaleDetails.customer.name}</div>
        ${lastSaleDetails.customer.phone ? `<div><b>الهاتف:</b> ${lastSaleDetails.customer.phone}</div>` : ''}
      </div>
    ` : '';

    const discountHtml = lastSaleDetails.discount > 0 ? `
      <div style="display: flex; justify-content: space-between; font-weight: bold; color: #ff3333; margin-top: 4px;">
        <span>الخصم المطبق:</span>
        <span>-${lastSaleDetails.discount.toLocaleString()} ج.م</span>
      </div>
    ` : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>فاتورة مبيعات سول فيت - ${lastSaleDetails.id}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              width: 72mm; 
              margin: 0 auto; 
              padding: 5mm 0;
              font-size: 11px; 
              color: #000; 
              direction: rtl;
              text-align: right;
            }
            .center { text-align: center; }
            .title { font-size: 16px; font-weight: 900; margin: 5px 0; }
            .subtitle { font-size: 10px; color: #555; margin-bottom: 10px; }
            .info-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            .info-table th { border-bottom: 2px solid #000; padding: 5px 0; text-align: right; }
            .total-box { 
              background: #f5f5f5; 
              padding: 8px; 
              border-radius: 6px; 
              font-size: 13px; 
              font-weight: bold; 
              margin-top: 10px;
              display: flex;
              justify-content: space-between;
              border: 1px solid #ddd;
            }
            .barcode-container { margin: 15px auto; text-align: center; }
            #receipt-barcode { width: 100%; max-height: 40px; }
            .footer { font-size: 9px; color: #444; margin-top: 15px; border-top: 1px dashed #bbb; padding-top: 8px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title">سول فيت للأحذية</div>
            <div class="subtitle">خطواتك.. هويتك<br>شارع الموضة، مقابل السوق الرئيسي<br>هاتف: 01023456789</div>
            <h3 style="margin: 5px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0;">فاتورة مبيعات</h3>
          </div>

          <div style="margin-top: 10px; line-height: 1.5;">
            <div><b>الرقم المرجعي:</b> ${lastSaleDetails.id}</div>
            <div><b>التاريخ والوقت:</b> ${lastSaleDetails.created_at}</div>
            <div><b>الكاشير:</b> ${lastSaleDetails.cashier}</div>
            ${customerHtml}
          </div>

          <table class="info-table">
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: right;">المنتج</th>
                <th style="text-align: center; width: 40px;">الكمية</th>
                <th style="text-align: left; width: 80px;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="margin-top: 10px; border-top: 1px solid #000; padding-top: 6px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span>المجموع الفرعي:</span>
              <span>${(lastSaleDetails.total + lastSaleDetails.discount).toLocaleString()} ج.م</span>
            </div>
            ${discountHtml}
            <div class="total-box">
              <span>المبلغ الكلي:</span>
              <span>${lastSaleDetails.total.toLocaleString()} ج.م</span>
            </div>
          </div>

          <div class="barcode-container">
            <svg id="receipt-barcode"></svg>
          </div>

          <div class="center footer">
            شكراً لشرائكم من سول فيت!<br>
            المرتجع والاستبدال خلال 14 يوماً من تاريخ الفاتورة بشرط وجود الفاتورة وسلامة المنتج والعلبة الأصلية.
          </div>

          <script>
            window.onload = () => {
              try {
                JsBarcode("#receipt-barcode", "${lastSaleDetails.id}", {
                  format: "CODE128",
                  lineColor: "#000",
                  width: 1.5,
                  height: 30,
                  displayValue: true,
                  fontSize: 10
                });
              } catch (e) {
                console.error(e);
              }
              setTimeout(() => {
                window.print();
                window.close();
              }, 400);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleLogout = () => {
    localStorage.removeItem("pos_role");
    localStorage.removeItem("pos_user");
    supabase.auth.signOut().catch(() => {});
    router.replace("/login");
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(search));
    const matchesCategory = selectedCategory === "الكل" || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["الكل", "رياضي", "كاجوال", "كلاسيك", "أطفال", "طبي"];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row relative overflow-hidden font-sans">
      {/* Background Accent Spheres */}
      <div className="absolute top-[-30%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-bl from-indigo-200/40 to-purple-200/40 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-30%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-tr from-sky-200/40 to-teal-200/40 blur-[150px] rounded-full pointer-events-none" />

      {/* POS Left Column (Products Selection Grid) */}
      <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto relative z-10">
        
        {/* Navbar */}
        <header className="flex items-center justify-between pb-4 mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              initial={{ rotate: -90, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-xl shadow-indigo-200"
            >
              POS
            </motion.div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">سول فيت | الكاشير</h1>
              <span className="text-xs font-semibold text-slate-500">تسجيل الدخول باسم: {cashierName}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => router.push("/admin")}
                className="border-slate-200 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-xl font-bold shadow-sm bg-white/50 backdrop-blur-sm"
              >
                لوحة الإدارة
              </Button>
            )}
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

        {/* Filter / Search bar */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute right-4 top-4 h-5 w-5 text-slate-400" />
            <Input 
              ref={searchInputRef}
              placeholder="ابحث بالاسم أو امسح الباركود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/80 border-slate-200 shadow-sm text-slate-800 pr-12 py-7 rounded-2xl text-base font-semibold focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all backdrop-blur-md"
            />
            <QrCode className="absolute left-4 top-4 h-6 w-6 text-indigo-500" />
          </div>

          {/* Horizontal category lists */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all border whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white/60 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white shadow-sm"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
              <Loader2 className="w-10 h-10 text-indigo-500" />
            </motion.div>
            <span className="text-slate-500 text-sm font-semibold">جاري سحب التشكيلة...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 py-16">
            <ShoppingBag className="w-16 h-16 opacity-50" />
            <p className="font-semibold">لا يوجد منتجات مطابقة للبحث</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-8"
          >
            {filteredProducts.map((p) => (
              <motion.div 
                variants={itemVariants}
                whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
                whileTap={{ scale: 0.95 }}
                key={p.id} 
                onClick={() => addToCart(p)}
                className="group border border-slate-100 bg-white/80 backdrop-blur-xl rounded-3xl p-3 cursor-pointer transition-all relative overflow-hidden shadow-sm"
              >
                {/* Product stock indicator */}
                <span className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md z-10 ${
                  p.stock <= 0 
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : p.stock <= 5 
                    ? "bg-amber-50 text-amber-600 border border-amber-100"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                }`}>
                  {p.stock <= 0 ? "نفذ" : `${p.stock} متبقي`}
                </span>

                <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 mb-4 relative shadow-inner">
                  <img 
                    src={p.image_url} 
                    alt={p.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
                <h4 className="font-extrabold text-slate-800 text-sm truncate px-1">{p.name}</h4>
                <p className="text-[11px] font-semibold text-slate-400 mt-1 px-1">{p.category_id}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 px-1">
                  <span className="text-indigo-600 font-black text-sm">{p.price.toLocaleString()} ج.م</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* POS Right Column (Cart & Totals panel) */}
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full md:w-[420px] bg-white shadow-2xl flex flex-col p-6 z-20 rounded-l-3xl relative border-l border-slate-100"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">سلة المشتريات</h2>
            <p className="text-xs font-semibold text-slate-500">{cart.length} منتجات مضافة</p>
          </div>
        </div>

        {/* Scrollable Cart Items */}
        <ScrollArea className="flex-1 -mx-2 px-2 mb-4">
          <AnimatePresence mode="popLayout">
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm gap-3"
              >
                <ShoppingBag className="w-12 h-12 opacity-20" />
                <span className="font-semibold text-slate-500">العربة بانتظار إبداعك...</span>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    key={item.product.id} 
                    className="flex gap-4 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm"
                  >
                    <img 
                      src={item.product.image_url} 
                      alt={item.product.name} 
                      className="w-14 h-14 object-cover rounded-xl shadow-inner"
                    />
                    <div className="flex-1 min-w-0 py-1">
                      <h5 className="text-xs font-bold text-slate-800 truncate">{item.product.name}</h5>
                      <span className="text-xs text-indigo-600 font-black mt-1 block">{item.product.price.toLocaleString()} ج.م</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-100">
                      <button 
                        onClick={() => updateQuantity(item.product.id, false)}
                        className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-800 w-5 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.id, true)}
                        className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-sm transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="w-9 h-9 mt-1 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-all self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* CRM Info (Customer details) */}
        <div className="border-t border-slate-100 pt-5 pb-2 space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">بيانات العميل (اختياري)</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <User className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="اسم العميل"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-800 pr-9 text-xs rounded-xl font-semibold focus:border-indigo-500"
              />
            </div>
            <div className="relative">
              <Phone className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="رقم الهاتف"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="bg-slate-50 border-slate-200 text-slate-800 pr-9 text-xs rounded-xl font-semibold focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Discounts */}
        <div className="border-t border-slate-100 mt-3 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">الخصم</h4>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setDiscountType("fixed")}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${discountType === "fixed" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              >
                مبلغ
              </button>
              <button
                onClick={() => setDiscountType("percentage")}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${discountType === "percentage" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
              >
                نسبة %
              </button>
            </div>
          </div>
          <div className="relative">
            <Percent className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              type="number"
              placeholder={discountType === "fixed" ? "أدخل قيمة الخصم ج.م" : "أدخل نسبة الخصم %"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="bg-slate-50 border-slate-200 text-slate-800 pr-9 text-xs rounded-xl font-bold focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Totals Section */}
        <div className="border-t border-slate-100 mt-5 pt-4 space-y-2">
          <div className="flex justify-between text-sm font-semibold text-slate-500">
            <span>المجموع الفرعي:</span>
            <span>{getSubtotal().toLocaleString('ar-EG')} ج.م</span>
          </div>
          <AnimatePresence>
            {getDiscountAmount() > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-sm font-bold text-red-500 overflow-hidden">
                <span>الخصم المطبق:</span>
                <span>-{getDiscountAmount().toLocaleString('ar-EG')} ج.م</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex justify-between items-end text-lg font-black text-slate-800 pt-3 border-t border-dashed border-slate-200">
            <span>الإجمالي:</span>
            <span className="text-2xl text-indigo-600">{getTotal().toLocaleString('ar-EG')} <span className="text-sm text-slate-500">ج.م</span></span>
          </div>
        </div>

        {/* Checkout Button */}
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-7 rounded-2xl font-black text-base shadow-xl shadow-indigo-200 text-white border-0"
          >
            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "إتمام الدفع وطباعة الفاتورة"}
          </Button>
        </motion.div>
      </motion.div>

      {/* Printable Receipt Layout (overlay when printed, modal normally) */}
      <AnimatePresence>
        {showReceipt && lastSaleDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <Card className="border-0 bg-white text-slate-800 max-w-sm w-full rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                {/* Decorative receipt zig-zag top */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                
                <div className="text-center pb-5 border-b border-dashed border-slate-200 mt-2">
                  <h3 className="text-2xl font-black text-slate-900">فاتورة مبيعات سول فيت</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">شارع الموضة، مقابل السوق الرئيسي</p>
                  <p className="text-xs text-slate-400 font-mono mt-2 bg-slate-50 inline-block px-3 py-1 rounded-md">الرقم المرجعي: {lastSaleDetails.id}</p>
                </div>

                <div className="py-4 space-y-2 text-xs border-b border-dashed border-slate-200">
                  <div className="flex justify-between font-semibold text-slate-600">
                    <span>التاريخ والوقت:</span>
                    <span className="text-slate-800">{lastSaleDetails.created_at}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-600">
                    <span>الكاشير:</span>
                    <span className="text-slate-800">{lastSaleDetails.cashier}</span>
                  </div>
                  {lastSaleDetails.customer.name && (
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>العميل:</span>
                      <span className="text-slate-800">{lastSaleDetails.customer.name} ({lastSaleDetails.customer.phone})</span>
                    </div>
                  )}
                </div>

                <div className="py-4 border-b border-dashed border-slate-200 max-h-48 overflow-y-auto scrollbar-none">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100">
                        <th className="pb-2">المنتج</th>
                        <th className="text-center pb-2">الكمية</th>
                        <th className="text-left pb-2">السعر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastSaleDetails.items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 font-bold text-slate-800">{item.product.name}</td>
                          <td className="text-center py-2 font-semibold text-slate-600">{item.quantity}</td>
                          <td className="text-left py-2 font-black text-indigo-600">{(item.product.price * item.quantity).toLocaleString('ar-EG')} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="py-5 space-y-2 text-sm">
                  {lastSaleDetails.discount > 0 && (
                    <div className="flex justify-between font-bold text-red-500">
                      <span>الخصم المطبق:</span>
                      <span>-{lastSaleDetails.discount.toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-slate-800 bg-slate-50 p-3 rounded-xl">
                    <span>المبلغ الكلي:</span>
                    <span className="text-indigo-600">{lastSaleDetails.total.toLocaleString()} ج.م</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={printReceipt}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl py-6"
                  >
                    <Printer className="w-5 h-5 ml-2" />
                    طباعة الفاتورة
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowReceipt(false)}
                    className="border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl py-6 font-bold"
                  >
                    إغلاق
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .fixed, .fixed * { visibility: visible; }
          .fixed { position: absolute; left: 0; top: 0; width: 100%; background: white !important; color: black !important; }
          button { display: none !important; }
          .border-0 { border: 1px solid #ccc !important; box-shadow: none !important; }
          .bg-slate-50 { background: transparent !important; }
          .text-indigo-600, .text-slate-800 { color: black !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
