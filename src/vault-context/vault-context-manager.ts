import { App, Notice } from "obsidian";
import { VaultScanner } from "./vault-scanner";
import { ContextCompactor } from "./context-compactor";
import { ContextStorage, VaultContext } from "./context-storage";
import type Companion from "../main";
import type { VaultContextSettings } from "../main";

export class VaultContextManager {
	private context: VaultContext | null = null;
	private storage: ContextStorage;
	private isRebuilding = false;

	constructor(
		private app: App,
		private plugin: Companion
	) {
		this.storage = new ContextStorage(plugin);
	}

	get settings(): VaultContextSettings {
		return this.plugin.settings.vault_context;
	}

	async initialize(): Promise<void> {
		this.context = await this.storage.load();
	}

	async rebuild(): Promise<void> {
		if (this.isRebuilding) {
			new Notice("Vault context rebuild already in progress");
			return;
		}

		this.isRebuilding = true;
		new Notice("Building vault context...");

		try {
			const scanner = new VaultScanner(this.app, this.settings);
			const scanResult = await scanner.scan();

			const compactor = new ContextCompactor();
			this.context = compactor.compact(
				scanResult,
				this.settings.max_context_tokens
			);

			await this.storage.save(this.context);

			new Notice(
				`Vault context built: ${this.context.note_count} notes analyzed`
			);
		} catch (e) {
			console.error("Failed to rebuild vault context:", e);
			new Notice("Failed to build vault context. Check console for details.");
		} finally {
			this.isRebuilding = false;
		}
	}

	getContext(): string | null {
		if (!this.settings.enabled || !this.context) {
			return null;
		}
		return this.context.compacted_context;
	}

	getFullContext(): VaultContext | null {
		return this.context;
	}

	async clear(): Promise<void> {
		this.context = null;
		await this.storage.clear();
	}
}
