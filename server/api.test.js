const test = require("node:test");
const assert = require("node:assert/strict");
const loginHandler = require("../api/admin/login");
const settingsHandler = require("../api/admin/settings");
const productHandler = require("../api/product");

function createResponse() {
    return {
        headers: {},
        statusCode: 200,
        body: null,
        setHeader(name, value) {
            this.headers[name] = value;
        },
        status(statusCode) {
            this.statusCode = statusCode;
            return this;
        },
        json(body) {
            this.body = body;
        },
    };
}

test("login endpoint only accepts POST", async () => {
    const response = createResponse();
    await loginHandler({ method: "GET", headers: {} }, response);
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, "POST");
});

test("admin settings reject cross-origin updates before database access", async () => {
    const response = createResponse();
    await settingsHandler({
        method: "PUT",
        headers: { origin: "https://attacker.example", host: "shop.example" },
        body: {},
    }, response);
    assert.equal(response.statusCode, 403);
});

test("public product endpoint only accepts GET", async () => {
    const response = createResponse();
    await productHandler({ method: "POST", headers: {} }, response);
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, "GET");
});

test("public product endpoint reports missing database configuration", async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    try {
        const response = createResponse();
        await productHandler({ method: "GET", headers: {} }, response);
        assert.equal(response.statusCode, 503);
        assert.match(response.body.error, /DATABASE_URL/);
        assert.equal(response.headers["Cache-Control"], "no-store");
    } finally {
        if (previousDatabaseUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = previousDatabaseUrl;
        }
    }
});
