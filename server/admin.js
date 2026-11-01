const crypto = require("node:crypto");
const { neon } = require("@neondatabase/serverless");

const sessionCookieName = "desrited_admin_session";
const sessionDurationSeconds = 12 * 60 * 60;
const defaultProductSettings = {
    colorName: "Black",
    colorHex: "#171717",
    sizes: ["S", "M", "L", "XL", "XXL"],
    price: "Info segera tersedia",
    note: "Informasi harga dan jadwal akan diumumkan segera.",
};

class HttpError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

function getDatabase() {
    if (!process.env.DATABASE_URL) {
        throw new HttpError(503, "Database belum dikonfigurasi. Tambahkan DATABASE_URL di Vercel.");
    }
    return neon(process.env.DATABASE_URL);
}

function isValidProductSettings(settings) {
    return settings
        && typeof settings.colorName === "string"
        && settings.colorName.length > 0
        && settings.colorName.length <= 30
        && typeof settings.colorHex === "string"
        && /^#[0-9a-f]{6}$/i.test(settings.colorHex)
        && Array.isArray(settings.sizes)
        && settings.sizes.length > 0
        && settings.sizes.length <= 12
        && settings.sizes.every((size) => typeof size === "string" && /^[A-Z0-9-]{1,8}$/.test(size))
        && new Set(settings.sizes).size === settings.sizes.length
        && typeof settings.price === "string"
        && settings.price.length > 0
        && settings.price.length <= 60
        && typeof settings.note === "string"
        && settings.note.length > 0
        && settings.note.length <= 120;
}

function isValidMockupImage(image) {
    return typeof image === "string"
        && image.length <= 1_200_000
        && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(image);
}

function parseCookie(request, name) {
    const cookieHeader = request.headers.cookie || "";
    const cookie = cookieHeader.split(";").map((part) => part.trim())
        .find((part) => part.startsWith(`${name}=`));
    return cookie ? cookie.slice(name.length + 1) : "";
}

function hash(value) {
    return crypto.createHash("sha256").update(value).digest("hex");
}

function setSessionCookie(response, token, maxAge) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader(
        "Set-Cookie",
        `${sessionCookieName}=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}${secure}`,
    );
}

function requireSameOrigin(request) {
    const origin = request.headers.origin;
    const host = request.headers["x-forwarded-host"] || request.headers.host;
    if (!origin || !host) {
        throw new HttpError(403, "Permintaan tidak memiliki origin yang valid.");
    }
    try {
        if (new URL(origin).host !== host) {
            throw new HttpError(403, "Permintaan lintas origin ditolak.");
        }
    } catch (error) {
        if (error instanceof HttpError) {
            throw error;
        }
        throw new HttpError(403, "Permintaan tidak memiliki origin yang valid.");
    }
}

async function requireAdmin(request, sql) {
    const token = parseCookie(request, sessionCookieName);
    if (!/^[a-f0-9]{64}$/.test(token)) {
        throw new HttpError(401, "Sesi admin berakhir. Silakan masuk kembali.");
    }
    const sessions = await sql`
        SELECT token_hash
        FROM desrited_admin_sessions
        WHERE token_hash = ${hash(token)} AND expires_at > NOW()
        LIMIT 1
    `;
    if (sessions.length === 0) {
        throw new HttpError(401, "Sesi admin berakhir. Silakan masuk kembali.");
    }
    return hash(token);
}

function sendJson(response, statusCode, data) {
    response.setHeader("Cache-Control", "no-store");
    response.status(statusCode).json(data);
}

function sendError(response, error) {
    if (error instanceof HttpError) {
        sendJson(response, error.statusCode, { error: error.message });
        return;
    }
    console.error("Kesalahan API admin DESRITED.", error);
    sendJson(response, 500, { error: "Terjadi kesalahan server. Silakan coba lagi." });
}

function getClientIp(request) {
    const forwardedFor = request.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
        return forwardedFor.split(",")[0].trim();
    }
    return request.socket.remoteAddress || "unknown";
}

async function checkLoginRateLimit(sql, ipHash) {
    const attempts = await sql`
        SELECT attempts
        FROM desrited_admin_login_attempts
        WHERE ip_hash = ${ipHash}
            AND window_started_at > NOW() - INTERVAL '15 minutes'
        LIMIT 1
    `;
    if (attempts.length > 0 && attempts[0].attempts >= 8) {
        throw new HttpError(429, "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit.");
    }
}

async function recordFailedLogin(sql, ipHash) {
    await sql`
        INSERT INTO desrited_admin_login_attempts (ip_hash, attempts, window_started_at)
        VALUES (${ipHash}, 1, NOW())
        ON CONFLICT (ip_hash) DO UPDATE SET
            attempts = CASE
                WHEN desrited_admin_login_attempts.window_started_at <= NOW() - INTERVAL '15 minutes'
                    THEN 1
                ELSE desrited_admin_login_attempts.attempts + 1
            END,
            window_started_at = CASE
                WHEN desrited_admin_login_attempts.window_started_at <= NOW() - INTERVAL '15 minutes'
                    THEN NOW()
                ELSE desrited_admin_login_attempts.window_started_at
            END
    `;
}

module.exports = {
    HttpError,
    checkLoginRateLimit,
    defaultProductSettings,
    getClientIp,
    getDatabase,
    hash,
    isValidMockupImage,
    isValidProductSettings,
    recordFailedLogin,
    requireAdmin,
    requireSameOrigin,
    sendError,
    sendJson,
    setSessionCookie,
    sessionDurationSeconds,
};
