const interestForm = document.querySelector("#interest-form");
const sizeRowsContainer = interestForm.querySelector(".size-rows");
const orderTotal = document.querySelector("#order-total");
const orderStatus = document.querySelector("#order-status");
const productNote = document.querySelector("#product-note");
const productImage = document.querySelector("#product-mockup");
const defaultProductImage = productImage.getAttribute("src");
const defaultProductSettings = {
    productTitle: "Zip Hoodie",
    productSubtitle: "“Own Rules”",
    productDescription: "Hoodie dengan zipper depan dan grafis khas DESRITED. Dirancang untuk menemani keseharianmu, dengan karakter yang tetap terasa.",
    releaseEyebrow: "THE FIRST RELEASE",
    releaseTitle: "Drop",
    releaseAccent: "01",
    releaseIntro: "Satu rilisan. Satu pernyataan.\nDibuat untuk jadi bagian dari caramu.",
    colorName: "Black",
    colorHex: "#171717",
    sizes: ["S", "M", "L", "XL", "XXL"],
    price: "Info segera tersedia",
    note: "Informasi harga dan jadwal akan diumumkan segera.",
};
let productSettings = { ...defaultProductSettings };
let sizeRows = [];
let productSettingsLoaded = false;

function isValidProductSettings(settings) {
    return settings
        && typeof settings.colorName === "string"
        && /^#[0-9a-f]{6}$/i.test(settings.colorHex)
        && Array.isArray(settings.sizes)
        && settings.sizes.length > 0
        && settings.sizes.length <= 12
        && settings.sizes.every((size) => typeof size === "string" && /^[A-Z0-9-]{1,8}$/.test(size))
        && new Set(settings.sizes).size === settings.sizes.length
        && typeof settings.price === "string"
        && typeof settings.note === "string"
        && typeof settings.productTitle === "string"
        && typeof settings.productSubtitle === "string"
        && typeof settings.productDescription === "string"
        && typeof settings.releaseEyebrow === "string"
        && typeof settings.releaseTitle === "string"
        && typeof settings.releaseAccent === "string"
        && typeof settings.releaseIntro === "string";
}

function isValidMockupImage(image) {
    return typeof image === "string"
        && image.length <= 1_200_000
        && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(image);
}

document.querySelector("#current-year").textContent = new Date().getFullYear();

function renderSizeRows() {
    const previousQuantities = new Map(
        sizeRows.map((row) => [row.dataset.size, row.querySelector(".quantity-value").textContent]),
    );
    sizeRowsContainer.replaceChildren();
    sizeRows = productSettings.sizes.map((size) => {
        const row = document.createElement("div");
        row.className = "size-row";
        row.dataset.size = size;

        const label = document.createElement("span");
        label.className = "size-label";
        label.textContent = size;

        const decreaseButton = document.createElement("button");
        decreaseButton.className = "quantity-button";
        decreaseButton.type = "button";
        decreaseButton.dataset.action = "decrease";
        decreaseButton.setAttribute("aria-label", `Kurangi ukuran ${size}`);
        decreaseButton.textContent = "−";

        const quantity = document.createElement("output");
        quantity.className = "quantity-value";
        quantity.setAttribute("aria-live", "polite");
        quantity.textContent = previousQuantities.get(size) || "0";

        const increaseButton = document.createElement("button");
        increaseButton.className = "quantity-button";
        increaseButton.type = "button";
        increaseButton.dataset.action = "increase";
        increaseButton.setAttribute("aria-label", `Tambah ukuran ${size}`);
        increaseButton.textContent = "+";

        row.append(label, decreaseButton, quantity, increaseButton);
        sizeRowsContainer.append(row);
        return row;
    });
    updateOrderTotal();
}

function updateOrderTotal() {
    const total = sizeRows.reduce((sum, row) => sum + Number(row.querySelector(".quantity-value").textContent), 0);
    orderTotal.value = total;
    orderTotal.textContent = total;
    return total;
}

function renderProductSettings() {
    document.querySelector("#product-title").textContent = productSettings.productTitle;
    document.querySelector("#product-subtitle").textContent = productSettings.productSubtitle;
    document.querySelector("#product-description").textContent = productSettings.productDescription;
    document.querySelector("#release-eyebrow").textContent = productSettings.releaseEyebrow;
    document.querySelector("#release-title").textContent = productSettings.releaseTitle;
    document.querySelector("#release-accent").textContent = productSettings.releaseAccent;
    document.querySelector("#release-intro").textContent = productSettings.releaseIntro;
    document.querySelector("#product-color-name").textContent = productSettings.colorName;
    document.querySelector("#order-color-name").textContent = productSettings.colorName.toUpperCase();
    document.querySelector("#product-sizes").textContent = productSettings.sizes.join(" / ");
    document.querySelector("#product-price").textContent = productSettings.price;
    document.querySelector("#product-note").textContent = productSettings.note;
    productImage.src = productSettings.mockupImage || defaultProductImage;
    renderSizeRows();
}

async function loadProductSettings() {
    const response = await fetch("/api/product", { cache: "no-store" });
    const body = await response.text();
    let settings;
    try {
        settings = body ? JSON.parse(body) : {};
    } catch (error) {
        console.error(`API produk mengembalikan respons non-JSON (${response.status}).`, error);
        throw new Error(
            `API produk tidak tersedia (HTTP ${response.status}). Jalankan situs melalui Vercel Functions, bukan server statis seperti PHP/XAMPP.`,
        );
    }
    if (!response.ok) {
        throw new Error(settings.error || "Informasi produk gagal dimuat.");
    }
    if (!isValidProductSettings(settings)
        || (settings.mockupImage !== null && !isValidMockupImage(settings.mockupImage))) {
        throw new Error("Format informasi produk dari server tidak valid.");
    }
    productSettings = settings;
    productSettingsLoaded = true;
    productNote.textContent = productSettings.note;
    renderProductSettings();
}

sizeRowsContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".quantity-button");
    if (!button) {
        return;
    }

    const row = button.closest(".size-row");
    const quantity = row.querySelector(".quantity-value");
    const nextValue = Number(quantity.textContent) + (button.dataset.action === "increase" ? 1 : -1);
    quantity.textContent = Math.max(0, Math.min(99, nextValue));
    orderStatus.textContent = "";
    updateOrderTotal();
});

interestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    orderStatus.textContent = "";

    if (!productSettingsLoaded) {
        orderStatus.textContent = "Informasi produk belum siap. Muat ulang halaman lalu coba lagi.";
        return;
    }

    const total = updateOrderTotal();
    if (total === 0) {
        orderStatus.textContent = "Pilih jumlah kaos minimal satu sebelum melanjutkan.";
        return;
    }

    const name = interestForm.elements.name.value.trim();
    const address = interestForm.elements.address.value.trim();
    const customerNote = interestForm.elements.note.value.trim();
    const sizes = sizeRows
        .map((row) => ({
            size: row.dataset.size,
            quantity: Number(row.querySelector(".quantity-value").textContent),
        }))
        .filter((item) => item.quantity > 0)
        .map((item) => `- ${item.size}: ${item.quantity} pcs`);
    const message = [
        "Halo DESRITED, saya mau pesan:",
        "Produk: Zip Hoodie “Own Rules” - Drop 01",
        `Nama lengkap: ${name}`,
        `Alamat pengiriman: ${address}`,
        ...(customerNote ? [`Keterangan tambahan: ${customerNote}`] : []),
        "Ukuran dan jumlah:",
        ...sizes,
        `Total: ${total} kaos`,
    ].join("\n");
    const whatsappUrl = `https://wa.me/6285604828970?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
});

renderProductSettings();
loadProductSettings().catch((error) => {
    console.error("Gagal memuat data produk DESRITED.", error);
    productNote.textContent = "Informasi produk gagal dimuat. Silakan muat ulang halaman.";
    orderStatus.textContent = "Informasi produk belum tersedia. Silakan coba beberapa saat lagi.";
});