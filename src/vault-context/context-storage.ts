import { Plugin } from "obsidian";

export interface VaultContext {
	version: number;
	built_at: number;
	note_count: number;
	total_characters: number;
	topics: string[];
	terminology: string[];
	writing_style: string;
	folder_summary: Record<string, string>;
	compacted_context: string;
}

const STORAGE_FILE = "vault-context.json";
const CURRENT_VERSION = 1;

export class ContextStorage {
	constructor(private plugin: Plugin) {}

	async load(): Promise<VaultContext | null> {
		try {
			const adapter = this.plugin.app.vault.adapter;
			const pluginDir = this.plugin.manifest.dir;
			if (!pluginDir) return null;

			const filePath = `${pluginDir}/${STORAGE_FILE}`;
			const exists = await adapter.exists(filePath);
			if (!exists) return null;

			const data = await adapter.read(filePath);
			const context = JSON.parse(data) as VaultContext;

			if (context.version !== CURRENT_VERSION) {
				return null;
			}

			return context;
		} catch (e) {
			console.error("Failed to load vault context:", e);
			return null;
		}
	}

	async save(context: VaultContext): Promise<void> {
		try {
			const adapter = this.plugin.app.vault.adapter;
			const pluginDir = this.plugin.manifest.dir;
			if (!pluginDir) return;

			const filePath = `${pluginDir}/${STORAGE_FILE}`;
			await adapter.write(filePath, JSON.stringify(context, null, 2));
		} catch (e) {
			console.error("Failed to save vault context:", e);
		}
	}

	async clear(): Promise<void> {
		try {
			const adapter = this.plugin.app.vault.adapter;
			const pluginDir = this.plugin.manifest.dir;
			if (!pluginDir) return;

			const filePath = `${pluginDir}/${STORAGE_FILE}`;
			const exists = await adapter.exists(filePath);
			if (exists) {
				await adapter.remove(filePath);
			}
		} catch (e) {
			console.error("Failed to clear vault context:", e);
		}
	}
}
