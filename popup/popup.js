const apiKeyInput = document.getElementById("api-key");
const saveKeyBtn = document.getElementById("save-key-btn");
const voiceSection = document.getElementById("voice-section");
const voiceSelect = document.getElementById("voice-select");
const modelSection = document.getElementById("model-section");
const modelSelect = document.getElementById("model-select");
const saveSettingsBtn = document.getElementById("save-settings-btn");
const statusMessage = document.getElementById("status-message");
const stopBtn = document.getElementById("stop-btn");

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = type;
  statusMessage.classList.remove("hidden");
  setTimeout(() => statusMessage.classList.add("hidden"), 3000);
}

// === Load saved settings on popup open ===
async function init() {
  const { apiKey, voiceId, modelId } = await browser.storage.local.get([
    "apiKey",
    "voiceId",
    "modelId",
  ]);

  if (apiKey) {
    apiKeyInput.value = apiKey;
    await fetchVoicesAndModels(apiKey, voiceId, modelId);
  }

  // Check playback state for stop button
  try {
    const response = await browser.runtime.sendMessage({
      action: "getPlaybackState",
    });
    stopBtn.disabled = response.status !== "playing" && response.status !== "loading";
  } catch {
    stopBtn.disabled = true;
  }
}

// === Save API Key ===
saveKeyBtn.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus("Please enter an API key.", "error");
    return;
  }

  await browser.storage.local.set({ apiKey });
  showStatus("API key saved. Loading voices and models...", "success");
  await fetchVoicesAndModels(apiKey);
});

// === Fetch Voices and Models ===
async function fetchVoicesAndModels(apiKey, savedVoiceId, savedModelId) {
  voiceSection.classList.remove("hidden");
  modelSection.classList.remove("hidden");
  saveSettingsBtn.classList.remove("hidden");

  voiceSelect.disabled = true;
  modelSelect.disabled = true;

  const headers = { "xi-api-key": apiKey };

  try {
    const [voicesRes, modelsRes] = await Promise.all([
      fetch("https://api.elevenlabs.io/v2/voices?page_size=100", { headers }),
      fetch("https://api.elevenlabs.io/v1/models", { headers }),
    ]);

    if (voicesRes.status === 401 || modelsRes.status === 401) {
      showStatus("Invalid API key. Please check and try again.", "error");
      voiceSection.classList.add("hidden");
      modelSection.classList.add("hidden");
      saveSettingsBtn.classList.add("hidden");
      return;
    }

    // Populate voices
    const voicesData = await voicesRes.json();
    voiceSelect.innerHTML = '<option value="">Select a voice</option>';
    for (const voice of voicesData.voices) {
      const option = document.createElement("option");
      option.value = voice.voice_id;
      const freeTag = voice.category === "premade" ? " (Free)" : "";
      option.textContent = voice.name + freeTag;
      option.dataset.name = voice.name;
      if (voice.voice_id === savedVoiceId) option.selected = true;
      voiceSelect.appendChild(option);
    }
    voiceSelect.disabled = false;

    // Populate models (filter TTS-capable only)
    const modelsData = await modelsRes.json();
    modelSelect.innerHTML = '<option value="">Select a model</option>';
    for (const model of modelsData) {
      if (!model.can_do_text_to_speech) continue;
      const option = document.createElement("option");
      option.value = model.model_id;
      option.textContent = model.name;
      option.dataset.name = model.name;
      if (model.model_id === savedModelId) option.selected = true;
      modelSelect.appendChild(option);
    }
    modelSelect.disabled = false;
  } catch {
    showStatus("Network error. Check your connection.", "error");
  }
}

// === Save Settings ===
saveSettingsBtn.addEventListener("click", async () => {
  const voiceId = voiceSelect.value;
  const modelId = modelSelect.value;

  if (!voiceId) {
    showStatus("Please select a voice.", "error");
    return;
  }
  if (!modelId) {
    showStatus("Please select a model.", "error");
    return;
  }

  const voiceName =
    voiceSelect.options[voiceSelect.selectedIndex].dataset.name || "";
  const modelName =
    modelSelect.options[modelSelect.selectedIndex].dataset.name || "";

  await browser.storage.local.set({ voiceId, voiceName, modelId, modelName });
  showStatus("Settings saved!", "success");
});

// === Stop Playback ===
stopBtn.addEventListener("click", async () => {
  try {
    await browser.runtime.sendMessage({ action: "stopPlayback" });
    stopBtn.disabled = true;
  } catch {
    // Background page may not be active
  }
});

// === Poll playback state to update stop button ===
let pollInterval = null;

function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      const response = await browser.runtime.sendMessage({
        action: "getPlaybackState",
      });
      stopBtn.disabled =
        response.status !== "playing" && response.status !== "loading";
    } catch {
      stopBtn.disabled = true;
    }
  }, 1000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// Start polling when popup opens, stop on unload
startPolling();
window.addEventListener("unload", stopPolling);

init();
