import { Notice } from "obsidian";
import { Completer, Model, Prompt } from "../../complete";
import {
	SettingsUI as ProviderSettingsUI,
	Settings as ProviderSettings,
	parse_settings as parse_provider_settings,
} from "./provider_settings";
import {
	SettingsUI as ModelSettingsUI,
	parse_settings as parse_model_settings,
	Settings as ModelSettings,
} from "./model_settings";
import Mustache from "mustache";
import Anthropic from "@anthropic-ai/sdk";

export default class AnthropicModel implements Model {
	id: string;
	name: string;
	description: string;
	rate_limit_notice: Notice | null = null;
	rate_limit_notice_timeout: number | null = null;
	Settings = ModelSettingsUI;
	anthropic: Anthropic;

	provider_settings: ProviderSettings;

	constructor(
		provider_settings: string,
		id: string,
		name: string,
		description: string
	) {
		this.id = id;
		this.name = name;
		this.description = description;
		this.provider_settings = parse_provider_settings(provider_settings);

		this.anthropic = new Anthropic({
			apiKey: this.provider_settings.api_key,
			dangerouslyAllowBrowser: true,
		});
	}

	async prepare(
		prompt: Prompt,
		_settings: ModelSettings
	): Promise<{
		prefix: string;
		suffix: string;
		last_line: string;
		context: string;
		vault_context: string;
	}> {
		const cropped = {
			prefix: prompt.prefix.slice(-6000),
			suffix: prompt.suffix.slice(0, 6000),
		};
		const last_line = cropped.prefix
			.split("\n")
			.filter((x) => x.length > 0)
			.pop();
		return {
			...cropped,
			last_line: last_line || "",
			context: cropped.prefix
				.split("\n")
				.filter((x) => x !== last_line)
				.join("\n"),
			vault_context: prompt.vault_context || "",
		};
	}

	formulate_messages(
		prompt: {
			prefix: string;
			suffix: string;
			last_line: string;
			context: string;
			vault_context: string;
		},
		settings: ModelSettings
	): { role: "user"; content: string }[] {
		return [
			{
				role: "user",
				content: Mustache.render(settings.user_prompt, {
					...prompt,
					...(settings as any),
				}),
			},
		];
	}

	formulate_system_prompt(
		prompt: {
			prefix: string;
			suffix: string;
			last_line: string;
			context: string;
			vault_context: string;
		},
		settings: ModelSettings
	): string | undefined {
		if (!settings.system_prompt) return undefined;
		return Mustache.render(settings.system_prompt, {
			...prompt,
			...(settings as any),
		});
	}

	async complete(prompt: Prompt, settings: string): Promise<string> {
		const model_settings = parse_model_settings(settings);
		const prompt_data = await this.prepare(prompt, model_settings);

		try {
			const response = await this.anthropic.messages.create({
				model: this.id,
				system: this.formulate_system_prompt(prompt_data, model_settings),
				messages: this.formulate_messages(prompt_data, model_settings),
				max_tokens: prompt.max_tokens || 50,
				temperature: model_settings.temperature,
			});

			const completion =
				response.content[0]?.type === "text"
					? response.content[0].text
					: "";

			return this.interpret(prompt, completion);
		} catch (e: any) {
			this.parse_api_error(e);
			throw e;
		}
	}

	async *iterate(prompt: Prompt, settings: string): AsyncGenerator<string> {
		const model_settings = parse_model_settings(settings);
		const prompt_data = await this.prepare(prompt, model_settings);

		try {
			const stream = await this.anthropic.messages.create({
				model: this.id,
				system: this.formulate_system_prompt(prompt_data, model_settings),
				messages: this.formulate_messages(prompt_data, model_settings),
				max_tokens: prompt.max_tokens || 50,
				temperature: model_settings.temperature,
				stream: true,
			});

			// Anti-pregeneration logic from Groq pattern
			let initialized = false;
			let generated = "";
			let started = false;

			for await (const chunk of stream) {
				if (
					chunk.type === "content_block_delta" &&
					chunk.delta.type === "text_delta"
				) {
					let token = chunk.delta.text || "";
					generated += token;

					// Skip if the generated text is still within the last line
					if (prompt_data.last_line.includes(generated)) {
						continue;
					}

					// Find where the new content starts
					if (!started) {
						for (let i = generated.length - 1; i >= 0; i--) {
							if (prompt_data.last_line.endsWith(generated.slice(0, i))) {
								token = generated.slice(i);
								started = true;
								break;
							}
						}
					}

					if (!token) {
						continue;
					}

					// First token gets interpreted for spacing, rest pass through
					if (!initialized) {
						yield this.interpret(prompt, token);
						initialized = true;
					} else {
						yield token;
					}
				}
			}
		} catch (e: any) {
			this.parse_api_error(e);
			throw e;
		}
	}

	interpret(prompt: Prompt, completion: string) {
		const response_punctuation = " \n.,?!:;";
		const prompt_punctuation = " \n";

		if (
			prompt.prefix.length !== 0 &&
			!prompt_punctuation.includes(
				prompt.prefix[prompt.prefix.length - 1]
			) &&
			!response_punctuation.includes(completion[0])
		) {
			completion = " " + completion;
		}

		return completion;
	}

	create_rate_limit_notice() {
		if (this.rate_limit_notice) {
			window.clearTimeout(this.rate_limit_notice_timeout!);
			this.rate_limit_notice_timeout = window.setTimeout(() => {
				this.rate_limit_notice?.hide();
				this.rate_limit_notice = null;
				this.rate_limit_notice_timeout = null;
			}, 5000);
		} else {
			this.rate_limit_notice = new Notice(
				'Rate limit exceeded. Check the "Rate limits" section in your Anthropic account or set up a fallback preset.',
				250000
			);
			this.rate_limit_notice_timeout = window.setTimeout(() => {
				this.rate_limit_notice?.hide();
				this.rate_limit_notice = null;
				this.rate_limit_notice_timeout = null;
			}, 5000);
		}
	}

	create_api_key_notice() {
		const notice: any = new Notice("", 5000);
		const notice_element = notice.noticeEl as HTMLElement;
		notice_element.createEl("span", {
			text: "Anthropic API key is invalid. Please check your ",
		});
		notice_element.createEl("a", {
			text: "API key",
			href: "https://console.anthropic.com/settings/keys",
		});
		notice_element.createEl("span", {
			text: " in the plugin settings.",
		});
	}

	parse_api_error(e: any) {
		if (e.status === 429) {
			this.create_rate_limit_notice();
			throw new Error();
		} else if (e.status === 401) {
			this.create_api_key_notice();
			throw new Error();
		}
		throw e;
	}
}

export class AnthropicComplete implements Completer {
	id: string = "anthropic";
	name: string = "Anthropic Claude";
	description: string = "Anthropic's Claude models for fast, high-quality autocomplete";

	async get_models(settings: string) {
		return [
			new AnthropicModel(
				settings,
				"claude-3-haiku-20240307",
				"Claude 3 Haiku (recommended)",
				"Fastest and most cost-effective model for autocomplete"
			),
			new AnthropicModel(
				settings,
				"claude-3-5-haiku-20241022",
				"Claude 3.5 Haiku",
				"Latest Haiku model with improved capabilities"
			),
			new AnthropicModel(
				settings,
				"claude-3-5-sonnet-20241022",
				"Claude 3.5 Sonnet",
				"More capable but slower and more expensive"
			),
		];
	}

	Settings = ProviderSettingsUI;
}
