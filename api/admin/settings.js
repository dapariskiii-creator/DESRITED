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
                SELECT product_title, product_subtitle, product_description,
                    release_eyebrow, release_title, release_accent, release_intro,
                    color_name, color_hex, sizes, price, note, mockup_image
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
                note = ${settings.note},
                product_title = ${settings.productTitle},
                product_subtitle = ${settings.productSubtitle},
                product_description = ${settings.productDescription},
                release_eyebrow = ${settings.releaseEyebrow},
                release_title = ${settings.releaseTitle},
                release_accent = ${settings.releaseAccent},
                release_intro = ${settings.releaseIntro}
            WHERE id = 1
            RETURNING product_title, product_subtitle, product_description,
                release_eyebrow, release_title, release_accent, release_intro,
                color_name, color_hex, sizes, price, note, mockup_image
        `;
        sendJson(response, 200, toSettings(rows[0]));
    } catch (error) {
        sendError(response, error);
    }
};
