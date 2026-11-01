const test = require("node:test");
const assert = require("node:assert/strict");
const {
    HttpError,
    defaultProductSettings,
    isValidMockupImage,
    isValidProductSettings,
    requireSameOrigin,
} = require("./admin");

test("accepts default product settings", () => {
    assert.equal(isValidProductSettings(defaultProductSettings), true);
});

test("rejects duplicate, invalid, or oversized product sizes", () => {
    assert.equal(isValidProductSettings({ ...defaultProductSettings, sizes: ["M", "M"] }), false);
    assert.equal(isValidProductSettings({ ...defaultProductSettings, sizes: ["too-long-size"] }), false);
    assert.equal(isValidProductSettings({ ...defaultProductSettings, sizes: Array(13).fill("M") }), false);
});

test("validates saved mockup data URLs and size limit", () => {
    assert.equal(isValidMockupImage("data:image/jpeg;base64,SGVsbG8="), true);
    assert.equal(isValidMockupImage("data:image/png;base64,SGVsbG8="), false);
    assert.equal(isValidMockupImage(`data:image/jpeg;base64,${"A".repeat(1_200_000)}`), false);
});

test("accepts same-origin requests and rejects cross-origin requests", () => {
    assert.doesNotThrow(() => requireSameOrigin({
        headers: { origin: "https://shop.example", host: "shop.example" },
    }));
    assert.throws(
        () => requireSameOrigin({ headers: { origin: "https://attacker.example", host: "shop.example" } }),
        (error) => error instanceof HttpError && error.statusCode === 403,
    );
    assert.throws(
        () => requireSameOrigin({ headers: { host: "shop.example" } }),
        (error) => error instanceof HttpError && error.statusCode === 403,
    );
});
