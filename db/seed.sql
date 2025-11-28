USE appdb;

-- Clientes de ejemplo
INSERT INTO customers (name, email, phone) VALUES
('ACME Corporation', 'ops@acme.com', '+1-555-0100'),
('Globex Industries', 'contact@globex.com', '+1-555-0200'),
('Umbrella Corp', 'admin@umbrella.com', '+1-555-0300'),
('Wayne Enterprises', 'bruce@wayne.com', '+1-555-0400');

-- Productos de ejemplo
INSERT INTO products (sku, name, price_cents, stock) VALUES
('LAPTOP-001', 'Laptop Dell XPS 15', 129900, 15),
('MOUSE-001', 'Mouse Logitech MX Master', 8990, 50),
('KEYBOARD-001', 'Teclado Mecánico Keychron K2', 9990, 30),
('MONITOR-001', 'Monitor LG 27" 4K', 34990, 20),
('WEBCAM-001', 'Webcam Logitech C920', 7990, 25);