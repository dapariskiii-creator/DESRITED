CREATE TABLE IF NOT EXISTS desrited_product_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    color_name TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    sizes JSONB NOT NULL,
    price TEXT NOT NULL,
    note TEXT NOT NULL,
    mockup_image TEXT
);

INSERT INTO desrited_product_settings
    (id, color_name, color_hex, sizes, price, note)
VALUES
    (1, 'Black', '#171717', '["S", "M", "L", "XL", "XXL"]'::jsonb,
    'Info segera tersedia', 'Informasi harga dan jadwal akan diumumkan segera.')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS desrited_admin_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS desrited_admin_login_attempts (
    ip_hash CHAR(64) PRIMARY KEY,
    attempts INTEGER NOT NULL,
    window_started_at TIMESTAMPTZ NOT NULL
);
