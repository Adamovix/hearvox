<div align="center">

![alt text](icons/icon-96.png)

  <h1>Hearvox TTS</h1>

A Firefox extension that reads selected text aloud using text-to-speech.
</div>

## Features

- **Context menu integration** - Right-click any selected text to hear it read aloud
- **Voice & model selection** - Choose from all voices and TTS models available on your ElevenLabs account
- **Playback controls** - Stop audio at any time via the extension popup

## Setup

1. Install the extension from [Firefox Add-ons](https://addons.mozilla.org/)
2. Click the extension icon in the toolbar
3. Enter your [ElevenLabs API key](https://elevenlabs.io/app/api/api-keys)
4. Select a voice and model from the dropdowns
5. Click "Save Settings"

### ElevenLabs API Key Permissions

When creating a restricted [ElevenLabs API key](https://elevenlabs.io/app/api/api-keys), the extension needs only these scopes:

| Scope | Purpose |
|-------|---------|
| `Text to Speech - Access` | Convert selected text to speech |
| `Voices - Read` | List available voices |
| `Models - Access` | List available models |

## Usage

1. Highlight text on any webpage
2. Right-click to open the context menu
3. Click **"Hearvox - Read Aloud"**
4. Audio plays through your browser

To stop playback, click the extension icon and press "Stop Playback".

## Free Tier

The extension works with ElevenLabs Free Tier accounts. Voices marked "(Free)" in the dropdown are premade voices included with all plans. Other voices (cloned, community, professional) may require a paid plan.

## Development

Load as temporary add-on:
1. Open about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on..."
3. Select src/manifest.json

## License

MIT License - see [LICENSE](LICENSE) file for details.
