
import * as FS from "node:fs/promises";
import * as Path from "node:path";
import { getUnicodeBlocks } from "./common.ts";

const namesList = (await FS.readFile(Path.resolve(import.meta.dirname, `../external/UCD/NamesList.txt`), "utf-8")).replaceAll("\r", "");
const derivedNamesList = (await FS.readFile(Path.resolve(import.meta.dirname, `../external/UCD/extracted/DerivedName.txt`), "utf-8")).replaceAll("\r", "");
const derivedAgeList = (await FS.readFile(Path.resolve(import.meta.dirname, `../external/UCD/DerivedAge.txt`), "utf-8")).replaceAll("\r", "");
const emojiSequences = (await FS.readFile(Path.resolve(import.meta.dirname, `../external/emoji/emoji-sequences.txt`), "utf-8")).replaceAll("\r", "");

const blocksMap = new Map<string, any>();
const characterMap = new Map<number, any>();
for (const block of await getUnicodeBlocks()) {
	blocksMap.set(block.name, block);
}

const toCodePointString = (codePoint: number) => codePoint.toString(16).toUpperCase().padStart(4, "0");

// const largeBlocksMap = new Map<number, any>();
// for (const line of derivedNamesList.split("\n")) {
// 	let [codePointRange, name] = line.split(";");
// 	if (!codePointRange.includes("..")) continue;
// 	const [start, end] = codePointRange.trim().split("..");
// 	largeBlocksMap.set(parseInt(start, 16), name);
// }

const blocks: any[] = [];

const checkForEmptyBlock = () => {
	const currentBlock = blocks.at(-1);
	if (!currentBlock) return;
	if (currentBlock.codePointCount === 0) {
		// console.log(currentBlock.name, currentBlock.start, largeBlocksMap.get(currentBlock.start));
		currentBlock.includedInUnicodeData = false;
	}
};

let currentCharacterObject: any;
for (const line of namesList.split("\n")) {
	const lineSegments = line.split("\t");
	switch (lineSegments[0]) {
		case ("@@"): {
			checkForEmptyBlock();
			let blockName = lineSegments[2];
			if (blockName.endsWith(")")) {
				blockName = blockName.match(/\((.+)\)$/)[1];
			}
			if (blockName === "Unassigned") break;
			const block = blocksMap.get(blockName);
			blocks.push({
				name: block.name,
				id: block.id,
				start: block.start,
				end: block.end,
				includedInUnicodeData: true,
				codePointCount: 0,
				subdivisions: [] as any[],
			});
			break;
		}
		case ("@"): {
			if (lineSegments[2] === "Noncharacters") break;
			blocks.at(-1).subdivisions.push({
				name: lineSegments[2],
				characters: [] as any,
			});
			break;
		}
		case (""): {
			if (lineSegments[1]?.[1] == " ") {
				switch (lineSegments[1][0]) {
					case ("="): {
						// alias
						if (currentCharacterObject.length == 3) currentCharacterObject.push({});
						(currentCharacterObject[3].a ??= []).push(lineSegments[1].slice(2));
						break;
					}
					case ("%"): {
						// formal alias
						if (currentCharacterObject.length == 3) currentCharacterObject.push({});
						(currentCharacterObject[3].f ??= []).push(lineSegments[1].slice(2));
						break;
					}
					case ("*"): {
						// comment
						if (currentCharacterObject.length == 3) currentCharacterObject.push({});
						(currentCharacterObject[3].c ??= []).push(lineSegments[1].slice(2));
						break;
					}
					case ("~"): {
						// variation
						if (currentCharacterObject.length == 3) currentCharacterObject.push({});
						(currentCharacterObject[3].v ??= []).push(lineSegments[1].slice(2));
						break;
					}
				}
			}
			break;
		}
		default: {
			if (/^[0-9A-F]+$/.test(lineSegments[0])) {
				const name = lineSegments[1];
				if (name === "<not a character>" || name === "<reserved>") break;
				const codePoint = parseInt(lineSegments[0], 16)
				let subdivision = blocks.at(-1).subdivisions.at(-1);
				if (!subdivision) blocks.at(-1).subdivisions.push(
					// For edge case: Todhri (U+105C0 - U+105FF) is missing a subdivision :/
					subdivision = {
						name: "Letters",
						characters: [] as any[],
					}
				);
				currentCharacterObject = [
					codePoint,
					name,
					"UNKNOWN VERSION",
				];
				subdivision.characters.push(currentCharacterObject);
				characterMap.set(codePoint, currentCharacterObject);
				++blocks.at(-1).codePointCount;
			}
		}
	}
}
checkForEmptyBlock();

{
	let currentBlockIndex = 0;
	let currentBlock = blocks[currentBlockIndex];
	for (let line of derivedNamesList.split("\n")) {
		line = line.trim();
		if (!line || line.startsWith("#")) continue;
		let [codePointRange, name] = line.split(";");
		let [codePointString, endString] = codePointRange.trim().split("..");
		let codePoint = parseInt(codePointString, 16);
		while (codePoint > currentBlock.end) {
			currentBlock = blocks[++currentBlockIndex];
		}
		if (!currentBlock.includedInUnicodeData) {
			name = name.trim();
			if (endString) {
				let end = parseInt(endString, 16);
				(currentBlock.autoNamedRanges ??= []).push({
					start: codePoint,
					end,
					prefix: name.slice(0, -1),
				});
				currentBlock.codePointCount += (end - codePoint + 1);
			} else {
				let subdivision = currentBlock.subdivisions.at(-1);
				if (!subdivision) currentBlock.subdivisions.push(
					subdivision = {
						name: currentBlock.name,
						characters: [] as any[],
					}
				);
				currentCharacterObject = [
					codePoint,
					name,
					"UNKNOWN VERSION",
				];
				subdivision.characters.push(currentCharacterObject);
				characterMap.set(codePoint, currentCharacterObject);
				++currentBlock.codePointCount;
			}
		}
	}
}

for (const block of blocks) {
	if (!block.includedInUnicodeData && block.codePointCount === 0) {
		block.includedInUnicodeData = true;
	} else if (block.codePointCount > 2_000) {
		block.largeBlock = true;
	}
}

const unicodeVersionToMonthMap: any = {};

{
	let currentVersion: string;
	for (let line of derivedAgeList.split("\n")) {
		line = line.trim();
		if (!line) continue;
		if (line.startsWith("# Age=V")) {
			currentVersion = line.slice("# Age=V".length).replaceAll("_", ".");
		} else if (
			line.startsWith("# Assigned as of Unicode ")
			|| line.startsWith("# Newly assigned in Unicode ")
		) {
			let { month, year } = line.match(/ \((?<month>.+), (?<year>.+)\)$/).groups;
			unicodeVersionToMonthMap[currentVersion] = `${month} ${year}`;
		} else if (!line.startsWith("#")) {
			let [start, end] = line.split(";")[0].trim().split("..").map(c => parseInt(c, 16));
			if (end == null) end = start;
			for (let codePoint = start; codePoint <= end; ++codePoint) {
				if (characterMap.has(codePoint)) {
					characterMap.get(codePoint)[2] = currentVersion;
				}
			}
		}
	}
}

{
	for (let line of emojiSequences.split("\n")) {
		line = line.trim();
		if (!line || line.startsWith("#")) continue;
		const lineSegments = line.split(";");
		if (lineSegments[1].trim() !== "Basic_Emoji") continue;
		let codePointString = lineSegments[0].trim();
		let qualified = !codePointString.endsWith(" FE0F");
		let [start, end] = codePointString.split("..").map(c => parseInt(c, 16));
		if (end == null) end = start;
		for (let codePoint = start; codePoint <= end; ++codePoint) {
			(characterMap.get(codePoint)[3] ??= {}).e = qualified ? "f" : "u";
		}
	}
}

await FS.writeFile(Path.resolve(import.meta.dirname, "../data/ucd.json"), JSON.stringify({
	unicodeVersionToMonthMap,
	blocks,
}));
