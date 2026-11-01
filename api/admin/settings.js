const {
    HttpError,
    getDatabase,
    isValidProductSettings,
    requireAdmin,
    requireSameOrigin,
    sendError,
    sendJson,
} = require("../../server/admin");

function toSettings(row) {
    return {
        colorName: row.color_name,
        colorHex: row.color_hex,
        sizes: row.sizes,
        price: row.price,
        note: row.note,
        mockupImage: row.mockup_image,
    };
}

module.exports = async function handler(request, response) {
    if (request.method !== "GET" && request.method !== "PUT") {
        response.setHeader("Allow", "GET, PUT");
        sendJson(response, 405, { error: "Metode tidak diizinkan." });
        return;
    }

    try {
        if (request.method === "PUT") {
            requireSameOrigin(request);
        }
        const sql = getDatabase();
        await requireAdmin(request, sql);

        if (request.method === "GET") {
            const rows = await sql`
                SELECT color_name, color_hex, sizes, price, note, mockup_image
                FROM desrited_product_settings
                WHERE id = 1
                LIMIT 1
            `;
            sendJson(response, 200, toSettings(rows[0]));
            return;
        }

        const settings = request.body;
        if (!isValidProductSettings(settings)) {
            throw new HttpError(400, "Pengaturan produk tidak valid. Periksa nama, ukuran, harga, dan catatan.");
        }
        const rows = await sql`
            UPDATE desrited_product_settings
            SET color_name = ${settings.colorName},
                color_hex = ${settings.colorHex},
                sizes = ${JSON.stringify(settings.sizes)}::jsonb,
                price = ${settings.price},
                note = ${settings.note}
            WHERE id = 1
            RETURNING color_name, color_hex, sizes, price, note, mockup_image
        `;
        sendJson(response, 200, toSettings(rows[0]));
    } catch (error) {
        sendError(response, error);
    }
};
