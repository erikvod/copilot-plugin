import { App, TFile } from "obsidian";
import { VaultContextSettings } from "../main";

export interface ScannedNote {
	path: string;
	content: string;
	folder: string;
}

export interface ScanResult {
	notes: ScannedNote[];
	totalCharacters: number;
}

export class VaultScanner {
	constructor(
		private app: App,
		private settings: VaultContextSettings
	) {}

	async scan(): Promise<ScanResult> {
		const markdownFiles = this.app.vault.getMarkdownFiles();
		const notes: ScannedNote[] = [];
		let totalCharacters = 0;

		for (const file of markdownFiles) {
			if (!this.matchesPatterns(file.path)) {
				continue;
			}

			try {
				const content = await this.readNote(file);
				const folder = this.getFolder(file.path);

				notes.push({
					path: file.path,
					content,
					folder,
				});

				totalCharacters += content.length;
			} catch (e) {
				console.error(`Failed to read note ${file.path}:`, e);
			}
		}

		return { notes, totalCharacters };
	}

	private matchesPatterns(path: string): boolean {
		const matchesInclude = this.settings.include_patterns.some((pattern) =>
			this.matchGlob(path, pattern)
		);

		if (!matchesInclude) {
			return false;
		}

		const matchesExclude = this.settings.exclude_patterns.some((pattern) =>
			this.matchGlob(path, pattern)
		);

		return !matchesExclude;
	}

	private matchGlob(path: string, pattern: string): boolean {
		const regexPattern = pattern
			.replace(/\*\*/g, "{{GLOBSTAR}}")
			.replace(/\*/g, "[^/]*")
			.replace(/{{GLOBSTAR}}/g, ".*")
			.replace(/\?/g, ".");

		const regex = new RegExp(`^${regexPattern}$`);
		return regex.test(path);
	}

	private async readNote(file: TFile): Promise<string> {
		return await this.app.vault.cachedRead(file);
	}

	private getFolder(path: string): string {
		const parts = path.split("/");
		if (parts.length === 1) {
			return "/";
		}
		return parts.slice(0, -1).join("/");
	}
}
