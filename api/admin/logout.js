const {
    getDatabase,
    hash,
    requireAdmin,
    requireSameOrigin,
    sendError,
    sendJson,
    setSessionCookie,
} = require("../../server/admin");

module.exports = async function handler(request, response) {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        sendJson(response, 405, { error: "Metode tidak diizinkan." });
        return;
    }

    try {
        requireSameOrigin(request);
        const sql = getDatabase();
        const tokenHash = await requireAdmin(request, sql);
        await sql`DELETE FROM desrited_admin_sessions WHERE token_hash = ${tokenHash}`;
        setSessionCookie(response, "", 0);
        sendJson(response, 200, { authenticated: false });
    } catch (error) {
        sendError(response, error);
    }
};
