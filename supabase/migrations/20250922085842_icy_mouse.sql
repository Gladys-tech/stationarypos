/*
  # Update products table schema

  1. Changes
    - Remove SKU column (no longer needed)
    - Add buying_price column for profit calculations
    - Update indexes accordingly

  2. Security
    - Maintain existing RLS policies
*/

-- Remove SKU column and its unique constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;
DROP INDEX IF EXISTS idx_products_sku;
ALTER TABLE products DROP COLUMN IF EXISTS sku;

-- Add buying_price column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'buying_price'
  ) THEN
    ALTER TABLE products ADD COLUMN buying_price integer DEFAULT 0 NOT NULL;
  END IF;
END $$;