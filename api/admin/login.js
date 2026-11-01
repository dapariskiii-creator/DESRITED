const crypto = require("node:crypto");
const {
    HttpError,
    checkLoginRateLimit,
    getClientIp,
    getDatabase,
    hash,
    recordFailedLogin,
    requireSameOrigin,
    sendError,
    sendJson,
    setSessionCookie,
    sessionDurationSeconds,
} = require("../../server/admin");

module.exports = async function handler(request, response) {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        sendJson(response, 405, { error: "Metode tidak diizinkan." });
        return;
    }

    try {
        requireSameOrigin(request);
        const password = request.body && request.body.password;
        if (typeof password !== "string" || password.length === 0 || password.length > 200) {
            throw new HttpError(400, "Masukkan password yang valid.");
        }
        const expectedPassword = process.env.ADMIN_PASSWORD;
        if (!expectedPassword || expectedPassword.length < 16) {
            throw new HttpError(503, "Password admin belum dikonfigurasi dengan aman di Vercel.");
        }

        const sql = getDatabase();
        const ipHash = hash(getClientIp(request));
        await checkLoginRateLimit(sql, ipHash);
        const passwordMatches = crypto.timingSafeEqual(
            crypto.createHash("sha256").update(password).digest(),
            crypto.createHash("sha256").update(expectedPassword).digest(),
        );
        if (!passwordMatches) {
            await recordFailedLogin(sql, ipHash);
            throw new HttpError(401, "Password salah. Silakan coba lagi.");
        }

        const token = crypto.randomBytes(32).toString("hex");
        await sql`
            INSERT INTO desrited_admin_sessions (token_hash, expires_at)
            VALUES (${hash(token)}, NOW() + INTERVAL '12 hours')
        `;
        await sql`DELETE FROM desrited_admin_sessions WHERE expires_at <= NOW()`;
        await sql`DELETE FROM desrited_admin_login_attempts WHERE ip_hash = ${ipHash}`;
        setSessionCookie(response, token, sessionDurationSeconds);
        sendJson(response, 200, { authenticated: true });
    } catch (error) {
        sendError(response, error);
    }
};
