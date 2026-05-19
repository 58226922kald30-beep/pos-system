"use client";

// Define TypeScript interfaces
export interface DemoProduct {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  image_url: string;
  barcode: string;
  category_id: string;
  created_at: string;
}

export interface DemoSaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  products?: {
    name: string;
    price: number;
  };
}

export interface DemoSale {
  id: string;
  cashier_id?: string;
  cashier?: { full_name: string };
  profiles?: { full_name: string };
  total_price: number;
  discount: number;
  created_at: string;
  sale_items: DemoSaleItem[];
}

export interface DemoExpense {
  id: string;
  amount: number;
  description: string;
  date: string;
  created_by?: string;
}

const DEFAULT_PRODUCTS: DemoProduct[] = [
  { id: "1", name: "نايكي إير ماكس 270", price: 1400, cost: 900, stock: 12, barcode: "194953049102", category_id: "رياضي", image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "2", name: "أديداس ألترا بوست", price: 1600, cost: 1100, stock: 2, barcode: "194953049103", category_id: "رياضي", image_url: "https://images.unsplash.com/photo-1508182314998-3bd49473002f?w=400&q=80", created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "3", name: "حذاء كلاسيكي جلدي", price: 1200, cost: 700, stock: 8, barcode: "194953049104", category_id: "كلاسيك", image_url: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=400&q=80", created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "4", name: "بوما سويد كلاسيك", price: 900, cost: 500, stock: 15, barcode: "194953049105", category_id: "كاجوال", image_url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80", created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "5", name: "فانس أولد سكول", price: 700, cost: 400, stock: 25, barcode: "194953049106", category_id: "كاجوال", image_url: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&q=80", created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
];

const DEFAULT_EXPENSES: DemoExpense[] = [
  { id: "e1", amount: 500, description: "فاتورة كهرباء المحل", date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "e2", amount: 1200, description: "صيانة التكييف المركزي", date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "e3", amount: 350, description: "اشتراك الإنترنت والـ POS", date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
];

// Generate dynamic beautiful historical sales
const generateHistoricalSales = (): DemoSale[] => {
  const sales: DemoSale[] = [];
  const now = new Date();
  
  // 1. Sales for Today
  sales.push({
    id: "sale-today-1",
    cashier: { full_name: "مدير تجريبي" },
    profiles: { full_name: "مدير تجريبي" },
    total_price: 1400,
    discount: 0,
    created_at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 15).toISOString(),
    sale_items: [{ product_id: "1", quantity: 1, unit_price: 1400, cost_price: 900, products: { name: "نايكي إير ماكس 270", price: 1400 } }]
  });
  sales.push({
    id: "sale-today-2",
    cashier: { full_name: "كاشير تجريبي" },
    profiles: { full_name: "كاشير تجريبي" },
    total_price: 1800,
    discount: 100,
    created_at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30).toISOString(),
    sale_items: [
      { product_id: "4", quantity: 1, unit_price: 900, cost_price: 500, products: { name: "بوما سويد كلاسيك", price: 900 } },
      { product_id: "5", quantity: 1, unit_price: 1000, cost_price: 400, products: { name: "فانس أولد سكول", price: 1000 } }
    ]
  });

  // 2. Sales for Yesterday
  sales.push({
    id: "sale-yest-1",
    cashier: { full_name: "كاشير تجريبي" },
    profiles: { full_name: "كاشير تجريبي" },
    total_price: 2400,
    discount: 0,
    created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    sale_items: [{ product_id: "3", quantity: 2, unit_price: 1200, cost_price: 700, products: { name: "حذاء كلاسيكي جلدي", price: 1200 } }]
  });

  // 3. Sales distributed across the past week
  for (let i = 2; i <= 7; i++) {
    const saleDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    sales.push({
      id: `sale-week-${i}`,
      cashier: { full_name: "كاشير تجريبي" },
      profiles: { full_name: "كاشير تجريبي" },
      total_price: 700 + (i * 200),
      discount: i * 10,
      created_at: saleDate.toISOString(),
      sale_items: [
        { product_id: "5", quantity: 1, unit_price: 700, cost_price: 400, products: { name: "فانس أولد سكول", price: 700 } },
        { product_id: "1", quantity: 1, unit_price: 1400, cost_price: 900, products: { name: "نايكي إير ماكس 270", price: 1400 } }
      ]
    });
  }

  // 4. Sales distributed across the past month
  for (let i = 8; i <= 28; i += 3) {
    const saleDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    sales.push({
      id: `sale-month-${i}`,
      cashier: { full_name: "كاشير تجريبي" },
      profiles: { full_name: "كاشير تجريبي" },
      total_price: 1600,
      discount: 0,
      created_at: saleDate.toISOString(),
      sale_items: [{ product_id: "2", quantity: 1, unit_price: 1600, cost_price: 1100, products: { name: "أديداس ألترا بوست", price: 1600 } }]
    });
  }

  // 5. Sales distributed across the past year (by months)
  for (let m = 1; m <= 11; m++) {
    const saleDate = new Date(now.getFullYear(), now.getMonth() - m, 15);
    sales.push({
      id: `sale-year-${m}-1`,
      cashier: { full_name: "مدير تجريبي" },
      profiles: { full_name: "مدير تجريبي" },
      total_price: 5200 + (m * 400),
      discount: 200,
      created_at: saleDate.toISOString(),
      sale_items: [
        { product_id: "1", quantity: 2, unit_price: 1400, cost_price: 900, products: { name: "نايكي إير ماكس 270", price: 1400 } },
        { product_id: "2", quantity: 1, unit_price: 1600, cost_price: 1100, products: { name: "أديداس ألترا بوست", price: 1600 } },
        { product_id: "3", quantity: 1, unit_price: 1200, cost_price: 700, products: { name: "حذاء كلاسيكي جلدي", price: 1200 } }
      ]
    });
  }

  return sales;
};

// Check if window is defined (browser environment)
const isBrowser = typeof window !== "undefined";

export const demoDb = {
  initialize: () => {
    if (!isBrowser) return;

    if (!localStorage.getItem("pos_demo_products")) {
      localStorage.setItem("pos_demo_products", JSON.stringify(DEFAULT_PRODUCTS));
    }
    if (!localStorage.getItem("pos_demo_expenses")) {
      localStorage.setItem("pos_demo_expenses", JSON.stringify(DEFAULT_EXPENSES));
    }
    if (!localStorage.getItem("pos_demo_sales")) {
      localStorage.setItem("pos_demo_sales", JSON.stringify(generateHistoricalSales()));
    }
  },

  // Products
  getProducts: (): DemoProduct[] => {
    if (!isBrowser) return DEFAULT_PRODUCTS;
    demoDb.initialize();
    const data = localStorage.getItem("pos_demo_products");
    return data ? JSON.parse(data) : DEFAULT_PRODUCTS;
  },

  saveProducts: (products: DemoProduct[]) => {
    if (!isBrowser) return;
    localStorage.setItem("pos_demo_products", JSON.stringify(products));
  },

  addProduct: (product: Omit<DemoProduct, "id" | "created_at">): DemoProduct => {
    const products = demoDb.getProducts();
    const newProduct: DemoProduct = {
      ...product,
      id: "prod-" + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    products.unshift(newProduct);
    demoDb.saveProducts(products);
    return newProduct;
  },

  updateProduct: (id: string, updatedFields: Partial<DemoProduct>): DemoProduct | null => {
    const products = demoDb.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    products[index] = { ...products[index], ...updatedFields };
    demoDb.saveProducts(products);
    return products[index];
  },

  deleteProduct: (id: string) => {
    const products = demoDb.getProducts();
    const filtered = products.filter(p => p.id !== id);
    demoDb.saveProducts(filtered);
  },

  // Sales
  getSales: (): DemoSale[] => {
    if (!isBrowser) return [];
    demoDb.initialize();
    const data = localStorage.getItem("pos_demo_sales");
    return data ? JSON.parse(data) : [];
  },

  saveSales: (sales: DemoSale[]) => {
    if (!isBrowser) return;
    localStorage.setItem("pos_demo_sales", JSON.stringify(sales));
  },

  addSale: (sale: Omit<DemoSale, "id" | "created_at">): DemoSale => {
    const sales = demoDb.getSales();
    const newSale: DemoSale = {
      ...sale,
      id: "sale-" + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    };
    
    // Deduct stock for each item sold
    const products = demoDb.getProducts();
    newSale.sale_items.forEach(item => {
      const pIndex = products.findIndex(p => p.id === item.product_id);
      if (pIndex !== -1) {
        products[pIndex].stock = Math.max(0, products[pIndex].stock - item.quantity);
      }
    });

    demoDb.saveProducts(products);
    sales.unshift(newSale);
    demoDb.saveSales(sales);
    return newSale;
  },

  refundSale: (id: string): boolean => {
    const sales = demoDb.getSales();
    const saleIndex = sales.findIndex(s => s.id === id);
    if (saleIndex === -1) return false;

    const saleToRefund = sales[saleIndex];
    const products = demoDb.getProducts();

    // Restore stock for refunded items
    saleToRefund.sale_items.forEach(item => {
      const pIndex = products.findIndex(p => p.id === item.product_id);
      if (pIndex !== -1) {
        products[pIndex].stock += item.quantity;
      }
    });

    demoDb.saveProducts(products);
    sales.splice(saleIndex, 1);
    demoDb.saveSales(sales);
    return true;
  },

  // Expenses
  getExpenses: (): DemoExpense[] => {
    if (!isBrowser) return DEFAULT_EXPENSES;
    demoDb.initialize();
    const data = localStorage.getItem("pos_demo_expenses");
    return data ? JSON.parse(data) : DEFAULT_EXPENSES;
  },

  saveExpenses: (expenses: DemoExpense[]) => {
    if (!isBrowser) return;
    localStorage.setItem("pos_demo_expenses", JSON.stringify(expenses));
  },

  addExpense: (expense: Omit<DemoExpense, "id" | "date">): DemoExpense => {
    const expenses = demoDb.getExpenses();
    const newExpense: DemoExpense = {
      ...expense,
      id: "exp-" + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString()
    };
    expenses.unshift(newExpense);
    demoDb.saveExpenses(expenses);
    return newExpense;
  },

  deleteExpense: (id: string) => {
    const expenses = demoDb.getExpenses();
    const filtered = expenses.filter(e => e.id !== id);
    demoDb.saveExpenses(filtered);
  }
};
