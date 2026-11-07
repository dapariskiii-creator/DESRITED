CREATE TABLE IF NOT EXISTS desrited_product_settings (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    color_name TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    sizes JSONB NOT NULL,
    price TEXT NOT NULL,
    note TEXT NOT NULL,
    mockup_image TEXT
);

ALTER TABLE desrited_product_settings
    ADD COLUMN IF NOT EXISTS product_title TEXT NOT NULL DEFAULT 'Zip Hoodie',
    ADD COLUMN IF NOT EXISTS product_subtitle TEXT NOT NULL DEFAULT '“Own Rules”',
    ADD COLUMN IF NOT EXISTS product_description TEXT NOT NULL DEFAULT 'Hoodie dengan zipper depan dan grafis khas DESRITED. Dirancang untuk menemani keseharianmu, dengan karakter yang tetap terasa.',
    ADD COLUMN IF NOT EXISTS release_eyebrow TEXT NOT NULL DEFAULT 'THE FIRST RELEASE',
    ADD COLUMN IF NOT EXISTS release_title TEXT NOT NULL DEFAULT 'Drop',
    ADD COLUMN IF NOT EXISTS release_accent TEXT NOT NULL DEFAULT '01',
    ADD COLUMN IF NOT EXISTS release_intro TEXT NOT NULL DEFAULT 'Satu rilisan. Satu pernyataan.\nDibuat untuk jadi bagian dari caramu.';

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
