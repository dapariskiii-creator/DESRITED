const loginView = document.querySelector("#admin-login-view");
const adminPanel = document.querySelector("#admin-panel");
const adminForm = document.querySelector("#admin-form");
const adminStatus = document.querySelector("#admin-status");
const passwordInput = adminForm.elements.password;
const settingsForm = document.querySelector("#product-settings-form");
const settingsStatus = document.querySelector("#settings-status");
const mockupInput = document.querySelector("#mockup-file");
const mockupPreview = document.querySelector("#mockup-preview");
const mockupPreviewEmpty = document.querySelector("#mockup-preview-empty");
const mockupStatus = document.querySelector("#mockup-status");
const saveMockupButton = document.querySelector("#save-mockup");
let selectedMockupFile = null;
let previewObjectUrl = null;
let productSettings = null;

async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        credentials: "same-origin",
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers,
        },
    });
    const body = await response.text();
    let result;
    try {
        result = body ? JSON.parse(body) : {};
    } catch (error) {
        console.error(`API admin mengembalikan respons non-JSON (${response.status}).`, error);
        throw new Error(
            `API admin tidak tersedia (HTTP ${response.status}). Jalankan situs melalui Vercel Functions, bukan server statis seperti PHP/XAMPP.`,
        );
    }
    if (!response.ok) {
        const error = new Error(result.error || "Permintaan gagal. Silakan coba lagi.");
        error.status = response.status;
        throw error;
    }
    return result;
}

function showError(status, error, fallback) {
    console.error(fallback, error);
    status.dataset.state = "error";
    status.textContent = error.message || fallback;
}

function isValidProductSettings(settings) {
    return settings
        && typeof settings.colorName === "string"
        && settings.colorName.length > 0
        && settings.colorName.length <= 30
        && typeof settings.colorHex === "string"
        && /^#[0-9a-f]{6}$/i.test(settings.colorHex)
        && Array.isArray(settings.sizes)
        && settings.sizes.length > 0
        && settings.sizes.length <= 12
        && settings.sizes.every((size) => typeof size === "string" && /^[A-Z0-9-]{1,8}$/.test(size))
        && new Set(settings.sizes).size === settings.sizes.length
        && typeof settings.price === "string"
        && settings.price.length > 0
        && settings.price.length <= 60
        && typeof settings.note === "string"
        && settings.note.length > 0
        && settings.note.length <= 120
        && (settings.mockupImage === null || isValidMockupImage(settings.mockupImage));
}

function isValidMockupImage(image) {
    return typeof image === "string"
        && image.length <= 1_200_000
        && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(image);
}

function populateSettingsForm() {
    settingsForm.elements.colorName.value = productSettings.colorName;
    settingsForm.elements.sizes.value = productSettings.sizes.join(", ");
    settingsForm.elements.price.value = productSettings.price;
    settingsForm.elements.note.value = productSettings.note;
}

function revokePreviewObjectUrl() {
    if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
    }
}

function showMockupPreview(source) {
    mockupPreview.src = source;
    mockupPreview.classList.add("is-visible");
    mockupPreviewEmpty.hidden = true;
}

function clearMockupPreview() {
    mockupPreview.removeAttribute("src");
    mockupPreview.classList.remove("is-visible");
    mockupPreviewEmpty.hidden = false;
}

function showSettings(settings) {
    if (!isValidProductSettings(settings)) {
        throw new Error("Data produk dari server memiliki format yang tidak valid.");
    }
    productSettings = settings;
    loginView.hidden = true;
    adminPanel.hidden = false;
    populateSettingsForm();
    revokePreviewObjectUrl();
    selectedMockupFile = null;
    mockupInput.value = "";
    mockupStatus.textContent = "";
    mockupStatus.dataset.state = "";
    if (productSettings.mockupImage) {
        showMockupPreview(productSettings.mockupImage);
    } else {
        clearMockupPreview();
    }
}

function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("File tidak dapat dibaca sebagai gambar."));
        };
        image.src = objectUrl;
    });
}

async function compressMockupImage(file) {
    const image = await loadImageFile(file);
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Browser tidak dapat memproses gambar.");
    }

    context.fillStyle = "#11110f";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let compressed = canvas.toDataURL("image/jpeg", 0.78);
    let quality = 0.68;
    while (compressed.length > 1_200_000 && quality >= 0.4) {
        compressed = canvas.toDataURL("image/jpeg", quality);
        quality -= 0.1;
    }
    if (compressed.length > 1_200_000) {
        throw new Error("Ukuran gambar terlalu besar setelah dikompres.");
    }
    return compressed;
}

adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    adminStatus.textContent = "";
    adminStatus.dataset.state = "";
    const submitButton = adminForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    try {
        await apiRequest("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({ password: passwordInput.value }),
        });
        passwordInput.value = "";
        showSettings(await apiRequest("/api/admin/settings"));
    } catch (error) {
        showError(adminStatus, error, "Login admin gagal.");
    } finally {
        submitButton.disabled = false;
    }
});

mockupInput.addEventListener("change", () => {
    mockupStatus.textContent = "";
    mockupStatus.dataset.state = "";
    const [file] = mockupInput.files;
    selectedMockupFile = null;
    revokePreviewObjectUrl();
    if (!file) {
        if (productSettings && productSettings.mockupImage) {
            showMockupPreview(productSettings.mockupImage);
        } else {
            clearMockupPreview();
        }
        return;
    }
    if (!file.type.startsWith("image/")) {
        mockupInput.value = "";
        mockupStatus.dataset.state = "error";
        mockupStatus.textContent = "Pilih file gambar untuk mockup.";
        return;
    }
    if (file.size > 15 * 1024 * 1024) {
        mockupInput.value = "";
        mockupStatus.dataset.state = "error";
        mockupStatus.textContent = "Ukuran file maksimal 15 MB.";
        return;
    }

    selectedMockupFile = file;
    previewObjectUrl = URL.createObjectURL(file);
    showMockupPreview(previewObjectUrl);
});

saveMockupButton.addEventListener("click", async () => {
    if (!selectedMockupFile) {
        mockupStatus.dataset.state = "error";
        mockupStatus.textContent = "Pilih foto mockup terlebih dahulu.";
        return;
    }

    saveMockupButton.disabled = true;
    mockupStatus.dataset.state = "";
    mockupStatus.textContent = "Memproses dan menyimpan foto...";
    try {
        const image = await compressMockupImage(selectedMockupFile);
        await apiRequest("/api/admin/mockup", {
            method: "PUT",
            body: JSON.stringify({ image }),
        });
        selectedMockupFile = null;
        mockupInput.value = "";
        revokePreviewObjectUrl();
        productSettings.mockupImage = image;
        showMockupPreview(image);
        mockupStatus.dataset.state = "success";
        mockupStatus.textContent = "Mockup tersimpan dan sudah dibagikan ke semua pengunjung.";
    } catch (error) {
        showError(mockupStatus, error, "Foto gagal diproses atau disimpan.");
    } finally {
        saveMockupButton.disabled = false;
    }
});

settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    settingsStatus.textContent = "";
    settingsStatus.dataset.state = "";
    const sizes = settingsForm.elements.sizes.value
        .split(",")
        .map((size) => size.trim().toUpperCase())
        .filter(Boolean);
    const nextSettings = {
        colorName: settingsForm.elements.colorName.value.trim(),
        colorHex: productSettings.colorHex,
        sizes,
        price: settingsForm.elements.price.value.trim(),
        note: settingsForm.elements.note.value.trim(),
    };

    if (!isValidProductSettings({ ...nextSettings, mockupImage: productSettings.mockupImage })) {
        settingsStatus.dataset.state = "error";
        settingsStatus.textContent = "Isi semua kolom, gunakan ukuran unik (maksimal 12, 8 karakter per ukuran).";
        return;
    }

    const submitButton = settingsForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    try {
        const savedSettings = await apiRequest("/api/admin/settings", {
            method: "PUT",
            body: JSON.stringify(nextSettings),
        });
        showSettings(savedSettings);
        settingsStatus.dataset.state = "success";
        settingsStatus.textContent = "Perubahan berhasil disimpan dan tampil untuk semua pengunjung.";
    } catch (error) {
        showError(settingsStatus, error, "Pengaturan produk gagal disimpan.");
    } finally {
        submitButton.disabled = false;
    }
});

document.querySelector("#admin-logout").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
        await apiRequest("/api/admin/logout", { method: "POST" });
        adminPanel.hidden = true;
        loginView.hidden = false;
        adminForm.reset();
        adminStatus.textContent = "";
        settingsStatus.textContent = "";
        passwordInput.focus();
    } catch (error) {
        showError(settingsStatus, error, "Tidak dapat keluar dari admin.");
    } finally {
        button.disabled = false;
    }
});

async function restoreSession() {
    try {
        const session = await apiRequest("/api/admin/session");
        if (session.authenticated) {
            showSettings(await apiRequest("/api/admin/settings"));
        }
    } catch (error) {
        if (error.status !== 401) {
            showError(adminStatus, error, "Tidak dapat memeriksa sesi admin.");
        }
    }
}

restoreSession();
