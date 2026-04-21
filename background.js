// === Playback State ===
const playbackState = {
  status: "idle", // idle | loading | playing | error
  audioElement: null,
  blobUrl: null,
};

// === Settings Storage Helpers ===
async function loadSettings() {
  const { apiKey, voiceId, voiceName, modelId, modelName } =
    await browser.storage.local.get([
      "apiKey",
      "voiceId",
      "voiceName",
      "modelId",
      "modelName",
    ]);
  return { apiKey, voiceId, voiceName, modelId, modelName };
}

async function saveSettings(settings) {
  await browser.storage.local.set(settings);
}

const MAX_CHARS = 5000;
let currentAbortController = null;

// === Badge Helpers ===
function setBadgeLoading() {
  playbackState.status = "loading";
  browser.action.setBadgeText({ text: "..." });
  browser.action.setBadgeBackgroundColor({ color: "#3b82f6" });
}

function setBadgePlaying() {
  playbackState.status = "playing";
  browser.action.setBadgeText({ text: "\u25B6" });
  browser.action.setBadgeBackgroundColor({ color: "#22c55e" });
}

function clearBadge() {
  playbackState.status = "idle";
  browser.action.setBadgeText({ text: "" });
}

// === Notification Helper ===
function showNotification(message) {
  browser.notifications.create({
    type: "basic",
    iconUrl: "icons/icon-96.png",
    title: "Hearvox TTS",
    message,
  });
}

// === Audio Playback ===
function stopPlayback() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  if (playbackState.audioElement) {
    playbackState.audioElement.pause();
    playbackState.audioElement = null;
  }
  if (playbackState.blobUrl) {
    URL.revokeObjectURL(playbackState.blobUrl);
    playbackState.blobUrl = null;
  }
  clearBadge();
}

function playAudio(blob) {
  // Stop any current playback first
  if (playbackState.audioElement) {
    playbackState.audioElement.pause();
  }
  if (playbackState.blobUrl) {
    URL.revokeObjectURL(playbackState.blobUrl);
  }

  const blobUrl = URL.createObjectURL(blob);
  const audio = new Audio(blobUrl);

  playbackState.audioElement = audio;
  playbackState.blobUrl = blobUrl;

  audio.addEventListener("ended", () => {
    URL.revokeObjectURL(blobUrl);
    playbackState.audioElement = null;
    playbackState.blobUrl = null;
    clearBadge();
  });

  audio.addEventListener("error", () => {
    URL.revokeObjectURL(blobUrl);
    playbackState.audioElement = null;
    playbackState.blobUrl = null;
    playbackState.status = "error";
    clearBadge();
    showNotification("Audio playback failed.");
  });

  setBadgePlaying();
  audio.play();
}

// === TTS API Call ===
async function performTTS(text, apiKey, voiceId, modelId) {
  const abortController = new AbortController();
  currentAbortController = abortController;

  setBadgeLoading();

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({ text, model_id: modelId }),
        signal: abortController.signal,
      }
    );

    if (!response.ok) {
      currentAbortController = null;
      clearBadge();
      if (response.status === 401) {
        showNotification("Invalid API key. Check your settings.");
      } else if (response.status === 402) {
        showNotification(
          "Insufficient credits or plan required. Check your ElevenLabs account."
        );
      } else if (response.status === 422) {
        showNotification("Text is too long. Select less text.");
      } else if (response.status === 429) {
        showNotification("Rate limit reached. Try again shortly.");
      } else {
        showNotification("ElevenLabs is temporarily unavailable.");
      }
      return;
    }

    const blob = await response.blob();
    currentAbortController = null;
    playAudio(blob);
  } catch (err) {
    currentAbortController = null;
    clearBadge();
    if (err.name === "AbortError") return;
    showNotification("Network error. Check your connection.");
  }
}

// === Context Menu Handler ===
async function handleMenuClick(info) {
  const text = info.selectionText;
  if (!text) return;

  if (text.length > MAX_CHARS) {
    showNotification(
      `Selected text is too long (max ${MAX_CHARS.toLocaleString()} characters). Please select less text.`
    );
    return;
  }

  const settings = await loadSettings();
  if (!settings.apiKey || !settings.voiceId || !settings.modelId) {
    showNotification(
      "Please configure the extension first. Click the extension icon to set up."
    );
    return;
  }

  // Cancel any in-flight request or current playback
  stopPlayback();

  await performTTS(text, settings.apiKey, settings.voiceId, settings.modelId);
}

// === Event Listeners (top-level, synchronous registration) ===

browser.runtime.onInstalled.addListener(() => {
  browser.menus.create({
    id: "hearvox-tts",
    title: "Hearvox TTS - Read Aloud",
    contexts: ["selection"],
  });
});

browser.menus.onClicked.addListener((info) => {
  if (info.menuItemId === "hearvox-tts") {
    handleMenuClick(info);
  }
});

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "stopPlayback") {
    stopPlayback();
    return Promise.resolve({ status: playbackState.status });
  }
  if (message.action === "getPlaybackState") {
    return Promise.resolve({ status: playbackState.status });
  }
});
