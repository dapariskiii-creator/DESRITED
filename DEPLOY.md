# Deploy DESRITED ke Vercel

Website ini menggunakan file statis untuk tampilan, Vercel Functions untuk API admin, dan Neon PostgreSQL untuk data produk serta sesi admin.

## 1. Siapkan Neon

1. Buat database PostgreSQL di Neon.
2. Jalankan isi file [`db/schema.sql`](./db/schema.sql) sekali melalui SQL Editor Neon.
3. Salin connection string **pooled** dari dashboard Neon.
4. Jangan menaruh connection string di file frontend atau mengirimkannya melalui chat.

Schema produk, sesi, dan pembatasan percobaan login disiapkan oleh skrip tersebut sebelum deploy.

## 2. Siapkan Vercel

1. Hubungkan repository proyek ini di Vercel, atau jalankan `npx vercel` dari folder proyek dan ikuti proses login/pembuatan project.
2. Tambahkan environment variables untuk **Production** di Vercel:
   - `DATABASE_URL`: pooled connection string dari Neon.
   - `ADMIN_PASSWORD`: password acak minimal 16 karakter. Gunakan password manager.
3. Jangan menambahkan nilai rahasia ke repository atau file yang dipublikasikan.
4. Deploy ke Production melalui dashboard atau jalankan `npx vercel --prod`.

`package.json` mencantumkan dependency serverless Neon; Vercel akan membangun endpoint di `api/` otomatis. Tidak diperlukan build command untuk halaman statis.

Untuk pemeriksaan lokal setelah instalasi dependency, jalankan `npm test`.
Server PHP statis di port 8000 hanya menyajikan halaman dan aset; gunakan `npx vercel dev` untuk menguji API serverless lokal setelah project serta environment variables tersedia.

## 3. Gunakan admin

Buka `/admin.html` pada domain production. Setelah login, pengaturan dan foto mockup tersimpan di Neon dan dibagikan kepada pengunjung di semua perangkat.

Login lokal lama dan pengaturan yang pernah disimpan di `localStorage` tidak dipindahkan otomatis. Masukkan kembali pengaturan melalui admin setelah deploy.

## Catatan operasional

- Order tetap dikirim ke WhatsApp dan tidak dicatat sebagai pesanan di database.
- Jika environment variables belum tersedia, endpoint API menampilkan error konfigurasi; halaman tidak menyimpan perubahan secara diam-diam ke browser.
- Endpoint admin memakai cookie `HttpOnly`, pemeriksaan same-origin, sesi dengan masa berlaku 12 jam, dan pembatasan percobaan login.
