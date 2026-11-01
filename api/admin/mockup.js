const {
    HttpError,
    getDatabase,
    isValidMockupImage,
    requireAdmin,
    requireSameOrigin,
    sendError,
    sendJson,
} = require("../../server/admin");

module.exports = async function handler(request, response) {
    if (request.method !== "PUT") {
        response.setHeader("Allow", "PUT");
        sendJson(response, 405, { error: "Metode tidak diizinkan." });
        return;
    }

    try {
        requireSameOrigin(request);
        const image = request.body && request.body.image;
        if (!isValidMockupImage(image)) {
            throw new HttpError(400, "Foto mockup tidak valid atau ukurannya terlalu besar.");
        }
        const sql = getDatabase();
        await requireAdmin(request, sql);
        await sql`
            UPDATE desrited_product_settings
            SET mockup_image = ${image}
            WHERE id = 1
        `;
        sendJson(response, 200, { saved: true });
    } catch (error) {
        sendError(response, error);
    }
};
