/**

Railroad ASCII notation guide

[x]				    optional, normally omitted
[:x]			    optional, normally included
{x}				    one or more
{x y}		      one or more
[{x y}]			  zero or more, normally omitted
[:{x y}]			zero or more, normally included
[{x | y}]		  zero or more, normally omitted
[:{x | y}]		zero or more with lower captioning, normally included

x y z			    implicit sequence
<-x y z ->		explicit sequence
<^x y z^>		  explicit stack sequence (ie. Stack)
<@ x y @>     alternating sequence (ie. AlternatingSequence)
<?x y z?>     optional sequence (ie. OptionalSequence)

(?x|y|z?)			alternatives (ie, Choice)
(?x|:y|z?)		alternatives, normally y (ie, Choice)
(-x|y|z-)		  horizontal alternatives (ie. HorizontalChoice)
($x|:y|z$)	  all alternatives, normally y (ie. MultipleChoice)
(&x|:y|z&)	  any alternatives, normally y (ie. MultipleChoice)
-						  by pass (ie. Skip)

"title|link"		  terminal with optional link
<"title|link">	  nonterminal with optional link
+=[|title|link= start (simple: ||, complex: |)
=title|link]|=+ end (simple: ||, complex: |, join back to main line: +)
/"text|link"/	comment (see titleLinkDelim for delimiter)

"x" can also be written 'x' or """x"""

pragmas:
	@dbg				toggle
	@esc<char>	set character
	@arw				toggle
 */

// const funcs = {};

import {Options, 
				Diagram, ComplexDiagram, 
				Sequence, Stack, OptionalSequence, AlternatingSequence,
				Choice, HorizontalChoice, MultipleChoice, 
				Optional, OneOrMore, ZeroOrMore,
				Start, End, Terminal, NonTerminal, Comment, Skip, Block} from './railroad';

export class DiagramParser {
	context = new ParserReadContext();
	parsers = new Array<ComponentParser>();
	tokenStack = [];

  constructor(src: string) {
		this.context.source = src.trim();
		this.loadParsers();	
		this.reorderParsers();
	}

	parse(): any {
		let items = [];
		while (this.context.hasMore()) {
			let item = this.parseNextComponent(undefined);
			items.push(item);
			this.context.skipWhitespace();
		}
		return new Diagram(...items);
	}

	parseNextComponent(callerState: ParserState): any[] {
		let state = this.getParser(callerState);
		let item = state.parser.parse(state);
		return item;
	}

	getParser(callerState: ParserState): ParserState {
		console.log(`1. [${callerState ? callerState.operationName: 'Diagram'}] seeking parser for -->${this.context.source.substr(this.context.pos, 2)}<--`);
		for (let i = 0; i < this.parsers.length; i++) {
			const parser = this.parsers[i];
			let state = parser.canParse();
			if (state) {
				console.log(`2. Found parser for -->${state.openSyntax}<- ${state.operationName}`);
				return state;
			}
		}
		let tsStr = this.prepareTroubleshootingHint();
		throw new Error(`Illegal argument: [${callerState ? callerState.operationName: 'Diagram'}] - Within  ${callerState ? callerState.openSyntax + " ... " + callerState.closeSyntax : 'Root'}.  No parsers can handle the following signature tokens: "${this.context.source.substr(this.context.pos, 4)}. Refer to this tokenised stack for troubleshooting: ${tsStr}"`);
	}

	prepareTroubleshootingHint(): string {
		for (let i = 0; i < this.tokenStack.length; i++) {
			let ts = this.tokenStack[i];
			ts.value = JSON.stringify(ts.value);
		}
		return JSON.stringify(this.tokenStack);
	}
	
	addToTokenisedStack(state: ParserState): void {
		let tokenisedItem = {
			signature: state.openSyntax,
			operator: state.operationName,
			value: state.attr
		};
		this.tokenStack.push(tokenisedItem);
	}

	protected loadParsers() {
		// load container parsers 1st
		this.registerParser(new SequenceParser(this));
		this.registerParser(new ChoiceParser(this));
		this.registerParser(new OptionalParser(this));
		this.registerParser(new RepeatParser(this));
		this.registerParser(new LiteralNonTerminalParser(this));
		this.registerParser(new NonTerminalParser(this)); 
		// NonTerminalParser must preceed TerminalParser to ensure <" matches before just "
		this.registerParser(new TerminalParser(this));
		this.registerParser(new CommentParser(this));
		this.registerParser(new StartParser(this));
		this.registerParser(new EndParser(this));
		this.registerParser(new SkipParser(this));
		this.registerParser(new PragmaParser(this));
	}

	protected registerParser(parser: ComponentParser) {
		this.parsers.push(parser);
	}

	protected reorderParsers() {
	}
}

class ParserReadContext {
	// Pragmas
	debug = false;				// toggled on|off by @dbg
	escapeChar = '`';			// modified by @esc <char> 
	repeatArrows = true;	// toggled on|off by @arw

	source = "";
	pos = 0;

	hasMore() {
		return (this.pos < this.source.length);
	}

	readIn(len: number): number {
		this.pos += len;
		console.log(`\tParserReadContext::readIn len:${len}, this.pos: ${this.pos}, 1st5-> ${this.source.substr(this.pos,5)}`);
		return this.pos;
	}

	skipTo(newPos: number): string {
		let ret = this.source.substr(this.pos, newPos - this.pos);
		console.log(`\tParserReadContext::skipTo newPos ${newPos} skipped-over: ${ret}`);
		this.readIn(newPos - this.pos);
		return ret;
	}

	skipWhitespace(): number {
		let match = this.source.substr(this.pos).match(/\S/);
		if (match && match.index > 0) {
			console.log(`\tParserReadContext::skipWhitespace match.index ${match.index}`);
			this.readIn(match.index)
		}
		return this.pos;
	}

	private sigCacheHdr: string[] = [];
	private sigCachePos: number;

	hasSignature(regOrStr: RegExp): string;
	hasSignature(regOrStr: string): string;
	hasSignature(regOrStr: any): string
	{
		if (this.sigCachePos !== this.pos) {
			this.sigCacheHdr = [];
			this.sigCachePos = this.pos;
		}
		let ret: string = undefined; 
		if (typeof regOrStr === "string") {
			if (!this.sigCacheHdr[regOrStr.length])
				this.sigCacheHdr[regOrStr.length] = this.source.substr(this.pos, regOrStr.length);
			if ( this.sigCacheHdr[regOrStr.length] === regOrStr)
				ret = regOrStr;
		} else {
			if (!this.sigCacheHdr[0])
				this.sigCacheHdr[0] = this.source.substr(this.pos);
			let match = this.sigCacheHdr[0].match(regOrStr);
			if (match)
				ret = match[0];
		}
		if (ret)
			console.log(`\tParserReadContext::hasSignature (${regOrStr}) matched with -->${ret}<--`);
		return ret;
	}

	// escapedIndexOf(criteria: string, countAhead: number): number {
	// 	let startFrom = this.pos + countAhead;
	// 	let ret = this.escapedStringIndexOf(this.source, criteria, startFrom);
	// 	console.log(`\tParserReadContext::escapedIndexOf ret = ${ret}`);
	// 	return ret;
	// }

	escapedStringIndexOf(src: string, criteria: string, startFrom: number): number {
		let foundPos = -1;
		while (true) {
			foundPos = src.indexOf(criteria, startFrom);
			if (foundPos === -1)
				break;
			if (src.charAt(foundPos-1) !== this.escapeChar) {
				break;
			}
			startFrom = foundPos + 1;
		}
		console.log(`\tParserReadContext::escapedStringIndexOf foundPos = ${foundPos} -> crit: ${criteria}`);
		return foundPos;
	}

	escapedRegExIndexOf(src: string, criteria: RegExp, startFrom: number, storeMatch: string[]): number {
		let foundPos = -1;
		let match = undefined;
		while (true) {
			criteria.lastIndex = startFrom;
			match = src.match(criteria);
			if (match && match.index)
				foundPos = match.index;
			else
				foundPos = -1;
			if (foundPos === -1)
				break;
			if (src.charAt(foundPos-1) !== this.escapeChar) {
				break;
			}
			startFrom = foundPos + 1;
		}
		storeMatch[0] = foundPos > -1 ? match[0]: undefined;
		console.log(`\tParserReadContext::escapedRegExIndexOf foundPos = ${foundPos} -> crit: ${criteria}`);
		return foundPos;
	}

	unescape(src: string): string {
		return src.replace(this.escapeChar, '');
	}
}

class ParserState {
	items = [];
	attr: any = {};
	constructor(	public parser: ComponentParser, 
								public startsFrom: number, 
								public openSyntax: string, 
								public closeSyntax: string,
								public operationName: string
							) {
	}
}

// Note: All parsers must be implemented to be stateless. 
// Use ParserState for storage!
abstract class ComponentParser {
	ctx: ParserReadContext = this.container.context;
	constructor(public container: DiagramParser) {
	}

	abstract canParse(): ParserState;
	abstract parse(state: ParserState): any; 

	protected canParseWith(openingList: string[], closingList: string[], regOrStr: RegExp, opName: string): ParserState;
	protected canParseWith(openingList: string[], closingList: string[], regOrStr: string, opName: string): ParserState;
	protected canParseWith(openingList: string[], closingList: string[], regOrStr: any, opName: string): ParserState {
		let state = undefined;
		let match = this.ctx.hasSignature(regOrStr);
		if (match) {
			let i = openingList.indexOf(match);
			state = new ParserState(this, this.ctx.pos+2, openingList[i], closingList[i], opName);
		}
		return state;
	}

	protected raiseMissingClosureError(open: string, close: string, op: string): void {
		throw new Error(`Missing closure: ${open} ... ${close} - ${op} terminated with closing notation`);
	}
}

abstract class TitleLinkComponentParser extends ComponentParser {
	static DELIM = "|";

	readUntilClosingToken(state: ParserState, useClosingRegEx?: RegExp): string[] {
		console.log(`\tTitleLinkComponentParser::readUntilClosingToken::start`);
		this.container.addToTokenisedStack(state);
		this.ctx.readIn(state.openSyntax.length);
		let pos = -1;
		if (useClosingRegEx) {
			let storeMatch: string[] = [];
			pos = this.ctx.escapedRegExIndexOf(this.ctx.source, useClosingRegEx, this.ctx.pos,storeMatch);
			state.closeSyntax = storeMatch[0];
		} else
			pos = this.ctx.escapedStringIndexOf(this.ctx.source, state.closeSyntax, this.ctx.pos);
		if (pos === -1)
			this.raiseMissingClosureError(state.openSyntax, state.closeSyntax, state.operationName);
		let comment = this.ctx.skipTo(pos);
		let ret = this.finaliseState(comment, state);
		console.log(`3. title|link parsed as: ${ret[0]} | ${ret[1]}`);
		this.ctx.readIn(state.closeSyntax.length);
		console.log(`\tTitleLinkComponentParser::readUntilClosingToken::end`);
		return ret;
	}

	protected finaliseState(comment: string, state: ParserState): string[] {
		let ret = this.readTitleLink(comment);
		state.attr.text = ret[0];
		state.attr.link = ret[1];
		state.items.push(ret);
		return ret;
	}

	protected readTitleLink(comment: string): string[] {
		let pos = this.ctx.escapedStringIndexOf(comment, TitleLinkComponentParser.DELIM, 0);
		if (pos === -1)
			return [comment, undefined];
		let link = comment.substr(pos+1);
		let escapedComment = comment.substr(0, pos);
		comment = this.ctx.unescape(escapedComment);
		return [comment, link];
	}
}

/*
<-x y z ->		explicit sequence
<^x y z^>		  explicit stack sequence (ie. Stack)
<@ x y @>     alternating sequence (ie. AlternatingSequence)
<?x y z?>     optional sequence (ie. OptionalSequence)
*/
class SequenceParser extends ComponentParser {
	static OPEN_LIST = ["<-", "<^", "<@", "<?"];	
	static CLOSE_LIST = ["->", "^>", "@>", "?>"];
	static REG_EX = /^(<-|<\^|<\@|<\?)/;

	canParse(): ParserState {
		let ret = this.canParseWith(SequenceParser.OPEN_LIST, SequenceParser.CLOSE_LIST, SequenceParser.REG_EX, "sequence parser");
		return ret;
	}

	parse(state: ParserState): any {
		console.log(`\tSequenceParser::parse::start`);
		this.container.addToTokenisedStack(state);
		this.ctx.readIn(state.openSyntax.length); 
		state.attr.closed = false;
		state.attr.type = SequenceParser.OPEN_LIST.indexOf(state.openSyntax);
		this.ctx.skipWhitespace();
		while (this.ctx.hasMore()) {
			let match = this.ctx.hasSignature(state.closeSyntax);
			if (match) {
				this.ctx.readIn(state.closeSyntax.length);
				state.attr.closed = true;
				break;
			} 
			let items = this.container.parseNextComponent(state);
			state.items.push(items); 
			this.ctx.skipWhitespace();
		}
		if (!state.attr.closed)
			this.raiseMissingClosureError(state.openSyntax, state.closeSyntax, state.operationName);
		console.log(`\tSequenceParser::parse::end`);
		return this.constructModel(state);
	}

	private constructModel(state: ParserState) {
		let rrdType: any = undefined;
		if (state.attr.type === 0)
			rrdType = new Sequence(...state.items);
		else if (state.attr.type === 1)
			rrdType = new Stack(...state.items);
		else if (state.attr.type === 2)
			rrdType = new AlternatingSequence(...state.items);
		else
			rrdType = new OptionalSequence(...state.items);
		return rrdType;
	}
}

/*
(?x|y|z?)			alternatives (ie, Choice)
(?x|:y|z?)		alternatives, normally y (ie, Choice)
(-x|y|z-)		  horizontal alternatives (ie. HorizontalChoice)
($x|:y|z$)	  all alternatives, normally y (ie. MultipleChoice)
(&x|:y|z&)	  any alternatives, normally y (ie. MultipleChoice)
*/
class ChoiceParser extends ComponentParser {
	static OPEN_LIST = ["(?", "(-", "($", "(&"];	
	static CLOSE_LIST = ["?)", "-)", "$)", "&)"];
	static OPTION_DELIM = "|";
	static PREFER_DELIM = ":";
	static REG_EX = /^(\(\?|\(-|\(\$|\(&)/;

	canParse(): ParserState {
		let ret = this.canParseWith(ChoiceParser.OPEN_LIST, ChoiceParser.CLOSE_LIST, ChoiceParser.REG_EX, "choice parser");
		return ret;
	}

	parse(state: ParserState): any {
		console.log(`\tChoiceParser::parse::start`);
		this.container.addToTokenisedStack(state);
		this.ctx.readIn(state.openSyntax.length);	
		state.attr.closed = false;
		this.prepareInitialState(state);	
		this.ctx.skipWhitespace();
		while (this.ctx.hasMore()) {
			let match: string = this.ctx.hasSignature(state.closeSyntax);
			if (match) {
				this.ctx.readIn(state.closeSyntax.length);	
				state.attr.closed = true;
				break;
			} 
			match = this.ctx.hasSignature(ChoiceParser.OPTION_DELIM);
			if (match) 
				this.handleNextOption(state);
			else {
				match = this.ctx.hasSignature(ChoiceParser.PREFER_DELIM);
				if (match) 
					this.handlePreferredOption(state);
			}
			if (!match) {
				let item = this.container.parseNextComponent(state);
				state.items[state.attr.optionsCount-1].push(item); 
			}
			this.ctx.skipWhitespace();
		}
		if (!state.attr.closed)
			this.raiseMissingClosureError(state.openSyntax, state.closeSyntax, state.operationName);
		console.log(`\tChoiceParser::parse::end`);
		return this.constructModel(state);
	}

	private prepareInitialState(state: ParserState) {
		state.attr.type = ChoiceParser.OPEN_LIST.indexOf(state.openSyntax);
		state.attr.optionsCount = 1;
		state.attr.preferIndex = -1;
		state.items[0] = []; // implicit sequence for each choice section
	}

	private handlePreferredOption(state: ParserState) {
		this.ctx.readIn(ChoiceParser.PREFER_DELIM.length);
		if (state.attr.preferIndex > -1)
			throw new Error(`Illegal argument: ${state.openSyntax} ... ${state.closeSyntax} - ${state.operationName} supports only 1 default preceding the option using ${ChoiceParser.PREFER_DELIM}`);
		state.attr.preferIndex = state.attr.optionsCount-1;
		console.log(`\tChoiceParser::parse::preferIndex = ${state.attr.preferIndex}`);
	}

	private handleNextOption(state: ParserState) {
		this.ctx.readIn(ChoiceParser.OPTION_DELIM.length);
		if (state.attr.optionsCount === 1 && state.items[state.attr.optionsCount-1].length === 0)
			throw new Error(`Illegal argument:  ${state.openSyntax} ... ${state.closeSyntax} - ${state.operationName} requires an option before/betweem ${ChoiceParser.OPTION_DELIM}`);
		state.attr.optionsCount++;
		state.items[state.attr.optionsCount-1] = [];
		console.log(`\tChoiceParser::parse::optionsCount = ${state.attr.optionsCount}`);
	}

	private constructModel(state: ParserState): any {
		let rrdType: any = undefined;
		let normal = state.attr.preferIndex === -1 ? 0 : state.attr.preferIndex;
		this.finaliseItemsForModel(state);
		if (state.attr.type === 0)
			rrdType = new Choice(normal, ...state.items);
		else if (state.attr.type === 1)
			rrdType = new HorizontalChoice(...state.items);
		else if (state.attr.type >= 2) {
			let type = state.attr.type === 2 ? "all" : "any";
			rrdType = new MultipleChoice(normal, type, ...state.items);
		}
		return rrdType;
	}

	private finaliseItemsForModel(state: ParserState): void {
		let revision = [];
		for (let i = 0; i < state.items.length; i++) {
			if (state.items[i].length === 0)
				state.items[i] = undefined;
			else if (state.items[i].length === 1)
				state.items[i] = state.items[i][0];
			else {
				state.items[i] = new Sequence(...state.items[i]);
			}
			if (state.items[i])
				revision.push(state.items[i]);
		}
		state.items = revision;
	}
}

/*
/"text|link"/	comment (see titleLinkDelim for delimiter)
 */
class CommentParser extends TitleLinkComponentParser {
	static OPEN_LIST = ["/\""];
	static CLOSE_LIST = ["\"/"];

	canParse(): ParserState {
		let ret = this.canParseWith(CommentParser.OPEN_LIST, CommentParser.CLOSE_LIST, CommentParser.OPEN_LIST[0], "comment parser");
		return ret;
	}	

	parse(state: ParserState): any {
		let titleLinkArr = super.readUntilClosingToken(state);
		let rrdType = new Comment(titleLinkArr[0], titleLinkArr[1]);
		return rrdType;
	}
}

/*
<"title|link">	  nonterminal with optional link
 */
class NonTerminalParser extends TitleLinkComponentParser {
	static OPEN_LIST = ["<\""];
	static CLOSE_LIST = ["\">"];

	canParse(): ParserState {
		let ret = this.canParseWith(NonTerminalParser.OPEN_LIST, NonTerminalParser.CLOSE_LIST, NonTerminalParser.OPEN_LIST[0], "nonterminal parser");
		return ret;
	}	

	parse(state: ParserState): any {
		let titleLinkArr = super.readUntilClosingToken(state);
		let rrdType = new NonTerminal(titleLinkArr[0], titleLinkArr[1]);
		return rrdType;
	}
}

/*
"title|link"		  terminal with optional link
 */
class TerminalParser extends TitleLinkComponentParser {
	static OPEN_LIST = ["\""];
	static CLOSE_LIST = ["\""];

	canParse(): ParserState {
		let ret = this.canParseWith(TerminalParser.OPEN_LIST, TerminalParser.CLOSE_LIST, TerminalParser.OPEN_LIST[0], "terminal parser");
		return ret;
	}	

	parse(state: ParserState): any {
		let titleLinkArr = super.readUntilClosingToken(state);
		let rrdType = new Terminal(titleLinkArr[0], titleLinkArr[1]);
		return rrdType;
	}
}

export class StartParser extends TitleLinkComponentParser {
	static CLOSE = "=";
	static REG_EX = /^\+?=\[\|?/;

	canParse(): ParserState {
		let state = undefined;
		let match = this.ctx.hasSignature(StartParser.REG_EX);
		if (match) 
			state = new ParserState(this, this.ctx.pos+match.length, match, StartParser.CLOSE, "start parser");
		return state;
	}	

	parse(state: ParserState): any {
		let titleLinkArr = super.readUntilClosingToken(state);
		let rrdType = new Terminal(titleLinkArr[0], titleLinkArr[1]);
		state.attr.joinSol = (state.openSyntax.charAt(0) === "+");
		state.attr.type = state.openSyntax.endsWith("=[|") ? "complex" : "simple";
		return rrdType;
	}
}

export class EndParser extends TitleLinkComponentParser {
	static OPEN = "=";
	static REG_EX = /\|?\]=\+?/;

	canParse(): ParserState {
		let state = undefined;
		let match = this.ctx.hasSignature(EndParser.OPEN);
		if (match) 
			state = new ParserState(this, this.ctx.pos+match.length, match, StartParser.CLOSE, "end parser");
		return state;
	}	

	parse(state: ParserState): any {
		let titleLinkArr = super.readUntilClosingToken(state, EndParser.REG_EX);
		let rrdType = new Terminal(titleLinkArr[0], titleLinkArr[1]);
		state.attr.joinEol = (state.closeSyntax.charAt(state.closeSyntax.length-1) === "+");
		state.attr.type = state.closeSyntax.startsWith("|]=") ? "complex" : "simple";
		return rrdType;
	}
}

export class SkipParser extends ComponentParser {
	static OPEN = "~"; // no close

	canParse(): ParserState {
		let state = undefined;
		let match = this.ctx.hasSignature(SkipParser.OPEN);
		if (match) 
			state = new ParserState(this, this.ctx.pos+match.length, match, undefined, "skip parser");
		return state;
	}	

	parse(state: ParserState): any {
		this.ctx.readIn(SkipParser.OPEN.length);
		return new Skip();
	}
}

/*
regEx = /([a-zA-Z0-9_.-]+)/g;
*/
class LiteralNonTerminalParser extends ComponentParser {
	canParse(): ParserState {
		let state = undefined;
		let char = this.ctx.source.charAt(this.ctx.pos);
		let match = char.match(/([a-zA-Z0-9_.-]+)/); 
		if (match && match.index > -1) 
			state = new ParserState(this, this.ctx.pos+1, char, "/([a-zA-Z0-9_.-]+)/g", "literal terminal parser");
		return state;
	}	

	parse(state: ParserState): any {
		console.log(`\tLiteralTerminalParser::parse::start`);
		this.container.addToTokenisedStack(state);
		let regEx = /([a-zA-Z0-9_.-]+)/g;
		regEx.lastIndex = this.ctx.pos;
		let match = regEx.exec(this.ctx.source);
		state.attr.name = undefined;
		if (match.index === this.ctx.pos) {
			state.attr.name = this.ctx.source.substr(this.ctx.pos, match[1].length);
			state.items.push(state.attr.name);
			this.ctx.readIn(match[1].length);
			console.log(`3. LiteralTerminalParser::parse::match -> ${state.items[0]}`);
		} else
			throw new Error(`Illegal argument: [a-zA-Z0-9_.-]...[a-zA-Z0-9_.-] - ${state.operationName} supports only standard characterset for naming`);
		console.log(`\tLiteralTerminalParser::parse::end`);
		let rrdType = new NonTerminal(state.attr.name);
		return rrdType;
	}
}


/*
[x]				    optional, normally omitted
[:x]			    optional, normally included
[x y]
*/
class OptionalParser extends ComponentParser {
	static OPEN_LIST = ["["];
	static CLOSE_LIST = ["]"];
	static PREFER_DELIM = ":";

	canParse(): ParserState {
		let ret = this.canParseWith(OptionalParser.OPEN_LIST, OptionalParser.CLOSE_LIST, OptionalParser.OPEN_LIST[0], "optional parser");
		return ret;
	}	
	
	parse(state: ParserState): any {
		console.log(`\tOptionalParser::parse::start`);
		this.container.addToTokenisedStack(state);
		this.ctx.readIn(state.openSyntax.length);
		state.attr.closed = false;
		let match = this.ctx.hasSignature(OptionalParser.PREFER_DELIM);
		state.attr.preferIndex = 0;
		if (match) {
			state.attr.preferIndex = 1;
			this.ctx.readIn(OptionalParser.PREFER_DELIM.length);
			console.log(`\tOptionalParser::parse::preferIndex = ${state.attr.preferIndex}`);
		}
		this.ctx.skipWhitespace();
		while (this.ctx.hasMore()) {
			match = this.ctx.hasSignature(state.closeSyntax);
			if (match) {
				this.ctx.readIn(state.closeSyntax.length);
				state.attr.closed = true;
				break;
			}
			let item = this.container.parseNextComponent(state);		
			state.items.push(item);
			this.ctx.skipWhitespace();
		}
		if (state.items.length === 0)
			throw new Error(`Invalid state: ${state.openSyntax} ... ${state.closeSyntax} - ${state.operationName} extended an operand`);		
		if (!state.attr.closed)
			this.raiseMissingClosureError(state.operationName, state.closeSyntax, state.operationName);
		console.log(`\tOptionalParser::parse::end`);
		let item = state.items.length === 1 ? state.items[0] : new Sequence(...state.items);
		let rrdType = new Optional(item, state.attr.preferIndex === 0 ? "skip": undefined);
		return rrdType;
	}
}

/*
{x}				one or more
{x y}		  one or more
{x | y}		zero or more with lower captioning of y 
*/
class RepeatParser extends ComponentParser {
	static OPEN_LIST = ["{"];
	static CLOSE_LIST = ["}"];
	static LOWER_DELIM = "|";

	canParse(): ParserState {
		let ret = this.canParseWith(RepeatParser.OPEN_LIST, RepeatParser.CLOSE_LIST, RepeatParser.OPEN_LIST[0], "repeat parser");
		return ret;
	}	
	
	parse(state: ParserState): any {
		console.log(`\tRepeatParser::parse::start`);
		this.container.addToTokenisedStack(state);
		this.ctx.readIn(state.openSyntax.length);
		state.attr.closed = false;
		state.attr.lowerIndex = 0;
		state.items = [[], []];
		this.ctx.skipWhitespace();
		while (this.ctx.hasMore()) {
			let match = this.ctx.hasSignature(state.closeSyntax);
			if (match) {
				this.ctx.readIn(state.closeSyntax.length);
				state.attr.closed = true;
				break;
			}
			match = this.ctx.hasSignature(RepeatParser.LOWER_DELIM);
			if (match) {
				this.handleLowerDelimiter(state);
			} else {
				let item = this.container.parseNextComponent(state);		
				state.items[state.attr.lowerIndex].push(item);
			}
			this.ctx.skipWhitespace();
		}
		if (state.items.length === 0)
			throw new Error(`Invalid state: ${state.openSyntax} ... ${state.closeSyntax} - ${state.operationName} extended an operand`);		
		if (!state.attr.closed)
			this.raiseMissingClosureError(state.openSyntax, state.closeSyntax, state.operationName);
		console.log(`\tRepeatParser::parse::end`);
		return this.constructModel(state);
	}

	private constructModel(state: ParserState) {
		let item = state.items[0].length === 1 ? state.items[0][0] : new Sequence(...state.items[0]);
		let rep = undefined;
		if (state.items[1].length === 1) 
			rep = state.items[1][0]
		else if (state.items[1].length > 1)
			rep = new Sequence(...state.items[1]);
		let rrdType = new OneOrMore(item, rep);
		return rrdType;
	}

	private handleLowerDelimiter(state: ParserState) {
		this.ctx.readIn(RepeatParser.LOWER_DELIM.length);
		if (state.attr.lowerIndex !== 0)
			throw new Error(`Illegal argument: ${state.openSyntax} ... ${state.closeSyntax} - ${state.operationName} supports only 1 lower caption delimiter per repeat loop using ${RepeatParser.LOWER_DELIM}`);
		state.attr.lowerIndex++;
		state.items[state.attr.lowerIndex] = [];
		console.log(`\tRepeatParser::parse::lowerIndex = ${state.attr.lowerIndex}`);
	}
}

/*
	@dbg				toggle
	@esc<char>	set character
	@arw				toggle
*/
class PragmaParser extends ComponentParser {
	static REG_EX = /^@(dbg|esc.|arw)/;

	canParse(): ParserState {
		let state = undefined;
		let match = this.ctx.hasSignature(PragmaParser.REG_EX);
		if (match) 
			state = new ParserState(this, this.ctx.pos+1, match, "/^@(dbg|esc.|arw)/", "pragma parser");
		return state;
	}	

	parse(state: ParserState): any {
		console.log(`\tPragmaParser::parse::start`);
		this.container.addToTokenisedStack(state);
		this.ctx.readIn(state.openSyntax.length);	
		if (state.openSyntax === "@arw") {
			this.ctx.repeatArrows = !this.ctx.repeatArrows;
			state.attr.repeatArrows = this.ctx.repeatArrows;
		} else if (state.openSyntax === "@dbg") {
			this.ctx.debug = !this.ctx.debug;
			state.attr.debug = this.ctx.debug;
		} else if (state.openSyntax.startsWith("@esc")) {
			this.ctx.escapeChar = this.ctx.source.charAt(this.ctx.pos-1); // read ahead
			state.attr.escapeChar = this.ctx.escapeChar;
			// this.ctx.readIn(1);	
		}
		console.log(`\tPragmaParser::parse::end`);
		return state.items;
	}
}