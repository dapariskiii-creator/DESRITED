const {
    getDatabase,
    sendError,
    sendJson,
} = require("../server/admin");

module.exports = async function handler(request, response) {
    if (request.method !== "GET") {
        response.setHeader("Allow", "GET");
        sendJson(response, 405, { error: "Metode tidak diizinkan." });
        return;
    }

    try {
        const sql = getDatabase();
        const rows = await sql`
            SELECT product_title, product_subtitle, product_description,
                release_eyebrow, release_title, release_accent, release_intro,
                color_name, color_hex, sizes, price, note, mockup_image
            FROM desrited_product_settings
            WHERE id = 1
            LIMIT 1
        `;
        const row = rows[0];
        sendJson(response, 200, {
            productTitle: row.product_title,
            productSubtitle: row.product_subtitle,
            productDescription: row.product_description,
            releaseEyebrow: row.release_eyebrow,
            releaseTitle: row.release_title,
            releaseAccent: row.release_accent,
            releaseIntro: row.release_intro,
            colorName: row.color_name,
            colorHex: row.color_hex,
            sizes: row.sizes,
            price: row.price,
            note: row.note,
            mockupImage: row.mockup_image,
        });
    } catch (error) {
        sendError(response, error);
    }
};
