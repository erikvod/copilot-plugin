# Copilot Plugin

AI-powered autocomplete for Obsidian with support for ChatGPT, Claude, Groq, and Ollama.

> This plugin is a fork of [obsidian-companion](https://github.com/rizerphe/obsidian-companion) by [rizerphe](https://github.com/rizerphe).

## Features

- **AI-powered autocomplete** - Get intelligent suggestions as you type, similar to GitHub Copilot
- **Multiple AI providers** - Choose from OpenAI (ChatGPT), Anthropic (Claude), Groq, or local Ollama models
- **Vault context awareness** - Optionally scan your vault to provide context-aware completions that match your writing style
- **Streaming completions** - See suggestions appear in real-time
- **Customizable prompts** - Configure system and user prompts per model
- **Presets** - Save and quickly switch between different configurations

## Supported Providers

| Provider | Description |
|----------|-------------|
| **OpenAI** | GPT-4, GPT-3.5-turbo, and other OpenAI models |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Haiku, and other Claude models |
| **Groq** | Ultra-fast inference with Llama, Mixtral, and other models |
| **Ollama** | Run models locally with no API costs |

## Installation

### From Obsidian Community Plugins

1. Open **Settings** > **Community plugins** in Obsidian
2. Click **Browse** and search for "Copilot Plugin"
3. Click **Install**, then **Enable**

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/erikvod/copilot-plugin/releases)
2. Extract the files to your vault's `.obsidian/plugins/copilot-plugin/` folder
3. Enable the plugin in **Settings** > **Community plugins**

## Quick Start

1. Open plugin settings and select your preferred AI provider
2. Enter your API key (not required for Ollama)
3. Select a model from the dropdown
4. Open the command palette (`Ctrl/Cmd + P`) and run "Toggle Completion"
5. Start typing and press `Tab` to accept suggestions

## Vault Context

The vault context feature scans your notes to build a compact summary of your vault's topics, terminology, and writing style. This context is injected into AI prompts to provide more personalized completions.

To enable:
1. Go to plugin settings
2. Enable "Vault Context"
3. Configure include/exclude patterns as needed
4. Click "Rebuild vault context"

## Configuration

### Global Settings

- **Provider** - Select your AI provider (OpenAI, Anthropic, Groq, Ollama)
- **Model** - Choose which model to use for completions
- **Max completion tokens** - Limit response length (25 or 50 tokens)
- **Delay** - Time to wait before requesting a completion
- **Enable on startup** - Automatically enable completions when Obsidian starts
- **Stream completions** - Show suggestions as they generate

### Per-Model Settings

Each model can be configured with:
- **System prompt** - Instructions for the AI
- **User prompt** - Template for user messages (supports `{{prefix}}`, `{{suffix}}`, `{{vault_context}}`)
- **Temperature** - Controls randomness (lower = more deterministic)

## Presets

Save your current settings as a preset to quickly switch between configurations:

1. Configure your preferred settings
2. Enter a preset name and click "Save Preset"
3. Enable the "Command" toggle to add a command palette entry
4. Switch presets via the command palette or settings

## Mobile Usage

1. Go to **Settings** > **Mobile**
2. Find "More toolbar options"
3. Add "Companion: Accept completion" to your toolbar
4. Tap the button to accept suggestions while writing

## Commands

- **Toggle Completion** - Enable/disable autocomplete
- **Accept completion** - Accept the current suggestion
- **Rebuild vault context** - Regenerate vault context from your notes

## Acknowledgments

This plugin is based on [obsidian-companion](https://github.com/rizerphe/obsidian-companion) by [rizerphe](https://github.com/rizerphe). Thank you for creating the original plugin and making it open source.

Uses [codemirror-companion-extension](https://www.npmjs.com/package/codemirror-companion-extension) for inline suggestions.

## License

MIT License - see [LICENSE](LICENSE) for details.
