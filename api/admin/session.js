const {
    getDatabase,
    requireAdmin,
    sendError,
    sendJson,
} = require("../../server/admin");

module.exports = async function handler(request, response) {
    if (request.method !== "GET") {
        response.setHeader("Allow", "GET");
        sendJson(response, 405, { error: "Metode tidak diizinkan." });
        return;
    }

    try {
        const sql = getDatabase();
        await requireAdmin(request, sql);
        sendJson(response, 200, { authenticated: true });
    } catch (error) {
        sendError(response, error);
    }
};
