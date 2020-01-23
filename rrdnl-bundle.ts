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

// BUNDLE separator


export const Options = {
	DEBUG: false, // if true, writes some debug information into attributes
	VS: 8, // minimum vertical separation between things. For a 3px stroke, must be at least 4
	AR: 10, // radius of arcs
	DIAGRAM_CLASS: 'railroad-diagram', // class to put on the root <svg>
	STROKE_ODD_PIXEL_LENGTH: true, // is the stroke width an odd (1px, 3px, etc) pixel length?
	INTERNAL_ALIGNMENT: 'center', // how to align items when they have extra space. left/right/center
	CHAR_WIDTH: 8.5, // width of each monospace character. play until you find the right value for your font
	COMMENT_CHAR_WIDTH: 7, // comments are in smaller text by default
};

export class FakeSVG {
  children: any;
  tagName: string;
  attrs: any;
	constructor(tagName: string, attrs?: object, text?: any) {
		if(text) this.children = text;
		else this.children = [];
		this.tagName = tagName;
		this.attrs = unnull(attrs, {});
  }
  
  // fakeSvgPrep(tagName: string, attrs?: object, text?: any) {
	// 	if(text) this.children = text;
	// 	else this.children = [];
	// 	this.tagName = tagName;
	// 	this.attrs = unnull(attrs, {});
  // }

	format(x, y, width) {
		// Virtual
	}
	addTo(parent) {
		if(parent instanceof FakeSVG) {
			parent.children.push(this);
			return this;
		} else {
			var svg = this.toSVG();
			parent.appendChild(svg);
			return svg;
		}
	}
	toSVG() {
		var el = SVG(this.tagName, this.attrs);
		if(typeof this.children == 'string') {
			el.textContent = this.children;
		} else {
			this.children.forEach(function(e) {
				el.appendChild(e.toSVG());
			});
		}
		return el;
	}
	toString() {
		var str = '<' + this.tagName;
		var group = this.tagName == "g" || this.tagName == "svg";
		for(var attr in this.attrs) {
			str += ' ' + attr + '="' + (this.attrs[attr]+'').replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
		}
		str += '>';
		if(group) str += "\n";
		if(typeof this.children == 'string') {
			str += escapeString(this.children);
		} else {
			this.children.forEach(function(e) {
				str += e;
			});
		}
		str += '</' + this.tagName + '>\n';
		return str;
	}
}

export class Path extends FakeSVG {
	constructor(x,y) {
		super('path');
		this.attrs.d = "M"+x+' '+y;
	}
	m(x,y) {
		this.attrs.d += 'm'+x+' '+y;
		return this;
	}
	h(val) {
		this.attrs.d += 'h'+val;
		return this;
	}
	right(val) { return this.h(Math.max(0, val)); }
	left(val) { return this.h(-Math.max(0, val)); }
	v(val) {
		this.attrs.d += 'v'+val;
		return this;
	}
	down(val) { return this.v(Math.max(0, val)); }
	up(val) { return this.v(-Math.max(0, val)); }
	arc(sweep){
		// 1/4 of a circle
		var x = Options.AR;
		var y = Options.AR;
		if(sweep[0] == 'e' || sweep[1] == 'w') {
			x *= -1;
		}
		if(sweep[0] == 's' || sweep[1] == 'n') {
			y *= -1;
		}
		var cw;
		if(sweep == 'ne' || sweep == 'es' || sweep == 'sw' || sweep == 'wn') {
			cw = 1;
		} else {
			cw = 0;
		}
		this.attrs.d += "a"+Options.AR+" "+Options.AR+" 0 0 "+cw+' '+x+' '+y;
		return this;
	}
	arc_8(start, dir) {
		// 1/8 of a circle
		const arc = Options.AR;
		const s2 = 1/Math.sqrt(2) * arc;
		const s2inv = (arc - s2);
		let path = "a " + arc + " " + arc + " 0 0 " + (dir=='cw' ? "1" : "0") + " ";
		const sd = start+dir;
		const offset =
			sd == 'ncw'   ? [s2, s2inv] :
			sd == 'necw'  ? [s2inv, s2] :
			sd == 'ecw'   ? [-s2inv, s2] :
			sd == 'secw'  ? [-s2, s2inv] :
			sd == 'scw'   ? [-s2, -s2inv] :
			sd == 'swcw'  ? [-s2inv, -s2] :
			sd == 'wcw'   ? [s2inv, -s2] :
			sd == 'nwcw'  ? [s2, -s2inv] :
			sd == 'nccw'  ? [-s2, s2inv] :
			sd == 'nwccw' ? [-s2inv, s2] :
			sd == 'wccw'  ? [s2inv, s2] :
			sd == 'swccw' ? [s2, s2inv] :
			sd == 'sccw'  ? [s2, -s2inv] :
			sd == 'seccw' ? [s2inv, -s2] :
			sd == 'eccw'  ? [-s2inv, -s2] :
			sd == 'neccw' ? [-s2, -s2inv] : null
		;
		path += offset.join(" ");
		this.attrs.d += path;
		return this;
	}
	l(x, y) {
		this.attrs.d += 'l'+x+' '+y;
		return this;
	}
	format() {
		// All paths in this library start/end horizontally.
		// The extra .5 ensures a minor overlap, so there's no seams in bad rasterizers.
		this.attrs.d += 'h.5';
		return this;
	}
}

export class Diagram extends FakeSVG {
  items: any[];
  up : number;
  down : number;
  width : number;
  height : number;
  formatted : boolean;

  constructor(...items) {
		super('svg', {class: Options.DIAGRAM_CLASS});
		this.items = items.map(wrapString);
		if(!(this.items[0] instanceof Start)) {
			this.items.unshift(new Start());
		}
		if(!(this.items[this.items.length-1] instanceof End)) {
			this.items.push(new End());
		}
		this.up = this.down = this.height = this.width = 0;
		for(const item of this.items) {
			this.width += item.width + (item.needsSpace?20:0);
			this.up = Math.max(this.up, item.up - this.height);
			this.height += item.height;
			this.down = Math.max(this.down - item.height, item.down);
		}
		this.formatted = false;
	}
	format(paddingt?, paddingr?, paddingb?, paddingl?) {
		paddingt = unnull(paddingt, 20);
		paddingr = unnull(paddingr, paddingt, 20);
		paddingb = unnull(paddingb, paddingt, 20);
		paddingl = unnull(paddingl, paddingr, 20);
		var x = paddingl;
		var y = paddingt;
		y += this.up;
		var g = new FakeSVG('g', Options.STROKE_ODD_PIXEL_LENGTH ? {transform:'translate(.5 .5)'} : {});
		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			if(item.needsSpace) {
				new Path(x,y).h(10).addTo(g);
				x += 10;
			}
			item.format(x, y, item.width).addTo(g);
			x += item.width;
			y += item.height;
			if(item.needsSpace) {
				new Path(x,y).h(10).addTo(g);
				x += 10;
			}
		}
		this.attrs.width = this.width + paddingl + paddingr;
		this.attrs.height = this.up + this.height + this.down + paddingt + paddingb;
		this.attrs.viewBox = "0 0 " + this.attrs.width + " " + this.attrs.height;
		g.addTo(this);
		this.formatted = true;
		return this;
	}
	addTo(parent) {
		if(!parent) {
			var scriptTag = document.getElementsByTagName('script');
			let scriptTag2 = scriptTag[scriptTag.length - 1];
			parent = scriptTag2.parentNode;
		}
		return super.addTo.call(this, parent);
	}
	toSVG() {
		if (!this.formatted) {
			this.format();
		}
		return super.toSVG.call(this);
	}
	toString() {
		if (!this.formatted) {
			this.format();
		}
		return super.toString.call(this);
	}
}

export class ComplexDiagram extends Diagram {
	constructor(...items) {
		super(...items);
		this.items[0] = new Start("complex");
		this.items[this.items.length-1] = new End("complex");
	}
}

export class Component extends FakeSVG {
  up : number = 0;
  down : number = 0;
  width : number = 0;
  height : number = 0;
  needsSpace: boolean = true;

	constructor() {
		super('g');
  }
}

export class Container extends Component {
  items: any;
	constructor(...items) {
    super();
    this.items = items.map(wrapString);
  }
}

export class Sequence extends Container {
	constructor(...items) {
    super(...items);
		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			this.width += item.width + (item.needsSpace?20:0);
			this.up = Math.max(this.up, item.up - this.height);
			this.height += item.height;
			this.down = Math.max(this.down - item.height, item.down);
		}
		if(this.items[0].needsSpace) this.width -= 10;
		if(this.items[this.items.length-1].needsSpace) this.width -= 10;
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "sequence";
		}
	}
	format(x,y,width) {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		new Path(x,y).h(gaps[0]).addTo(this);
		new Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
		x += gaps[0];

		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			if(item.needsSpace && i > 0) {
				new Path(x,y).h(10).addTo(this);
				x += 10;
			}
			item.format(x, y, item.width).addTo(this);
			x += item.width;
			y += item.height;
			if(item.needsSpace && i < this.items.length-1) {
				new Path(x,y).h(10).addTo(this);
				x += 10;
			}
		}
		return this;
	}
}

export class Stack extends Container {
	constructor(...items) {
    super(...items);
		if( items.length === 0 ) {
			throw new RangeError("Stack() must have at least one child.");
		}
		this.width = Math.max.apply(null, this.items.map(function(e) { return e.width + (e.needsSpace?20:0); }));
		if(this.items.length > 1){
			this.width += Options.AR*2;
		}
		this.needsSpace = true;
		this.up = this.items[0].up;
		this.down = this.items[this.items.length-1].down;

		this.height = 0;
		var last = this.items.length - 1;
		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			this.height += item.height;
			if(i > 0) {
				this.height += Math.max(Options.AR*2, item.up + Options.VS);
			}
			if(i < last) {
				this.height += Math.max(Options.AR*2, item.down + Options.VS);
			}
		}
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "stack";
		}
	}
	format(x,y,width) {
		var gaps = determineGaps(width, this.width);
		new Path(x,y).h(gaps[0]).addTo(this);
		x += gaps[0];
		var xInitial = x;
		if(this.items.length > 1) {
			new Path(x, y).h(Options.AR).addTo(this);
			x += Options.AR;
		}

		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			var innerWidth = this.width - (this.items.length>1 ? Options.AR*2 : 0);
			item.format(x, y, innerWidth).addTo(this);
			x += innerWidth;
			y += item.height;

			if(i !== this.items.length-1) {
				new Path(x, y)
					.arc('ne').down(Math.max(0, item.down + Options.VS - Options.AR*2))
					.arc('es').left(innerWidth)
					.arc('nw').down(Math.max(0, this.items[i+1].up + Options.VS - Options.AR*2))
					.arc('ws').addTo(this);
				y += Math.max(item.down + Options.VS, Options.AR*2) + Math.max(this.items[i+1].up + Options.VS, Options.AR*2);
				//y += Math.max(Options.AR*4, item.down + Options.VS*2 + this.items[i+1].up)
				x = xInitial+Options.AR;
			}

		}

		if(this.items.length > 1) {
			new Path(x,y).h(Options.AR).addTo(this);
			x += Options.AR;
		}
		new Path(x,y).h(gaps[1]).addTo(this);

		return this;
	}
}

export class OptionalSequence extends Container {
	constructor(...items) {
		super(...items);
		if( items.length === 0 ) {
			throw new RangeError("OptionalSequence() must have at least one child.");
		}
		if( items.length === 1 ) {
			return new Sequence(items);
		}
		var arc = Options.AR;
		this.needsSpace = false;
		this.height = sum(this.items, function(x){return x.height});
		this.down = this.items[0].down;
		var heightSoFar = 0;
		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			this.up = Math.max(this.up, Math.max(arc*2, item.up + Options.VS) - heightSoFar);
			heightSoFar += item.height;
			if(i > 0) {
				this.down = Math.max(this.height + this.down, heightSoFar + Math.max(arc*2, item.down + Options.VS)) - this.height;
			}
			var itemWidth = (item.needsSpace?10:0) + item.width;
			if(i === 0) {
				this.width += arc + Math.max(itemWidth, arc);
			} else {
				this.width += arc*2 + Math.max(itemWidth, arc) + arc;
			}
		}
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "optseq";
		}
	}
	format(x, y, width) {
		var arc = Options.AR;
		var gaps = determineGaps(width, this.width);
		new Path(x, y).right(gaps[0]).addTo(this);
		new Path(x + gaps[0] + this.width, y + this.height).right(gaps[1]).addTo(this);
		x += gaps[0];
		var upperLineY = y - this.up;
		var last = this.items.length - 1;
		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			var itemSpace = (item.needsSpace?10:0);
			var itemWidth = item.width + itemSpace;
			if(i === 0) {
				// Upper skip
				new Path(x,y)
					.arc('se')
					.up(y - upperLineY - arc*2)
					.arc('wn')
					.right(itemWidth - arc)
					.arc('ne')
					.down(y + item.height - upperLineY - arc*2)
					.arc('ws')
					.addTo(this);
				// Straight line
				new Path(x, y)
					.right(itemSpace + arc)
					.addTo(this);
				item.format(x + itemSpace + arc, y, item.width).addTo(this);
				x += itemWidth + arc;
				y += item.height;
				// x ends on the far side of the first element,
				// where the next element's skip needs to begin
			} else if(i < last) {
				// Upper skip
				new Path(x, upperLineY)
					.right(arc*2 + Math.max(itemWidth, arc) + arc)
					.arc('ne')
					.down(y - upperLineY + item.height - arc*2)
					.arc('ws')
					.addTo(this);
				// Straight line
				new Path(x,y)
					.right(arc*2)
					.addTo(this);
				item.format(x + arc*2, y, item.width).addTo(this);
				new Path(x + item.width + arc*2, y + item.height)
					.right(itemSpace + arc)
					.addTo(this);
				// Lower skip
				new Path(x,y)
					.arc('ne')
					.down(item.height + Math.max(item.down + Options.VS, arc*2) - arc*2)
					.arc('ws')
					.right(itemWidth - arc)
					.arc('se')
					.up(item.down + Options.VS - arc*2)
					.arc('wn')
					.addTo(this);
				x += arc*2 + Math.max(itemWidth, arc) + arc;
				y += item.height;
			} else {
				// Straight line
				new Path(x, y)
					.right(arc*2)
					.addTo(this);
				item.format(x + arc*2, y, item.width).addTo(this);
				new Path(x + arc*2 + item.width, y + item.height)
					.right(itemSpace + arc)
					.addTo(this);
				// Lower skip
				new Path(x,y)
					.arc('ne')
					.down(item.height + Math.max(item.down + Options.VS, arc*2) - arc*2)
					.arc('ws')
					.right(itemWidth - arc)
					.arc('se')
					.up(item.down + Options.VS - arc*2)
					.arc('wn')
					.addTo(this);
			}
		}
		return this;
	}
}

export class AlternatingSequence extends Sequence {
	constructor(...items) {
		super(...items);
		if( items.length === 1 ) {
			return;
		}
		if( items.length !== 2 ) {
			throw new RangeError("AlternatingSequence() must have one or two children.");
		}
		this.needsSpace = false;

		const arc = Options.AR;
		const vert = Options.VS;
		const max = Math.max;
		const first = this.items[0];
		const second = this.items[1];

		const arcX = 1 / Math.sqrt(2) * arc * 2;
		const arcY = (1 - 1 / Math.sqrt(2)) * arc * 2;
		const crossY = Math.max(arc, Options.VS);
		const crossX = (crossY - arcY) + arcX;

		const firstOut = max(arc + arc, crossY/2 + arc + arc, crossY/2 + vert + first.down);
		this.up = firstOut + first.height + first.up;

		const secondIn = max(arc + arc, crossY/2 + arc + arc, crossY/2 + vert + second.up);
		this.down = secondIn + second.height + second.down;

		this.height = 0;

		const firstWidth = 2*(first.needsSpace?10:0) + first.width;
		const secondWidth = 2*(second.needsSpace?10:0) + second.width;
		this.width = 2*arc + max(firstWidth, crossX, secondWidth) + 2*arc;

		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "altseq";
		}
	}
	format(x, y, width) {
		if( this.items.length === 1 ) {
			return super.format(x, y, width);
		}

		const arc = Options.AR;
		const gaps = determineGaps(width, this.width);
		new Path(x,y).right(gaps[0]).addTo(this);
		console.log(gaps);
		x += gaps[0];
		new Path(x+this.width, y).right(gaps[1]).addTo(this);
		// bounding box
		//new Path(x+gaps[0], y).up(this.up).right(this.width).down(this.up+this.down).left(this.width).up(this.down).addTo(this);
		const first = this.items[0];
		const second = this.items[1];

		// top
		const firstIn = this.up - first.up;
		const firstOut = this.up - first.up - first.height;
		new Path(x,y).arc('se').up(firstIn-2*arc).arc('wn').addTo(this);
		first.format(x + 2*arc, y - firstIn, this.width - 4*arc).addTo(this);
		new Path(x + this.width - 2*arc, y - firstOut).arc('ne').down(firstOut - 2*arc).arc('ws').addTo(this);

		// bottom
		const secondIn = this.down - second.down - second.height;
		const secondOut = this.down - second.down;
		new Path(x,y).arc('ne').down(secondIn - 2*arc).arc('ws').addTo(this);
		second.format(x + 2*arc, y + secondIn, this.width - 4*arc).addTo(this);
		new Path(x + this.width - 2*arc, y + secondOut).arc('se').up(secondOut - 2*arc).arc('wn').addTo(this);

		// crossover
		const arcX = 1 / Math.sqrt(2) * arc * 2;
		const arcY = (1 - 1 / Math.sqrt(2)) * arc * 2;
		const crossY = Math.max(arc, Options.VS);
		const crossX = (crossY - arcY) + arcX;
		const crossBar = (this.width - 4*arc - crossX)/2;
		new Path(x+arc, y - crossY/2 - arc).arc('ws').right(crossBar)
			.arc_8('n', 'cw').l(crossX - arcX, crossY - arcY).arc_8('sw', 'ccw')
			.right(crossBar).arc('ne').addTo(this);
		new Path(x+arc, y + crossY/2 + arc).arc('wn').right(crossBar)
			.arc_8('s', 'ccw').l(crossX - arcX, -(crossY - arcY)).arc_8('nw', 'cw')
			.right(crossBar).arc('se').addTo(this);

		return this;
	}
}

export class Choice extends Container {
	constructor(public normal, ...items) {
		super(...items);
		if( typeof normal !== "number" || normal !== Math.floor(normal) ) {
			throw new TypeError("The first argument of Choice() must be an integer.");
		} else if(normal < 0 || normal >= items.length) {
			throw new RangeError("The first argument of Choice() must be an index for one of the items.");
		} else {
			this.normal = normal;
		}
		var first = 0;
		var last = items.length - 1;
		this.width = Math.max.apply(null, this.items.map(function(el){return el.width})) + Options.AR*4;
		this.height = this.items[normal].height;
		this.up = this.items[first].up;
		var arcs;
		for(var i = first; i < normal; i++) {
			if(i == normal-1) arcs = Options.AR*2;
			else arcs = Options.AR;
			this.up += Math.max(arcs, this.items[i].height + this.items[i].down + Options.VS + this.items[i+1].up);
		}
		this.down = this.items[last].down;
		for(i = normal+1; i <= last; i++) {
			if(i == normal+1) arcs = Options.AR*2;
			else arcs = Options.AR;
			this.down += Math.max(arcs, this.items[i-1].height + this.items[i-1].down + Options.VS + this.items[i].up);
		}
		this.down -= this.items[normal].height; // already counted in Choice.height
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "choice";
		}
	}
	format(x,y,width) {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		new Path(x,y).h(gaps[0]).addTo(this);
		new Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
		x += gaps[0];

		var last = this.items.length -1;
		var innerWidth = this.width - Options.AR*4;

		// Do the elements that curve above
		var distanceFromY;
		for(var i = this.normal - 1; i >= 0; i--) {
			let item = this.items[i];
			if( i == this.normal - 1 ) {
				distanceFromY = Math.max(Options.AR*2, this.items[this.normal].up + Options.VS + item.down + item.height);
			}
			new Path(x,y)
				.arc('se')
				.up(distanceFromY - Options.AR*2)
				.arc('wn').addTo(this);
			item.format(x+Options.AR*2,y - distanceFromY,innerWidth).addTo(this);
			new Path(x+Options.AR*2+innerWidth, y-distanceFromY+item.height)
				.arc('ne')
				.down(distanceFromY - item.height + this.height - Options.AR*2)
				.arc('ws').addTo(this);
			distanceFromY += Math.max(Options.AR, item.up + Options.VS + (i === 0 ? 0 : this.items[i-1].down+this.items[i-1].height));
		}

		// Do the straight-line path.
		new Path(x,y).right(Options.AR*2).addTo(this);
		this.items[this.normal].format(x+Options.AR*2, y, innerWidth).addTo(this);
		new Path(x+Options.AR*2+innerWidth, y+this.height).right(Options.AR*2).addTo(this);

		// Do the elements that curve below
		for(i = this.normal+1; i <= last; i++) {
			let item = this.items[i];
			if( i == this.normal + 1 ) {
				distanceFromY = Math.max(Options.AR*2, this.height + this.items[this.normal].down + Options.VS + item.up);
			}
			new Path(x,y)
				.arc('ne')
				.down(distanceFromY - Options.AR*2)
				.arc('ws').addTo(this);
			item.format(x+Options.AR*2, y+distanceFromY, innerWidth).addTo(this);
			new Path(x+Options.AR*2+innerWidth, y+distanceFromY+item.height)
				.arc('se')
				.up(distanceFromY - Options.AR*2 + item.height - this.height)
				.arc('wn').addTo(this);
			distanceFromY += Math.max(Options.AR, item.height + item.down + Options.VS + (i == last ? 0 : this.items[i+1].up));
		}

		return this;
	}
}

export class HorizontalChoice extends Sequence {
  _lowerTrack: number;
  _upperTrack: number;

	constructor(...items) {
		super(...items);
		if( items.length === 0 ) {
			throw new RangeError("HorizontalChoice() must have at least one child.");
		}
		if( items.length === 1) {
			return;
		}
		const allButLast = this.items.slice(0, -1);
		const middles = this.items.slice(1, -1);
		const first = this.items[0];
		const last = this.items[this.items.length - 1];
		this.needsSpace = false;

		this.width = Options.AR; // starting track
		this.width += Options.AR*2 * (this.items.length-1); // inbetween tracks
		this.width += sum(this.items, x=>x.width + (x.needsSpace?20:0)); // items
		this.width += (last.height > 0 ? Options.AR : 0); // needs space to curve up
		this.width += Options.AR; //ending track

		// Always exits at entrance height
		this.height = 0;

		// All but the last have a track running above them
		this._upperTrack = Math.max(
			Options.AR*2,
			Options.VS,
			max(allButLast, x=>x.up) + Options.VS
		);
		this.up = Math.max(this._upperTrack, last.up);

		// All but the first have a track running below them
		// Last either straight-lines or curves up, so has different calculation
		this._lowerTrack = Math.max(
			Options.VS,
			max(middles, x=>x.height+Math.max(x.down+Options.VS, Options.AR*2)),
			last.height + last.down + Options.VS
		);
		if(first.height < this._lowerTrack) {
			// Make sure there's at least 2*AR room between first exit and lower track
			this._lowerTrack = Math.max(this._lowerTrack, first.height + Options.AR*2);
		}
		this.down = Math.max(this._lowerTrack, first.height + first.down);


		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "horizontalchoice";
		}
	}
	format(x,y,width) {
    if( this.items.length === 1) 
      return super.format(x, y, width);
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		new Path(x,y).h(gaps[0]).addTo(this);
		new Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
		x += gaps[0];

		const first = this.items[0];
		const last = this.items[this.items.length-1];
		const allButFirst = this.items.slice(1);
		const allButLast = this.items.slice(0, -1);

		// upper track
		var upperSpan = (sum(allButLast, x=>x.width+(x.needsSpace?20:0))
			+ (this.items.length - 2) * Options.AR*2
			- Options.AR
		);
		new Path(x,y)
			.arc('se')
			.v(-(this._upperTrack - Options.AR*2))
			.arc('wn')
			.h(upperSpan)
			.addTo(this);

		// lower track
		var lowerSpan = (sum(allButFirst, x=>x.width+(x.needsSpace?20:0))
			+ (this.items.length - 2) * Options.AR*2
			+ (last.height > 0 ? Options.AR : 0)
			- Options.AR
		);
		var lowerStart = x + Options.AR + first.width+(first.needsSpace?20:0) + Options.AR*2;
		new Path(lowerStart, y+this._lowerTrack)
			.h(lowerSpan)
			.arc('se')
			.v(-(this._lowerTrack - Options.AR*2))
			.arc('wn')
			.addTo(this);

		// Items
		// for(const [i, item] of enumerate(this.items)) {
		for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
			// input track
			if(i === 0) {
				new Path(x,y)
					.h(Options.AR)
					.addTo(this);
				x += Options.AR;
			} else {
				new Path(x, y - this._upperTrack)
					.arc('ne')
					.v(this._upperTrack - Options.AR*2)
					.arc('ws')
					.addTo(this);
				x += Options.AR*2;
			}

			// item
			var itemWidth = item.width + (item.needsSpace?20:0);
			item.format(x, y, itemWidth).addTo(this);
			x += itemWidth;

			// output track
			if(i === this.items.length-1) {
				if(item.height === 0) {
					new Path(x,y)
						.h(Options.AR)
						.addTo(this);
				} else {
					new Path(x,y+item.height)
					.arc('se')
					.addTo(this);
				}
			} else if(i === 0 && item.height > this._lowerTrack) {
				// Needs to arc up to meet the lower track, not down.
				if(item.height - this._lowerTrack >= Options.AR*2) {
					new Path(x, y+item.height)
						.arc('se')
						.v(this._lowerTrack - item.height + Options.AR*2)
						.arc('wn')
						.addTo(this);
				} else {
					// Not enough space to fit two arcs
					// so just bail and draw a straight line for now.
					new Path(x, y+item.height)
						.l(Options.AR*2, this._lowerTrack - item.height)
						.addTo(this);
				}
			} else {
				new Path(x, y+item.height)
					.arc('ne')
					.v(this._lowerTrack - item.height - Options.AR*2)
					.arc('ws')
					.addTo(this);
			}
		}
		return this;
	}
}

export class MultipleChoice extends Container {
  innerWidth: number;

	constructor(public normal, public type, ...items) {
		super(...items);
		if( typeof normal !== "number" || normal !== Math.floor(normal) ) {
			throw new TypeError("The first argument of MultipleChoice() must be an integer.");
		} else if(normal < 0 || normal >= items.length) {
			throw new RangeError("The first argument of MultipleChoice() must be an index for one of the items.");
		} else {
			this.normal = normal;
		}
		if( type != "any" && type != "all" ) {
			throw new SyntaxError("The second argument of MultipleChoice must be 'any' or 'all'.");
		} else {
			this.type = type;
		}
		this.innerWidth = max(this.items, function(x){return x.width});
		this.width = 30 + Options.AR + this.innerWidth + Options.AR + 20;
		this.up = this.items[0].up;
		this.down = this.items[this.items.length-1].down;
		this.height = this.items[normal].height;
		for(var i = 0; i < this.items.length; i++) {
			let item = this.items[i];
			let minimum;
			if(i == normal - 1 || i == normal + 1) minimum = 10 + Options.AR;
			else minimum = Options.AR;
			if(i < normal) {
				this.up += Math.max(minimum, item.height + item.down + Options.VS + this.items[i+1].up);
			} else if(i > normal) {
				this.down += Math.max(minimum, item.up + Options.VS + this.items[i-1].down + this.items[i-1].height);
			}
		}
		this.down -= this.items[normal].height; // already counted in this.height
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "multiplechoice";
		}
	}
	format(x, y, width) {
		var gaps = determineGaps(width, this.width);
		new Path(x, y).right(gaps[0]).addTo(this);
		new Path(x + gaps[0] + this.width, y + this.height).right(gaps[1]).addTo(this);
		x += gaps[0];

		var normal = this.items[this.normal];

		// Do the elements that curve above
		var distanceFromY;
		for(var i = this.normal - 1; i >= 0; i--) {
			var item = this.items[i];
			if( i == this.normal - 1 ) {
				distanceFromY = Math.max(10 + Options.AR, normal.up + Options.VS + item.down + item.height);
			}
			new Path(x + 30,y)
				.up(distanceFromY - Options.AR)
				.arc('wn').addTo(this);
			item.format(x + 30 + Options.AR, y - distanceFromY, this.innerWidth).addTo(this);
			new Path(x + 30 + Options.AR + this.innerWidth, y - distanceFromY + item.height)
				.arc('ne')
				.down(distanceFromY - item.height + this.height - Options.AR - 10)
				.addTo(this);
			if(i !== 0) {
				distanceFromY += Math.max(Options.AR, item.up + Options.VS + this.items[i-1].down + this.items[i-1].height);
			}
		}

		new Path(x + 30, y).right(Options.AR).addTo(this);
		normal.format(x + 30 + Options.AR, y, this.innerWidth).addTo(this);
		new Path(x + 30 + Options.AR + this.innerWidth, y + this.height).right(Options.AR).addTo(this);

		for(i = this.normal+1; i < this.items.length; i++) {
			let item = this.items[i];
			if(i == this.normal + 1) {
				distanceFromY = Math.max(10+Options.AR, normal.height + normal.down + Options.VS + item.up);
			}
			new Path(x + 30, y)
				.down(distanceFromY - Options.AR)
				.arc('ws')
				.addTo(this);
			item.format(x + 30 + Options.AR, y + distanceFromY, this.innerWidth).addTo(this);
			new Path(x + 30 + Options.AR + this.innerWidth, y + distanceFromY + item.height)
				.arc('se')
				.up(distanceFromY - Options.AR + item.height - normal.height)
				.addTo(this);
			if(i != this.items.length - 1) {
				distanceFromY += Math.max(Options.AR, item.height + item.down + Options.VS + this.items[i+1].up);
			}
		}
    var text = new FakeSVG('g', {"class": "diagram-text"}).addTo(this);
		new FakeSVG('title', {}, (this.type=="any"?"take one or more branches, once each, in any order":"take all branches, once each, in any order")).addTo(text);
		new FakeSVG('path', {
			"d": "M "+(x+30)+" "+(y-10)+" h -26 a 4 4 0 0 0 -4 4 v 12 a 4 4 0 0 0 4 4 h 26 z",
			"class": "diagram-text"
			}).addTo(text);
		new FakeSVG('text', {
			"x": x + 15,
			"y": y + 4,
			"class": "diagram-text"
			}, (this.type=="any"?"1+":"all")).addTo(text);
		new FakeSVG('path', {
			"d": "M "+(x+this.width-20)+" "+(y-10)+" h 16 a 4 4 0 0 1 4 4 v 12 a 4 4 0 0 1 -4 4 h -16 z",
			"class": "diagram-text"
			}).addTo(text);
		new FakeSVG('path', {
			"d": "M "+(x+this.width-13)+" "+(y-2)+" a 4 4 0 1 0 6 -1 m 2.75 -1 h -4 v 4 m 0 -3 h 2",
			"style": "stroke-width: 1.75"
			}).addTo(text);
		return this;
	}
}

export class Optional extends Choice {
	constructor(item, skip) {
		if( skip === undefined )
			super(1, new Skip(), item);
		else if ( skip === "skip" )
			super(0, new Skip(), item);
		else
			throw "Unknown value for Optional()'s 'skip' argument.";
	}
}

export class OneOrMore extends Container {
  item: any;
  rep: any;
	constructor(item, rep) {
		super([]);
		rep = rep || (new Skip());
		this.item = wrapString(item);
		this.rep = wrapString(rep);
		this.width = Math.max(this.item.width, this.rep.width) + Options.AR*2;
		this.height = this.item.height;
		this.up = this.item.up;
		this.down = Math.max(Options.AR*2, this.item.down + Options.VS + this.rep.up + this.rep.height + this.rep.down);
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "oneormore";
		}
	}
	format(x,y,width) {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		new Path(x,y).h(gaps[0]).addTo(this);
		new Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
		x += gaps[0];

		// Draw item
		new Path(x,y).right(Options.AR).addTo(this);
		this.item.format(x+Options.AR,y,this.width-Options.AR*2).addTo(this);
		new Path(x+this.width-Options.AR,y+this.height).right(Options.AR).addTo(this);

		// Draw repeat arc
		var distanceFromY = Math.max(Options.AR*2, this.item.height+this.item.down+Options.VS+this.rep.up);
		new Path(x+Options.AR,y).arc('nw').down(distanceFromY-Options.AR*2).arc('ws').addTo(this);
		this.rep.format(x+Options.AR, y+distanceFromY, this.width - Options.AR*2).addTo(this);
		new Path(x+this.width-Options.AR, y+distanceFromY+this.rep.height).arc('se').up(distanceFromY-Options.AR*2+this.rep.height-this.item.height).arc('en').addTo(this);

		return this;
	}
}

export class ZeroOrMore extends Optional {
	constructor(item, rep, skip) {
		super(new OneOrMore(item, rep), skip);
	}
}

class Control extends Component {
}

export class Skip extends Control {
	constructor() {
		super();
		this.needsSpace = false;
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "skip";
		}
	}
	format(x, y, width) {
		new Path(x,y).right(width).addTo(this);
		return this;
	}
}

export class Block extends Control {
	constructor(width=50, up=15, height=25, down=15, needsSpace=true) {
		super();
		this.width = width;
		this.height = height;
		this.up = up;
		this.down = down;
		this.needsSpace = needsSpace;
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "block";
		}
	}
	format(x, y, width) {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		new Path(x,y).h(gaps[0]).addTo(this);
		new Path(x+gaps[0]+this.width,y).h(gaps[1]).addTo(this);
		x += gaps[0];

		new FakeSVG('rect', {x:x, y:y-this.up, width:this.width, height:this.up+this.height+this.down}).addTo(this);
		return this;
	}
}

class TextControl extends Control {
  label: string;
  href: string;
  title: string;

  constructor(label?, href?, title?) {
    super();
    this.label = label;
    this.href = href;
    this.title = title;
  }
}

class Terminus extends TextControl {
  type: string;

  constructor(type, label, href, title) {
		super(label, href, title);
		this.width = 20;
		this.height = 0;
		this.up = 10;
		this.down = 10;
    this.type = type;
		if(label) {
			this.label = ""+label;
			this.width = Math.max(20, this.label.length * Options.CHAR_WIDTH + 10);
		}
  }

	format(x,y) {
		if(this.label) {
			new FakeSVG('text', {x:x, y:y-15, style:"text-anchor:start"}, this.label).addTo(this);
		}
  }
}

export class Start extends Terminus {
  constructor(type="simple", label=undefined, href=undefined, title=undefined) {
		super(type, label, href, title);
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "start";
		}
	}
	format(x,y) {
		let path = new Path(x, y-10);
		if (this.type === "complex") {
			path.down(20)
				.m(0, -10)
				.right(this.width)
				.addTo(this);
		} else {
			path.down(20)
				.m(10, -20)
				.down(20)
				.m(-10, -10)
				.right(this.width)
				.addTo(this);
		}
    super.format(x, y);
    return this;
	}
}

export class End extends Terminus {
  type: string;

  constructor(type="simple", label=undefined, href=undefined, title=undefined) {
		super(type, label, href, title);
		this.tagName = 'path';
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "end";
		}
	}
	format(x,y) {
		if (this.type === "complex") {
			this.attrs.d = 'M '+x+' '+y+' h 20 m 0 -10 v 20';
		} else {
			this.attrs.d = 'M '+x+' '+y+' h 20 m -10 -10 v 20 m 10 -20 v 20';
    }
    super.format(x, y);
		return this;
	}
}

export class Terminal extends TextControl {
	constructor(label, href?, title?) {
    super(label, href, title);
		this.attrs = unnull({'class': 'terminal'}, {});

		this.label = ""+label;
		this.width = this.label.length * Options.CHAR_WIDTH + 20; /* Assume that each char is .5em, and that the em is 16px */
		this.height = 0;
		this.up = 11;
		this.down = 11;
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "terminal";
		}
	}
	format(x, y, width) {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		new Path(x,y).h(gaps[0]).addTo(this);
		new Path(x+gaps[0]+this.width,y).h(gaps[1]).addTo(this);
		x += gaps[0];

		new FakeSVG('rect', {x:x, y:y-11, width:this.width, height:this.up+this.down, rx:10, ry:10}).addTo(this);
		var text = new FakeSVG('text', {x:x+this.width/2, y:y+4}, this.label);
		if(this.href)
			new FakeSVG('a', {'xlink:href': this.href}, [text]).addTo(this);
		else
			text.addTo(this);
		if(this.title)
			new FakeSVG('title', {}, [this.title]).addTo(this);
		return this;
	}
}

export class NonTerminal extends TextControl {
	constructor(label, href?, title?) {
    super(label, href, title);
		this.attrs = unnull({'class': 'non-terminal'}, {});

		this.label = ""+label;
		this.width = this.label.length * Options.CHAR_WIDTH + 20;
		this.height = 0;
		this.up = 11;
		this.down = 11;
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "nonterminal";
		}
	}
	format(x, y, width) {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		new Path(x,y).h(gaps[0]).addTo(this);
		new Path(x+gaps[0]+this.width,y).h(gaps[1]).addTo(this);
		x += gaps[0];

		new FakeSVG('rect', {x:x, y:y-11, width:this.width, height:this.up+this.down}).addTo(this);
		var text = new FakeSVG('text', {x:x+this.width/2, y:y+4}, this.label);
		if(this.href)
			new FakeSVG('a', {'xlink:href': this.href}, [text]).addTo(this);
		else
			text.addTo(this);
		if(this.title)
			new FakeSVG('title', {}, [this.title]).addTo(this);
		return this;
	}
}

export class Comment extends TextControl {
	constructor(label, href?, title?) {
    super(label, href, title);
		this.label = ""+label;
		this.width = this.label.length * Options.COMMENT_CHAR_WIDTH + 10;
		this.height = 0;
		this.up = 11;
		this.down = 11;
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "comment";
		}
	}
	format(x, y, width) {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		new Path(x,y).h(gaps[0]).addTo(this);
		new Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
		x += gaps[0];

		var text = new FakeSVG('text', {x:x+this.width/2, y:y+5, class:'comment'}, this.label);
		if(this.href)
			new FakeSVG('a', {'xlink:href': this.href}, [text]).addTo(this);
		else
			text.addTo(this);
		if(this.title)
			new FakeSVG('title', {}, this.title).addTo(this);
		return this;
	}
}


// utilities

function unnull(...args) {
	// Return the first value that isn't undefined.
	// More correct than `v1 || v2 || v3` because falsey values will be returned.
	return args.reduce(function(sofar, x) { return sofar !== undefined ? sofar : x; });
}

function determineGaps(outer, inner) {
	var diff = outer - inner;
	switch(Options.INTERNAL_ALIGNMENT) {
		case 'left': return [0, diff];
		case 'right': return [diff, 0];
		default: return [diff/2, diff/2];
	}
}

function wrapString(value) {
		return value instanceof FakeSVG ? value : new Terminal(""+value);
}

function sum(iter, func) {
	if(!func) func = function(x) { return x; };
	return iter.map(func).reduce(function(a,b){return a+b}, 0);
}

function max(iter, func) {
	if(!func) func = function(x) { return x; };
	return Math.max.apply(null, iter.map(func));
}

function SVG(name, attrs, text?) {
	attrs = attrs || {};
	text = text || '';
	var el = document.createElementNS("http://www.w3.org/2000/svg",name);
	for(var attr in attrs) {
		if(attr === 'xlink:href')
			el.setAttributeNS("http://www.w3.org/1999/xlink", 'href', attrs[attr]);
		else
			el.setAttribute(attr, attrs[attr]);
	}
	el.textContent = text;
	return el;
}

function escapeString(string) {
	// Escape markdown and HTML special characters
	return string.replace(/[*_\`\[\]<&]/g, function(charString) {
		return '&#' + charString.charCodeAt(0) + ';';
	});
}

// function* enumerate(iter) {
// 	var count = 0;
// 	for(const x of iter) {
// 		yield [count, x];
// 		count++;
// 	}
// }