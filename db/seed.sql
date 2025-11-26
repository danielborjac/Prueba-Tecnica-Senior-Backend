USE appdb;

INSERT INTO customers (name, email, phone) VALUES
('ACME', 'ops@acme.com', '123456789'),
('Globex', 'contact@globex.com', '987654321');

INSERT INTO products (sku, name, price_cents, stock) VALUES
('SKU-1', 'Producto A', 129900, 10),
('SKU-2', 'Producto B', 49900, 5);