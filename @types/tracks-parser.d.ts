/**

Tracks notation guide

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
(x|y)         group of container x with a group label of y
~						  by pass (ie. Skip)

"title|link"		  terminal with optional link
<"title|link">	  nonterminal with optional link
+=[|title|link= start (simple: ||, complex: |)
=title|link|]=+ end (simple: ||, complex: |, join back to main line: +)
/"text|link"/	comment (see titleLinkDelim for delimiter)

"x" can also be written 'x' or """x"""

pragmas:
    @jsc 				supports Tab Atkins Jr. (and others) original JS code
    @trk 				creates a track diagram (ie. No rules around start|end) rather that the Railroad diagram
    @dbg				toggle
    @esc<char>	set character
 */
import { ConfigListener, Diagramable, Component } from './tracks-model.js';
export declare class ParserManager {
    elementResolver?: ConfigListener;
    context: ParserReadContext;
    parsers: ComponentParser[];
    tokenStack: any[];
    targetTracksDiagram: boolean;
    constructor(src: string, debug?: boolean, elementResolver?: ConfigListener);
    isDebug(): boolean;
    parse(): Diagramable;
    parseComponents(): Component[];
    parseNextComponent(callerState: ParserState): Component;
    getParser(callerState: ParserState): ParserState;
    prepareTroubleshootingHint(): string;
    addToTokenisedStack(state: ParserState): void;
    registerParser(parser: ComponentParser, index?: number): void;
    protected loadParsers(): void;
    protected reorderParsers(): void;
}
export default ParserManager;
declare class ParserReadContext {
    escapeChar: string;
    source: string;
    pos: number;
    hasMore(): boolean;
    readIn(len: number): number;
    skipTo(newPos: number): string;
    skipWhitespace(): number;
    private sigCacheHdr;
    private sigCachePos;
    hasSignature(regOrStr: RegExp): string;
    hasSignature(regOrStr: string): string;
    escapedStringIndexOf(src: string, criteria: string, startFrom: number): number;
    escapedRegExIndexOf(src: string, criteria: RegExp, startFrom: number, storeMatch: string[]): number;
    unescape(src: string): string;
}
export declare class ParserState {
    parser: ComponentParser;
    startsFrom: number;
    openSyntax: string;
    closeSyntax: string;
    operationName: string;
    items: any[];
    attr: any;
    constructor(parser: ComponentParser, startsFrom: number, openSyntax: string, closeSyntax: string, operationName: string);
}
export declare abstract class ComponentParser {
    controller: ParserManager;
    ctx: ParserReadContext;
    constructor(controller: ParserManager);
    abstract canParse(): ParserState;
    abstract parse(state: ParserState): Component;
    protected canParseWith(openingList: string[], closingList: string[], regOrStr: RegExp, opName: string): ParserState;
    protected canParseWith(openingList: string[], closingList: string[], regOrStr: string, opName: string): ParserState;
    protected raiseMissingClosureError(open: string, close: string, op: string): void;
}
export declare abstract class OperandDelimComponentParser extends ComponentParser {
    delim: string;
    constructor(controller: ParserManager, delim?: string);
    readUntilClosingToken(state: ParserState, useClosingRegEx?: RegExp): string[];
    protected finaliseState(operation: string, state: ParserState): string[];
    protected readOperands(operation: string): string[];
}
