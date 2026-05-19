-- 1. Create Profiles table (Links to Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')) DEFAULT 'cashier',
  full_name TEXT
);

-- 2. Create Products table
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

-- 3. Create Sales (Orders) table
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cashier_id UUID REFERENCES profiles(id),
  total_price NUMERIC NOT NULL,
  discount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Sale Items table
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL,
  cost_price NUMERIC NOT NULL
);

-- Turn on Realtime for Products (so POS/Admin screens update automatically)
alter publication supabase_realtime add table products;

-- Row Level Security (RLS) - Basic Setup for MVP
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Temporarily allow all authenticated users full access to simplify the MVP phase
CREATE POLICY "Allow authenticated users full access to profiles" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to products" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to sales" ON sales FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access to sale_items" ON sale_items FOR ALL USING (auth.role() = 'authenticated');

-- 5. Create Expenses table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES profiles(id)
);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access to expenses" ON expenses FOR ALL USING (auth.role() = 'authenticated');

-- Trigger to automatically create a profile when a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'admin'); -- Defaulting to admin for the first user
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
