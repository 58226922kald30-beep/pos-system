-- 1. Create Cashiers table for PIN-based login
CREATE TABLE IF NOT EXISTS cashiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  pin_code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add pos_cashier_id to sales table to track which cashier made the sale
ALTER TABLE sales ADD COLUMN IF NOT EXISTS pos_cashier_id UUID REFERENCES cashiers(id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE cashiers ENABLE ROW LEVEL SECURITY;

-- 4. Create policy to allow authenticated users (Manager and Cashier session) full access
DROP POLICY IF EXISTS "Allow authenticated users full access to cashiers" ON cashiers;
CREATE POLICY "Allow authenticated users full access to cashiers" ON cashiers 
FOR ALL USING (auth.role() = 'authenticated');
