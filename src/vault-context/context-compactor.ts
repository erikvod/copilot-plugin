import { ScanResult, ScannedNote } from "./vault-scanner";
import { VaultContext } from "./context-storage";

const STOPWORDS = new Set([
	"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
	"of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
	"be", "have", "has", "had", "do", "does", "did", "will", "would",
	"could", "should", "may", "might", "must", "shall", "can", "need",
	"that", "this", "these", "those", "it", "its", "i", "you", "he",
	"she", "we", "they", "what", "which", "who", "whom", "how", "when",
	"where", "why", "all", "each", "every", "both", "few", "more", "most",
	"other", "some", "such", "no", "nor", "not", "only", "own", "same",
	"so", "than", "too", "very", "just", "also", "now", "here", "there",
	"then", "if", "because", "about", "into", "through", "during", "before",
	"after", "above", "below", "between", "under", "again", "further",
	"once", "any", "your", "my", "his", "her", "their", "our",
]);

export class ContextCompactor {
	compact(scanResult: ScanResult, maxTokens: number): VaultContext {
		const { notes, totalCharacters } = scanResult;

		const topics = this.extractTopics(notes);
		const terminology = this.extractTerminology(notes);
		const writingStyle = this.analyzeWritingStyle(notes);
		const folderSummary = this.summarizeFolders(notes);

		const compactedContext = this.assembleContext(
			notes.length,
			topics,
			terminology,
			writingStyle,
			folderSummary,
			maxTokens
		);

		return {
			version: 1,
			built_at: Date.now(),
			note_count: notes.length,
			total_characters: totalCharacters,
			topics,
			terminology,
			writing_style: writingStyle,
			folder_summary: folderSummary,
			compacted_context: compactedContext,
		};
	}

	private extractTopics(notes: ScannedNote[]): string[] {
		const wordFreq = new Map<string, number>();

		for (const note of notes) {
			const headers = this.extractHeaders(note.content);
			const words = this.tokenize(headers.join(" ") + " " + note.content);

			for (const word of words) {
				const lower = word.toLowerCase();
				if (lower.length < 3 || STOPWORDS.has(lower)) continue;
				wordFreq.set(lower, (wordFreq.get(lower) || 0) + 1);
			}
		}

		const sorted = [...wordFreq.entries()]
			.filter(([_, count]) => count >= 3)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 30)
			.map(([word]) => word);

		return sorted;
	}

	private extractTerminology(notes: ScannedNote[]): string[] {
		const terms = new Map<string, number>();

		for (const note of notes) {
			const wikiLinks = note.content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g) || [];
			for (const link of wikiLinks) {
				const term = link.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/, "$1");
				terms.set(`[[${term}]]`, (terms.get(`[[${term}]]`) || 0) + 1);
			}

			const tags = note.content.match(/#[a-zA-Z][a-zA-Z0-9_-]*/g) || [];
			for (const tag of tags) {
				terms.set(tag, (terms.get(tag) || 0) + 1);
			}

			const capitalizedPhrases = note.content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
			for (const phrase of capitalizedPhrases) {
				if (phrase.length > 3) {
					terms.set(phrase, (terms.get(phrase) || 0) + 1);
				}
			}
		}

		const sorted = [...terms.entries()]
			.filter(([_, count]) => count >= 2)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 30)
			.map(([term]) => term);

		return sorted;
	}

	private analyzeWritingStyle(notes: ScannedNote[]): string {
		if (notes.length === 0) return "No notes to analyze";

		let totalSentences = 0;
		let totalWords = 0;
		let bulletCount = 0;
		let headerCount = 0;
		let codeBlockCount = 0;

		for (const note of notes) {
			const sentences = note.content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
			totalSentences += sentences.length;

			const words = this.tokenize(note.content);
			totalWords += words.length;

			bulletCount += (note.content.match(/^[\s]*[-*+]\s/gm) || []).length;
			headerCount += (note.content.match(/^#+\s/gm) || []).length;
			codeBlockCount += (note.content.match(/```/g) || []).length / 2;
		}

		const avgWordsPerSentence = totalSentences > 0
			? Math.round(totalWords / totalSentences)
			: 0;

		const avgBulletsPerNote = Math.round(bulletCount / notes.length);
		const avgHeadersPerNote = Math.round(headerCount / notes.length);

		const styleDescriptors: string[] = [];

		if (avgWordsPerSentence < 12) {
			styleDescriptors.push("concise sentences");
		} else if (avgWordsPerSentence > 20) {
			styleDescriptors.push("detailed sentences");
		} else {
			styleDescriptors.push("moderate sentence length");
		}

		if (avgBulletsPerNote > 5) {
			styleDescriptors.push("heavy use of bullet points");
		} else if (avgBulletsPerNote > 0) {
			styleDescriptors.push("occasional bullet points");
		}

		if (avgHeadersPerNote > 3) {
			styleDescriptors.push("well-structured with headers");
		}

		if (codeBlockCount > notes.length * 0.1) {
			styleDescriptors.push("includes code blocks");
		}

		return `${avgWordsPerSentence} words/sentence avg, ${styleDescriptors.join(", ")}`;
	}

	private summarizeFolders(notes: ScannedNote[]): Record<string, string> {
		const folderNotes = new Map<string, ScannedNote[]>();

		for (const note of notes) {
			const existing = folderNotes.get(note.folder) || [];
			existing.push(note);
			folderNotes.set(note.folder, existing);
		}

		const summary: Record<string, string> = {};

		for (const [folder, folderNoteList] of folderNotes) {
			const noteCount = folderNoteList.length;
			const topWords = this.extractTopics(folderNoteList).slice(0, 5);
			const displayFolder = folder === "/" ? "Root" : folder;

			if (topWords.length > 0) {
				summary[displayFolder] = `${noteCount} notes about ${topWords.join(", ")}`;
			} else {
				summary[displayFolder] = `${noteCount} notes`;
			}
		}

		return summary;
	}

	private assembleContext(
		noteCount: number,
		topics: string[],
		terminology: string[],
		writingStyle: string,
		folderSummary: Record<string, string>,
		maxTokens: number
	): string {
		const maxChars = maxTokens * 4;

		let context = `VAULT CONTEXT (${noteCount} notes):\n`;
		context += `Topics: ${topics.slice(0, 15).join(", ")}\n`;
		context += `Terms: ${terminology.slice(0, 15).join(", ")}\n`;
		context += `Style: ${writingStyle}\n`;

		const folderEntries = Object.entries(folderSummary)
			.sort((a, b) => {
				const countA = parseInt(a[1].match(/^\d+/)?.[0] || "0");
				const countB = parseInt(b[1].match(/^\d+/)?.[0] || "0");
				return countB - countA;
			})
			.slice(0, 10);

		if (folderEntries.length > 0) {
			context += "Folders:\n";
			for (const [folder, desc] of folderEntries) {
				context += `  - ${folder}: ${desc}\n`;
			}
		}

		if (context.length > maxChars) {
			context = context.slice(0, maxChars - 3) + "...";
		}

		return context.trim();
	}

	private extractHeaders(content: string): string[] {
		const headerRegex = /^#+\s+(.+)$/gm;
		const headers: string[] = [];
		let match;

		while ((match = headerRegex.exec(content)) !== null) {
			headers.push(match[1]);
		}

		return headers;
	}

	private tokenize(text: string): string[] {
		return text
			.replace(/[#\[\]`*_~]/g, " ")
			.split(/\s+/)
			.filter((word) => word.length > 0);
	}
}
