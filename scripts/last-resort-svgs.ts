
import * as FS from "node:fs/promises";
import * as Path from "node:path";

import { getUnicodeBlocks } from "./common.ts";

const unicodeBlocks = await getUnicodeBlocks();

{
	const indexFilePath = `../external/last-resort-font/font.ufo/lib.plist`;
	const index = await FS.readFile(Path.resolve(import.meta.dirname, indexFilePath), "utf-8");
	const lastResortBlocks = Array.from(index.matchAll(/<string>lastresort(\w+)<\/string>/g)).map(match => match[1]);
	const viewBoxX = 420;
	const viewBoxY = -1315;
	const viewBoxSize = 1510;

	let svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}">`,
		`<style>`,
		`:root { color-scheme: dark light; }`,
		`path { display: none; }`,
		`path:target { display: revert; }`,
		`g { fill: CanvasText; }`,
		`</style>`,
		`<g>`,
		``,
	].join("\n");

	let blockIndex = 0;
	for (const lastResortBlock of lastResortBlocks) {
		if (lastResortBlock.startsWith("notdefplane") || lastResortBlock.startsWith("notaunicode")) continue;
		const filePath = `../external/last-resort-font/font.ufo/glyphs/lastresort${lastResortBlock}.glif`;
		const file = await FS.readFile(Path.resolve(import.meta.dirname, filePath), "utf-8");

		svg += `<path id="${unicodeBlocks[blockIndex].id}" d="\n`;

		let currentGlifLines: any[] = [];
		for (let line of file.split("\n")) {
			line = line.trim();
			if (line === "<contour>") {
				// paths.push([]);
				currentGlifLines = [];
			} else if (line === "</contour>") {
				currentGlifLines.push(currentGlifLines[0]);
				let currentCoordinates: [number, number][] = [];
				let pathCommand = "";
				let allPointsInViewBox = true;
				for (let i = 0; i < currentGlifLines.length; ++i) {
					const { xString, yString, type } = currentGlifLines[i]
						.match(/<point x="(?<xString>[-\d]+)" y="(?<yString>[-\d]+)"(?: type="(?<type>.*?)")?\/>/).groups;
					let x = (+xString) - viewBoxX;
					let y = (-+yString) - viewBoxY;

					if (i === 0) {
						pathCommand += `M ${x} ${y}\n`;
					} else {
						currentCoordinates.push([x, y]);
						if (type === "curve") {
							pathCommand += `C ${currentCoordinates.map(c => c.join(" ")).join(" ")}\n`;
						} else if (type === "line") {
							pathCommand += `L ${currentCoordinates.map(c => c.join(" ")).join(" ")}\n`;
						} else {
							continue;
						}
					}
					if (x < 0 || x > viewBoxSize || y < 0 || y > viewBoxSize) {
						allPointsInViewBox = false;
						break;
					}
					currentCoordinates = [];
				}
				if (allPointsInViewBox) {
					svg += `${pathCommand}Z\n`;
				}
			} else if (line.startsWith("<point ")) {
				currentGlifLines.push(line);
			}
		}

		svg += `" />\n`;

		++blockIndex;
	}

	svg += [
		`</g>`,
		`</svg>`,
	].join("\n");

	await FS.writeFile(Path.resolve(import.meta.dirname, "../assets/block-images.svg"), svg);
}
