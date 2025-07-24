
import * as FS from "node:fs/promises";
import * as Path from "node:path";

export const normalizeBlockName = (name: string) => name.toLowerCase().replaceAll(" ", "-");

export const getUnicodeBlocks = async () => {
	const unicodeBlocksText = await FS.readFile(Path.resolve(import.meta.dirname, `../external/UCD/Blocks.txt`), "utf-8");
	const unicodeBlocks = unicodeBlocksText.split("\n").map((line) => {
		line = line.trim();
		if (!line || line.startsWith("#")) return null;

		const { start: startString, end: endString, name } = line.match(/^(?<start>[\dA-F]+)\.\.(?<end>[\dA-F]+); (?<name>.+)$/).groups;
		return {
			start: parseInt(startString, 16),
			end: parseInt(endString, 16),
			name,
			id: normalizeBlockName(name),
		};
	}).filter(Boolean);
	return unicodeBlocks;
};
