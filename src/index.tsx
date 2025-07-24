
import { css, type Config as WinzigConfig } from "winzig";

winzigConfig: ({
	output: "../",
	appfiles: "appfiles",
	css: "./main.css",
	noCSSScopeRules: true,
}) satisfies WinzigConfig;

const storagePrefix = new URL(document.baseURI).pathname + ":";

const ThemeToggle = (() => {
	const themeInStorage = localStorage.getItem(storagePrefix + "theme") ?? "auto";
	const mediaMatch = window.matchMedia("(prefers-color-scheme: light)");
	let lightTheme$ = (themeInStorage === "auto" && mediaMatch.matches) || themeInStorage === "light";
	mediaMatch.addEventListener("change", ({ matches }) => lightTheme$ = matches);
	$: {
		const themeString = lightTheme$ ? "light" : "dark";
		localStorage.setItem(
			storagePrefix + "theme",
			(lightTheme$ === mediaMatch.matches) ? "auto" : themeString
		);
		document.documentElement.dataset.theme = themeString;
	}

	return () => <button on:click={() => lightTheme$ = !lightTheme$}>
		Switch to {lightTheme$ ? "dark" : "light"} theme
		{css`
			& {
				color: light-dark(#444, #ccc);
			}
		`}
	</button>;
})();

const title = "Unicode Explorer";
const { blocks, unicodeVersionToMonthMap } = await (await fetch(import.meta.resolve("../data/ucd.json"))).json();
// blocks.splice(10, 60);
// blocks.splice(60, 200);
const toCodePointString = (codePoint: number) => codePoint.toString(16).toUpperCase().padStart(4, "0");
const toSentence = (string: string) => string[0].toUpperCase() + string.slice(1) + (string.endsWith(".") ? "" : ".");

let mainList: HTMLUListElement;
const consoleDebug = console.debug;

const Console = () => {
	let text$ = "";
	if (consoleDebug === console.debug) {
		console.debug = (...params) => {
			consoleDebug(...params);
			text$ += params.join(" ") + "\n";
		}
	}
	return <div>
		<div>
			{text$}
		</div>
		<div class="anchor"></div>
		{css`
			& {
				position: fixed;
				/* pointer-events: none; */
				background: #0006;
				inset-block-end: 0;
				inset-inline-end: 0;
				padding: .2rem .4rem;
				box-sizing: border-box;
				max-inline-size: min(30rem, 100%);
				max-block-size: 15rem;
				overflow: auto;
				white-space-collapse: preserve;
			}

			div:not(.anchor) {
				overflow-anchor: none;
			}
			
			.anchor {
				block-size: 1px;
			}
		`}
	</div>;
};

let characterDialog: HTMLDialogElement;
let currentCharacterInfoArray$: any;
// let currentCharacterElement$: HTMLButtonElement;
const characterElementToDataMap = new WeakMap<HTMLElement, any>();
// let currentCharacterName$ = "";
// let currentCharacterCodePointString$ = "";

;
<html lang="en">
	<head>
		{/* <link rel="preload" as="image" type="image/svg+xml" href="./assets/block-images.svg" /> */}
		<link rel="preload" as="fetch" crossOrigin="anonymous" href="./data/ucd.json" />
		<title>{title}</title>
		<meta name="description" content="An app built with winzig." />
		<link rel="icon" type="image/svg+xml" href="./assets/icon.svg" sizes="any" />
		<link rel="icon" type="image/png" href="./assets/icon.png" sizes="512x512" />
		<link rel="manifest" href="./app.webmanifest" />
	</head>
	<body>
		<main>
			<h1>{title}</h1>

			<p>Click a character to copy it. Long-press or right-click it for more info.</p>

			<ul>
				{...blocks.map((block: any) => {
					return <li>
						{/* {i} */}
						<a href={`#block-${block.id}`}>
							<span class="code-point-range">U+{toCodePointString(block.start)} &#x2212; U+{toCodePointString(block.end)}</span>
							<svg viewBox="0 0 1510 1510" class="block-image">
								<use href={`./assets/block-images.svg#${block.id}`} />
							</svg>
							<h3 class="block-name">{block.name}</h3>
						</a>
					</li>;
				})}
				{css`
					& {
						list-style: none;
						display: grid;
						grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
						gap: .7rem;
					}

					& > li {
						flex-grow: 1;
					}

					& > li > a {
						text-decoration: none;
						display: flex;
						flex-direction: column;
						gap: .5rem;
						flex-basis: 9rem;
						flex-grow: 1;
						block-size: 100%;
						box-sizing: border-box;
						flex-shrink: 0;
						background-color: light-dark(#f8f8f8, #181818);
						border: 1px solid light-dark(#ddd, #333);
						border-radius: .4rem;
						padding: .5rem;
						text-align: center;
					}

					.block-name {
						font-size: 1rem;
						flex-grow: 1;
						font-weight: normal;
					}

					.code-point-range {
						color: light-dark(#333, #ccc);
						font-size: .85rem;
					}

					.block-image {
						display: block;
						margin-inline: auto;
						inline-size: 3rem;

						& > use {
							fill: currentColor;
						}
					}
				`}
			</ul>

			<ul bind:this={mainList}>
				{css`
					.block-header {
						display: grid;
						grid-template-columns: auto 1fr;
						grid-template-rows: auto auto;
						margin-block: 1rem .3rem;
						column-gap: .5rem;
					}

					.block-heading {
						font-size: 1rem;
						
						& a {
							text-decoration: none;
						}
					}

					.block-image {
						grid-area: 1 / 1 / span 2 / span 1;
					}

					.code-point-range {
						color: light-dark(#333, #ccc);
					}

					.subdivisions {
						list-style: none;
						display: flex;
						flex-wrap: wrap;
						gap: 3px;
					}

					.subdivision, .characters {
						display: contents;
					}
					
					.subdivision-heading {
						display: none;
					}

					.character {
						background-color: light-dark(#0000000B, #ffffff0B);
					}

					.character > button {
						display: inline flow-root;
						font-size: 1.1rem;
						text-align: center;
						padding-block: .2em;
						/* inline-size: 1.8em; */
						min-inline-size: 1.8em;
						/* overflow: visible; */
						white-space-collapse: preserve;

						@media (hover: none) {
							user-select: none;
						}
					}

					.block-image {
						display: inline;
						inline-size: 3rem;

						& > use {
							fill: currentColor;
						}
					}
					
					.block-heading {
						display: inline;
					}
				`}
			</ul>

			<dialog bind:this={characterDialog} on:click={function (this: HTMLDialogElement, event) {
				if (event.target === this) this.close();
			}}>
				{(() => {
					let element: any = new Text("");
					$: {
						if (currentCharacterInfoArray$) {
							const [codePoint, name, unicodeVersion, { c: comments, a: alias, f: formalAlias, v: variation, e: emojiQualification } = {}] = currentCharacterInfoArray$;
							const character = String.fromCodePoint(codePoint);
							const newElement = <div>
								<button on:click={() => navigator.clipboard.writeText(character)}>
									<div>
										{character}
									</div>
									{css`
										& {
											display: block;
											min-inline-size: 10rem;
											margin-inline: auto;
											inline-size: fit-content;
										}

										& > div {
											--width-indicator-color: light-dark(#888, #888);
											--width-indicator-width: 10px;
											--width-indicator-half-height: 7px;
											display: block;
											isolation: isolate;
											white-space-collapse: preserve;
											font-size: 5rem;
											margin-inline: auto;
											inline-size: fit-content;
											position: relative;
											margin-block-end: 1.2rem;
	
											&::before {
												content: "";
												z-index: -1;
												position: absolute;
												display: block;
												block-size: 1px;
												background-color: var(--width-indicator-color);
												background-clip: padding-box;
												inset-inline: calc(0px - var(--width-indicator-width));
												inset-block-end: calc(0px - var(--width-indicator-half-height));
												border: var(--width-indicator-width) solid var(--width-indicator-color);
												border-block-width: var(--width-indicator-half-height);
												border-block-color: transparent;
											}
	
											&::after {
												content: "";
												z-index: -1;
												position: absolute;
												display: block;
												block-size: calc(1px + 2 * var(--width-indicator-half-height));
												inset-inline: -1px;
												inset-block-end: calc(0px - var(--width-indicator-half-height));
												border-inline: 1px solid var(--width-indicator-color);
											}
										}
									`}
								</button>
								<div class="code-point">
									U+{toCodePointString(codePoint)}
								</div>
								<div class="name">
									{name}
								</div>
								{formalAlias ? <div class="formal-alias">
									Corrected name: {formalAlias.join(", ")}
								</div> : ""}
								{alias ? <div class="alias">
									a.k.a. {alias.join(", ")}
								</div> : ""}
								{unicodeVersion ? <div class="unicode-version">
									added in Unicode {unicodeVersion} ({unicodeVersionToMonthMap[unicodeVersion]})
								</div> : ""}
								{emojiQualification ? <div class="emoji">
									<div>
										Should {emojiQualification === "f" ? "" : "not "}render as emoji by default.
									</div>
									<div>
										+VS15 (text): <span class="emoji-render">{character}&#xFE0E;</span>
										&nbsp;&nbsp;&nbsp;&nbsp;
										+VS16 (emoji): <span class="emoji-render">{character}&#xFE0F;</span>
									</div>
								</div> : ""}
								{comments ? <div class="comments">
									{/* &#x201C;{comments.map(capitalizeFirstLetter).join(". ")}.&#x201D; */}
									{comments.map(toSentence).join(" ")}
								</div> : ""}
								<div class="spacer" />
								<div class="external">
									{/* <h3>View this character on:</h3> */}
									<ul>
										<li>
											<a
												class="codepoints-net mask"
												href={`https://codepoints.net/U+${toCodePointString(codePoint)}`}
												title="View on codepoints.net" />
										</li>
										<li>
											<a
												class="compart mask"
												href={`https://www.compart.com/en/unicode/U+${toCodePointString(codePoint)}`}
												title="View on Compart" />
										</li>
										<li>
											<a
												class="symbl mask"
												href={`https://symbl.cc/en/${toCodePointString(codePoint)}/`}
												title="View on Symbl" />
										</li>
										<li>
											<a
												class="decodeunicode mask"
												href={`https://decodeunicode.org/en/u+${toCodePointString(codePoint)}`}
												title="View on Decodeunicode" />
										</li>
										<li>
											<a
												class="fileformat-info image"
												href={`https://www.fileformat.info/info/unicode/char/${toCodePointString(codePoint)}/index.htm`}
												title="View on FileFormat.info" />
										</li>
										<li>
											<a
												class="graphemica mask"
												href={`https://graphemica.com/${encodeURIComponent(character)}`}
												title="View on Graphemica" />
										</li>
										<li>
											<a
												class="unicodeplus image"
												href={`https://unicodeplus.com/U+${toCodePointString(codePoint)}`}
												title="View on UnicodePlus" />
										</li>
										<li>
											<a
												class="unicode-explorer-com mask"
												href={`https://unicode-explorer.com/c/${toCodePointString(codePoint)}`}
												title="View on Unicode-Explorer.com" />
										</li>
										<li>
											<a
												class="fontspace image"
												href={`https://www.fontspace.com/unicode/char/${toCodePointString(codePoint)}`}
												title="View on Fontspace" />
										</li>
										<li>
											<a
												class="google-fonts image"
												href={`https://fonts.google.com/?preview.text=${encodeURIComponent(character)}`}
												title="View on Google Fonts" />
										</li>
										<li>
											<a
												class="wikipedia mask"
												href={`https://en.wikipedia.org/wiki/${encodeURIComponent(character)}`}
												title="View on Wikipedia" />
										</li>
										<li>
											<a
												class="wiktionary mask"
												href={`https://en.wiktionary.org/wiki/${encodeURIComponent(character)}`}
												title="View on Wiktionary" />
										</li>
										<li>
											<a
												class="unicode-util mask"
												href={`https://util.unicode.org/UnicodeJsps/character.jsp?a=${encodeURIComponent(character)}`}
												title="View on the Unicode Character Properties Utility" />
										</li>
										<li>
											<a
												class="unicode-util-confusables mask"
												href={`https://util.unicode.org/UnicodeJsps/confusables.jsp?a=${encodeURIComponent(character)}`}
												title="View on the Unicode Confusables Utility" />
										</li>
										{emojiQualification ? <li>
											<a
												class="emojipedia image"
												href={`https://emojipedia.org/${encodeURIComponent(character + (emojiQualification === "f" ? "" : "\uFE0F"))}`}
												title="View on Emojipedia" />
										</li> : ""}
									</ul>
								</div>
							</div>;
							element.replaceWith(newElement);
							element = newElement;
						}
					}
					return element;
				})()}

				{css`
					& {
						inset-block-start: 10rem;
						margin-block-start: auto;
						margin-inline: auto;
						max-inline-size: 30rem;
						block-size: fit-content;
					}

					& > div {
						background-color: light-dark(#fff, #222);
						border-radius: 1rem;
						border-end-start-radius: 0;
						border-end-end-radius: 0;
						padding: 1rem;
						padding-block-start: .5rem;
						min-block-size: 20rem;
						max-block-size: calc(100dvb - 10rem);
						overflow-y: auto;
						display: flex;
						flex-direction: column;
					}

					.code-point {
						text-align: center;
						font-family: var(--monospace);
						/* color: light-dark(#333, #ccc); */
						/* font-size: 1rem; */
						padding: .1em .4em 0;
						border: 1px solid light-dark(#888, #888);
						border-radius: 4px;
						inline-size: fit-content;
						margin-inline: auto;
						margin-block-end: .3rem;
					}

					.name {
						text-align: center;
					}

					.alias, .formal-alias, .unicode-version {
						text-align: center;
						font-size: .95rem;
						color: light-dark(#333, #ccc);
					}

					.emoji {
						text-align: center;
					}

					.emoji-render {
						font-size: 1.5rem;
						vertical-align: middle;
					}

					.comments {
						margin-block: .8rem;
						padding: .2rem .5rem;
						border: 1px solid light-dark(#ddd, #444);
						border-radius: .3rem;
					}

					.spacer {
						flex-grow: 1;
					}

					.external {
						text-align: center;
						/* margin-block-start: 3rem; */
						
						h3 {
							font-size: 1rem;
							font-weight: normal;
							display: inline;
						}

						ul {
							display: inline flex;
							flex-wrap: wrap;
							gap: 6px;
							justify-content: center;
							vertical-align: middle;
							margin-block-start: .4em;
	
							> li {
								border: 1px solid light-dark(#888, #888);
								border-radius: 50%;
								display: block;
								
								&:has(:focus-visible) {
									outline: auto;
									outline-offset: 3px;
								}
	
								@layer {
									> a {
										outline: none;
										box-sizing: border-box;
										display: block;
										inline-size: 2.4rem;
										aspect-ratio: 1;
										padding: .4rem;
										display: block;
										overflow: hidden;
										text-decoration: none;
										line-height: 1.3;
										font-size: 1.1rem;

										&.mask {
											background-color: currentColor;
											mask: none center center / contain no-repeat content-box;
										}

										&.image {
											background: none center center / contain no-repeat content-box;
										}
									}
								}
							}
						}
					}

					.codepoints-net {
						mask-image: url("../assets/codepoints-net-logo.svg");
						mask-mode: luminance;
					}

					.compart {
						/* background-image: url("../assets/compart-logo.svg"); */
						mask-image: url("../assets/compart-logo.svg");
						background-image: radial-gradient(circle at center center, light-dark(#f00, #f66) .4rem, light-dark(black, white) 0);
					}

					.symbl {
						mask-image: url("../assets/symbl-logo.svg");
					}

					.decodeunicode {
						mask-image: url("../assets/decodeunicode-logo.svg");
					}

					.fileformat-info {
						background-image: url("../assets/fileformat-info-logo.svg");
					}

					.graphemica {
						mask-image: url("../assets/graphemica-logo.svg");
					}

					.unicodeplus {
						background-image: url("../assets/unicodeplus-logo.svg");
					}

					.unicode-explorer-com {
						mask-image: url("../assets/unicode-explorer-com-logo.svg");
						background-color: light-dark(#9b4dca, color-mix(in oklch, #9b4dca, white 30%));
					}

					.fontspace {
						background-image: url("../assets/fontspace-logo.svg");
					}

					.google-fonts {
						background-image: url("../assets/google-fonts-logo.svg");
					}

					.wikipedia {
						mask-image: url("../assets/wikipedia-logo.svg");
					}

					.wiktionary {
						mask-image: url("../assets/wiktionary-logo.svg");
					}

					.unicode-util {
						mask-image: url("../assets/unicode-logo.svg");
					}

					.unicode-util-confusables {
						mask-image: url("../assets/confusables-icon.svg");
					}

					.emojipedia {
						background-image: url("../assets/emojipedia-logo.png");
					}
				`}
			</dialog>

			{new URLSearchParams(location.search).has("debug") ? <Console /> : ""}

			{css`
				& {
					padding-inline: 1rem;
					padding-block-start: .8rem;
					flex-grow: 1;
				}
			`}
		</main>

		<footer>
			<a href="https://github.com/BenjaminAster/winzig/tree/main/packages/winzig/templates/default">View source code</a>
			<div className="space" />
			<ThemeToggle />

			{css`
				& {
					display: flex;
					font-size: .9rem;
					flex-wrap: wrap;
					column-gap: 1rem;
					padding: .2rem .6rem;
					background-color: light-dark(#eee, #222);
				}

				.space {
					flex-grow: 1;
				}
			`}
		</footer>
	</body>
</html>;

const characterClick = function (this: HTMLButtonElement) {
	clearTimeout(currentTimeoutId);
	currentTimeoutId = 0;
	navigator.clipboard.writeText(this.textContent);
};

const fakeFocus = () => {
	console.debug("fakefocus");
	document.body.click();
	document.body.focus();
	document.body.dispatchEvent(new PointerEvent("pointerup", {
		clientX: 1,
		clientY: 1,
		pointerType: "touch",
	}));
	document.body.dispatchEvent(new PointerEvent("pointercancel", {
		clientX: 1,
		clientY: 1,
		pointerType: "touch",
	}));
	document.body.dispatchEvent(new PointerEvent("pointerdown", {
		clientX: 1,
		clientY: 1,
		pointerType: "touch",
	}));
	document.body.dispatchEvent(new PointerEvent("pointerup", {
		clientX: 1,
		clientY: 1,
		pointerType: "touch",
	}));
	document.body.dispatchEvent(new PointerEvent("pointercancel", {
		clientX: 1,
		clientY: 1,
		pointerType: "touch",
	}));
	document.body.dispatchEvent(new PointerEvent("pointerdown", {
		clientX: 1,
		clientY: 1,
		pointerType: "touch",
	}));
	document.body.click();
	document.body.focus();
};

const showDialogForCharacter = (element: HTMLButtonElement) => {
	// currentCharacterElement$ = element;
	currentCharacterInfoArray$ = characterElementToDataMap.get(element);
	characterDialog.showModal();
};

// let lastPointerdownX = 0;
// let lastPointerdownY = 0;
let currentTimeoutId = 0;
const characterPointerdown = function (this: HTMLButtonElement, event: PointerEvent) {
	// lastPointerdownX = event.clientX;
	// lastPointerdownY = event.clientY;
	const codePoint = this.textContent.codePointAt(0);
	// console.debug("pointerdown", event, this, codePoint);
	console.debug("pointerdown", this.textContent);
	if (!currentTimeoutId) {
		currentTimeoutId = setTimeout(() => {
			// console.debug(this);
			currentTimeoutId = 0;
			showDialogForCharacter(this);
			// fakeFocus();
			// console.debug(`opening https://codepoints.net/U+${toCodePointString(codePoint)}`);
			// window.open(`https://codepoints.net/U+${toCodePointString(codePoint)}`);
			// fakeFocus();
		}, 400);
	} else {
		clearTimeout(currentTimeoutId);
		currentTimeoutId = 0;
	}
};

const characterContextmenu = function (this: HTMLButtonElement, event: PointerEvent) {
	event.preventDefault();
	if (event.pointerType !== "touch") {
		clearTimeout(currentTimeoutId);
		currentTimeoutId = 0;
		showDialogForCharacter(this);
		// window.open(`https://codepoints.net/U+${toCodePointString(this.textContent.codePointAt(0))}`);
	}
};

{
	const pointerUpOrCancel = (event: PointerEvent) => {
		console.debug(event.type);
		if (currentTimeoutId) {
			clearTimeout(currentTimeoutId);
			currentTimeoutId = 0;
		}
	};
	document.body.addEventListener("pointerup", pointerUpOrCancel);
	document.body.addEventListener("pointercancel", pointerUpOrCancel);

	document.body.addEventListener("pointerdown", (event) => {
		console.debug(
			"body pointerdown",
			(event.composedPath()[0] as Node).textContent.slice(0, 10),
			event.clientX | 0,
			event.clientY | 0,
			document.elementFromPoint(event.clientX, event.clientY).textContent.slice(0, 10),
		);
	});

	window.addEventListener("pageshow", () => {
		console.debug("pageshow");
		fakeFocus();
	});
	window.addEventListener("pagereveal", () => {
		console.debug("pagereveal");
		fakeFocus();
	});
	document.addEventListener("visibilitychange", () => {
		console.debug(document.visibilityState, document.hidden);
		fakeFocus();
	});
}

const Character = ({ infoArray }: { infoArray: [number, string, any?] }) => {
	const [codePoint, name] = infoArray;
	const button = <button
		title={`U+${toCodePointString(codePoint)} ${name}`}
		on:click={characterClick}
		on:pointerdown={characterPointerdown}
		on:contextmenu={characterContextmenu}>
		{String.fromCodePoint(codePoint)}
	</button>;
	// const button = <button
	// 	title={`U+${toCodePointString(codePoint)} ${name}`}
	// 	data:codePoint={toCodePointString(codePoint)}
	// 	data:name={name}
	// 	on:click={characterClick}
	// 	on:pointerdown={characterPointerdown}
	// 	on:contextmenu={characterContextmenu}>
	// 	{String.fromCodePoint(codePoint)}
	// </button>;
	characterElementToDataMap.set(button, infoArray);
	return <li class="character">
		{button}
	</li>;
};

if (!window.process?.isServer) {
	for (const block of blocks) {
		mainList.append(
			<li class="block" id={`block-${block.id}`}>
				<div class="block-header">
					<svg viewBox="0 0 1510 1510" class="block-image">
						<use href={`./assets/block-images.svg#${block.id}`} />
					</svg>
					<span class="code-point-range">
						U+{toCodePointString(block.start)} &#x2212; U+{toCodePointString(block.end)}, { }
						{block.codePointCount} code points
					</span>
					<h3 class="block-heading">
						<a href={`https://en.wikipedia.org/wiki/${block.name.replaceAll(" ", "_")}_(Unicode_block)`}>
							{block.name}
						</a>
					</h3>
				</div>
				{
					block.codePointCount > 0x400
						? <div>
							Large blocks are not rendered by default. { }
							<a href={`https://codepoints.net/${block.name.toLowerCase().replaceAll(" ", "_")}`}>View on Codepoints.net</a>
						</div>
						: <ul class="subdivisions">
							{...(block.autoNamedRanges
								? block.autoNamedRanges.map(({ start, end, prefix }: any) => {
									return <li class="subdivision">
										<ul class="characters">
											{...Array.from({ length: end - start + 1 }, (_, index) =>
												<Character infoArray={[start + index, prefix + toCodePointString(start + index), null]} />
											)}
										</ul>
									</li>;
								})
								: block.subdivisions.map((subdivison: any) => {
									return <li class="subdivision">
										{/* <h4 class="subdivision-heading">{subdivison.name}</h4> */}
										<ul class="characters">
											{...subdivison.characters.map((infoArray: any) => {
												return <Character infoArray={infoArray} />;
											})}
										</ul>
									</li>;
								})
							)}
						</ul>
				}
			</li>
		);

		if ((window as any).scheduler?.yield) {
			await (window as any).scheduler.yield();
		} else {
			const { promise, resolve } = Promise.withResolvers();
			setTimeout(resolve, 0);
			await promise;
		}
	}
}

localStorage.setItem(storagePrefix + "last-visited", new Date().toISOString());
