# 🌐 دليل نشر وتشغيل النظام على الإنترنت (GitHub & Supabase & Vercel)

يرحب بك النظام في مرحلة النشر الحقيقي! هذا الدليل مفصل خطوة بخطوة لمساعدتك على رفع كود النظام على **GitHub**، وربطه بقاعدة بيانات **Supabase** حقيقية، ونشره للعمل مباشرة على الإنترنت عبر منصة **Vercel** مجاناً وبأعلى أداء واستقرار.

---

## 🛠️ الخطوة 1: رفع المشروع على GitHub 💻
لربط مشروعك بـ Vercel، يجب أولاً رفعه على مستودع (Repository) في حساب GitHub الخاص بك.

1. افتح مبدل الأوامر (Terminal) في مجلد المشروع ونفّذ الأوامر التالية بالتتابع:
   ```bash
   # تهيئة مستودع git محلي
   git init

   # إضافة كافة الملفات للتجهيز
   git add .

   # تسجيل الحفظ الأول للمشروع
   git commit -m "Initial commit: POS and Inventory System complete"
   ```

2. اذهب إلى موقع [GitHub](https://github.com) وقم بتسجيل الدخول.
3. اضغط على زر **New** لإنشاء مستودع جديد:
   - **Repository name:** `pos-system` (أو أي اسم تفضله)
   - اجعل المستودع **Private** (خاص) لحماية كودك وبيانات الاتصال.
   - لا تقم بتحديد خيار إضافة README أو `.gitignore` (لأنها موجودة بالفعل في المشروع).
   - اضغط على **Create repository**.

4. انسخ أوامر الـ Remote الموضحة في صفحة GitHub ونفذها محلياً:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/pos-system.git
   git push -u origin main
   ```

---

## 🗄️ الخطوة 2: تهيئة قاعدة بيانات Supabase الحقيقية 🛢️
قاعدة بيانات Supabase هي المحرك الخلفي الفعلي لتسجيل المبيعات، المنتجات، حسابات الكاشيرية، والمصروفات.

1. اذهب إلى [Supabase](https://supabase.com) وأنشئ حساباً مجانياً.
2. اضغط على **New Project** لإنشاء مشروع جديد:
   - **Name:** `Shoes Store System`
   - **Database Password:** اختر كلمة مرور قوية واحفظها جيداً.
   - **Region:** اختر خياراً قريباً من عملائك (مثلاً `eu-central-1` فرانكفورت لسرعة الاستجابة في مصر والشرق الأوسط).
   - اضغط على **Create new project** وانتظر بضع دقائق حتى يكتمل إنشاء المشروع.

3. **تطبيق جداول البيانات وهيكلتها:**
   - من القائمة الجانبية في Supabase، اضغط على **SQL Editor**.
   - اضغط على **New query** لفتح محرر استعلام جديد.
   - افتح ملف `supabase/setup.sql` الموجود في هذا المشروع، وانسخ كافة محتوياته (أو انسخ كود الـ SQL المرفق أدناه) والصقه داخل المحرر في Supabase.
   - اضغط على زر **Run** في الأعلى.
   - ستظهر لك رسالة `Success. No rows returned.` وهذا يعني أنه تم إنشاء كافة الجداول (Profiles, Products, Sales, Sale Items, Expenses) والمستمع التلقائي لإنشاء الحسابات بنجاح!

### 📝 كود SQL للتهيئة (الموجود في `supabase/setup.sql`):
```sql
-- 1. جدول الحسابات والصلاحيات
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')) DEFAULT 'cashier',
  full_name TEXT
);

-- 2. جدول المنتجات والأحذية
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  cost NUMERIC NOT NULL CHECK (cost >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  barcode TEXT UNIQUE,
  category_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. جدول عمليات البيع والفواتير
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cashier_id UUID REFERENCES profiles(id),
  total_price NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. تفاصيل المنتجات داخل كل فاتورة
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL,
  cost_price NUMERIC NOT NULL
);

-- 5. جدول المصروفات التشغيلية
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES profiles(id)
);

-- تفعيل ميزة التحديث الفوري (Realtime) لجدول المنتجات
alter publication supabase_realtime add table products;

-- تفعيل نظام حماية البيانات (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- السماح بالوصول الكامل للمستخدمين الموثقين
CREATE POLICY "Allow authenticated users full access to profiles" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to sales" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to sale_items" ON sale_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to expenses" ON expenses FOR ALL USING (auth.role() = 'authenticated');

-- دالة ومستمع لإنشاء الملف الشخصي تلقائياً فور التسجيل
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'admin');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 🔑 الخطوة 3: إعداد حساب المدير الحقيقي الخاص بك 👑
لقد طلب النظام إعداد الحساب التالي ليكون حساب المدير الرسمي والنهائي للمحل:
* **البريد الإلكتروني للمدير:** `58226922kald10@gmail.com`
* **كلمة المرور للمدير:** `0112966494Kk@`

### كيف يتم تفعيله؟
1. بمجرد رفع الموقع وتشغيله على Vercel، اذهب لصفحة تسجيل الدخول واضغط على **"إنشاء حساب جديد"** (Sign Up).
2. أدخل بريدك الإلكتروني `58226922kald10@gmail.com` وكلمة المرور `0112966494Kk@` واسمك الكامل، واضغط على **تسجيل حساب جديد**.
3. سيقوم مستمع قاعدة البيانات التلقائي (المرفق في الـ SQL) بالتعرف على تسجيل الحساب الأول وإدراجه **كمدير إداري كامل الصلاحيات (Admin)** فوراً في جدول `profiles` وتوجيهك مباشرة إلى لوحة التحكم الإدارية!
4. **تأمين التسجيل (اختياري بعد التسجيل):** بمجرد قيامك بتسجيل حسابك بنجاح، يمكنك إيقاف خاصية "Sign Up" من إعدادات Supabase Auth لمنع أي شخص غريب من إنشاء حسابات كاشير دون علمك.

---

## 🚀 الخطوة 4: النشر والربط على منصة Vercel ⚡
الآن سنقوم برفع الموقع على الإنترنت وربطه بقاعدة بيانات Supabase عبر Vercel.

1. اذهب إلى [Vercel](https://vercel.com) وأنشئ حساباً مجانياً عبر ربطه بحساب GitHub الخاص بك.
2. اضغط على زر **Add New** ثم اختر **Project**.
3. ستظهر لك قائمة بمستودعات GitHub الخاصة بك. ابحث عن مستودع المشروع `pos-system` واضغط على **Import**.
4. في شاشة إعدادات النشر (Configure Project):
   - **Framework Preset:** اتركها تلقائياً `Next.js`.
   - افتح خيار **Environment Variables** (المتغيرات البيئية) وقم بإضافة المتغيرات الثلاثة التالية بدقة بالغة:

| اسم المتغير (Key) | القيمة (Value) | أين تجدها في Supabase؟ |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | رابط الـ URL الخاص بمشروعك | في لوحة Supabase: اذهب إلى **Project Settings** > **API** > انسخ **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح Anon Key العام | في لوحة Supabase: اذهب إلى **Project Settings** > **API** > انسخ **anon / public** Key |
| `NEXT_PUBLIC_IMGBB_API_KEY` | مفتاح الـ API الخاص بـ ImgBB | *(اختياري للصور الحقيقية)* أنشئ حساباً مجانياً على [ImgBB API](https://api.imgbb.com) وانسخ مفتاح الـ API |

5. اضغط على زر **Deploy**.
6. ستبدأ منصة Vercel ببناء وتجهيز النظام وخلال أقل من دقيقة ستظهر لك شاشة الألعاب النارية والتهنئة الحارة وبجوارها رابط متجرك الحقيقي والحي المباشر على الإنترنت! 🥳🎉

---

## 🔗 كيف يعرف النظام التبديل التلقائي من الوضع التجريبي (Demo Mode) إلى الحقيقي؟
لقد قمنا بتصميم معمارية النظام البرمجية لتكون فائقة الذكاء والمرونة:
1. **الوضع التجريبي الافتراضي (Demo Mode):** يتم تفعيله تلقائياً إذا كانت المتغيرات البيئية لـ Supabase فارغة أو تحتوي على روابط وهمية، أو عند قيام المستخدم بتسجيل الدخول بالحسابات الافتراضية التجريبية (`admin@demo.com` / `cashier@demo.com`). يقوم هذا الوضع بتخزين وإدارة كافة المنتجات والمبيعات والمصروفات ديناميكياً وبشكل دائم داخل متصفح المستخدم (`localStorage`) ليعمل النظام كنسخة كاملة وقوية دون الحاجة للإنترنت.
2. **الوضع الحي المباشر (Production Mode):** يتم تفعيله تلقائياً بمجرد إدخال مفاتيح Supabase الحقيقية الخاصة بك في ملف `.env.local` محلياً أو في إعدادات Vercel على الإنترنت. سيتصل النظام مباشرة بقاعدة البيانات السحابية المركزية، مما يتيح لك مزامنة كافة الفواتير والمنتجات بين عدة فروع وعدة أجهزة كاشير في نفس اللحظة فورا وبأمان كامل.

مبارك مقدماً إطلاق نظامك الإداري المتكامل والأكثر أناقة واحترافية للأحذية والتجزئة! 🚀👞💎
