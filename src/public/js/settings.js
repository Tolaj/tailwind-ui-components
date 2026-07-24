let _settingsState = { enabled: false, provider: "anthropic" };

function openSettingsModal() {
    const modal = document.getElementById("settingsModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    document.getElementById("userMenu")?.classList.add("hidden");

    fetch("/users/settings/llm")
        .then(r => r.json())
        .then(data => {
            _settingsState.enabled = data.enabled;
            _settingsState.provider = data.provider;

            renderToggle(data.enabled);
            renderProviderSection(data.enabled);
            selectProvider(data.provider);

            const keyInput = document.getElementById("anthropicKeyInput");
            const urlInput = document.getElementById("localUrlInput");
            const keyStatus = document.getElementById("anthropicKeyStatus");

            if (keyInput) keyInput.value = "";
            if (urlInput) urlInput.value = data.localLlmUrl || "";

            if (keyStatus) {
                keyStatus.textContent = data.hasAnthropicKey
                    ? "Key saved: " + data.anthropicApiKey
                    : "No key configured";
            }
        })
        .catch(() => showToast("Failed to load settings", "error"));
}

function closeSettingsModal() {
    document.getElementById("settingsModal")?.classList.add("hidden");
}

function renderToggle(enabled) {
    const toggle = document.getElementById("llmToggle");
    const knob = document.getElementById("llmToggleKnob");
    if (!toggle || !knob) return;

    if (enabled) {
        toggle.classList.remove("bg-gray-200");
        toggle.classList.add("bg-primary");
        knob.classList.remove("translate-x-0");
        knob.classList.add("translate-x-5");
    } else {
        toggle.classList.remove("bg-primary");
        toggle.classList.add("bg-gray-200");
        knob.classList.remove("translate-x-5");
        knob.classList.add("translate-x-0");
    }
}

function renderProviderSection(enabled) {
    const section = document.getElementById("providerSection");
    if (!section) return;
    section.style.opacity = enabled ? "1" : "0.4";
    section.style.pointerEvents = enabled ? "auto" : "none";
}

function toggleLlmEnabled() {
    _settingsState.enabled = !_settingsState.enabled;
    renderToggle(_settingsState.enabled);
    renderProviderSection(_settingsState.enabled);
}

function selectProvider(provider) {
    _settingsState.provider = provider;

    const anthBtn = document.getElementById("providerAnthropicBtn");
    const localBtn = document.getElementById("providerLocalBtn");
    const anthSection = document.getElementById("anthropicSection");
    const localSection = document.getElementById("localSection");

    if (provider === "anthropic") {
        anthBtn?.classList.remove("border-gray-200");
        anthBtn?.classList.add("border-primary", "bg-gray-50");
        localBtn?.classList.remove("border-primary", "bg-gray-50");
        localBtn?.classList.add("border-gray-200");
        anthSection?.classList.remove("hidden");
        localSection?.classList.add("hidden");
    } else {
        localBtn?.classList.remove("border-gray-200");
        localBtn?.classList.add("border-primary", "bg-gray-50");
        anthBtn?.classList.remove("border-primary", "bg-gray-50");
        anthBtn?.classList.add("border-gray-200");
        localSection?.classList.remove("hidden");
        anthSection?.classList.add("hidden");
    }
}

function saveSettings() {
    const body = {
        enabled: _settingsState.enabled,
        provider: _settingsState.provider,
    };

    const keyInput = document.getElementById("anthropicKeyInput");
    const urlInput = document.getElementById("localUrlInput");
    const keyStatus = document.getElementById("anthropicKeyStatus");

    if (_settingsState.provider === "anthropic" && keyInput?.value.trim()) {
        body.anthropicApiKey = keyInput.value.trim();
    }
    if (_settingsState.provider === "local" && urlInput?.value.trim()) {
        body.localLlmUrl = urlInput.value.trim();
    }

    if (_settingsState.enabled) {
        const hasExistingKey = keyStatus && !keyStatus.textContent.includes("No key");
        if (_settingsState.provider === "anthropic" && !keyInput?.value.trim() && !hasExistingKey) {
            return showToast("Please enter an Anthropic API key", "error");
        }
        if (_settingsState.provider === "local" && !urlInput?.value.trim()) {
            return showToast("Please enter a Local LLM URL", "error");
        }
    }

    fetch("/users/settings/llm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
        .then(r => r.json().then(data => ({ ok: r.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                return showToast(data.message || "Failed to save settings", "error");
            }
            showToast(data.message || "Settings saved", "success");
            closeSettingsModal();

            const mainContainer = document.getElementById("mainContainer");
            if (mainContainer) {
                const userData = JSON.parse(mainContainer.dataset.user || "{}");
                userData.llmEnabled = _settingsState.enabled;
                mainContainer.dataset.user = JSON.stringify(userData);
            }
        })
        .catch(() => showToast("Failed to save settings", "error"));
}
