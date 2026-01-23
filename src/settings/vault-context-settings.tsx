import * as React from "react";
import { useState } from "react";
import SettingsItem from "../components/SettingsItem";
import type Companion from "../main";
import type { VaultContextSettings } from "../main";

export function VaultContextSettingsUI({
	plugin,
}: {
	plugin: Companion;
}) {
	const [settings, setSettings] = useState<VaultContextSettings>(
		plugin.settings.vault_context
	);
	const [isRebuilding, setIsRebuilding] = useState(false);
	const [expanded, setExpanded] = useState(false);

	const updateSettings = (newSettings: Partial<VaultContextSettings>) => {
		const updated = { ...settings, ...newSettings };
		setSettings(updated);
		plugin.settings.vault_context = updated;
		plugin.saveData(plugin.settings);
	};

	const handleRebuild = async () => {
		if (!plugin.vaultContextManager) {
			return;
		}
		setIsRebuilding(true);
		try {
			await plugin.vaultContextManager.rebuild();
		} finally {
			setIsRebuilding(false);
		}
	};

	const context = plugin.vaultContextManager?.getFullContext();

	return (
		<>
			<SettingsItem
				name="Vault Context"
				description="Analyze your vault to help the AI understand your notes and writing style"
			>
				<div
					className={
						"checkbox-container" +
						(settings.enabled ? " is-enabled" : "")
					}
					onClick={() => updateSettings({ enabled: !settings.enabled })}
				/>
			</SettingsItem>

			{settings.enabled && (
				<>
					<SettingsItem
						name="Rebuild vault context"
						description={
							context
								? `Last built: ${new Date(context.built_at).toLocaleString()} (${context.note_count} notes)`
								: "No context built yet"
						}
					>
						<button
							onClick={handleRebuild}
							disabled={isRebuilding}
						>
							{isRebuilding ? "Building..." : "Rebuild"}
						</button>
					</SettingsItem>

					<SettingsItem
						name="Max context tokens"
						description="Maximum size of the compacted context (in tokens, ~4 chars each)"
					>
						<input
							type="number"
							value={settings.max_context_tokens}
							onChange={(e) =>
								updateSettings({
									max_context_tokens: parseInt(e.target.value) || 2000,
								})
							}
						/>
					</SettingsItem>

					<SettingsItem
						name="Advanced settings"
						description={
							<div
								style={{ cursor: "pointer" }}
								onClick={() => setExpanded(!expanded)}
							>
								{expanded ? "▾ Hide" : "▸ Show"} include/exclude patterns
							</div>
						}
					/>

					{expanded && (
						<>
							<SettingsItem
								name="Include patterns"
								description="Glob patterns for notes to include (comma-separated)"
							>
								<input
									type="text"
									value={settings.include_patterns.join(", ")}
									onChange={(e) =>
										updateSettings({
											include_patterns: e.target.value
												.split(",")
												.map((p) => p.trim())
												.filter((p) => p.length > 0),
										})
									}
									style={{ width: "200px" }}
								/>
							</SettingsItem>

							<SettingsItem
								name="Exclude patterns"
								description="Glob patterns for notes to exclude (comma-separated)"
							>
								<input
									type="text"
									value={settings.exclude_patterns.join(", ")}
									onChange={(e) =>
										updateSettings({
											exclude_patterns: e.target.value
												.split(",")
												.map((p) => p.trim())
												.filter((p) => p.length > 0),
										})
									}
									style={{ width: "200px" }}
								/>
							</SettingsItem>
						</>
					)}

					{context && (
						<SettingsItem
							name="Context preview"
							description="Current compacted vault context"
						/>
					)}
					{context && (
						<pre
							style={{
								fontSize: "11px",
								backgroundColor: "var(--background-secondary)",
								padding: "8px",
								borderRadius: "4px",
								whiteSpace: "pre-wrap",
								wordWrap: "break-word",
								maxHeight: "200px",
								overflow: "auto",
							}}
						>
							{context.compacted_context}
						</pre>
					)}
				</>
			)}
		</>
	);
}
