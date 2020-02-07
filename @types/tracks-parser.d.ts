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
-						  by pass (ie. Skip)

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
import { ConfigListener, Diagramable } from './tracks-model.js';
export declare class ParserManager implements ConfigListener {
    elementHandler?: ConfigListener;
    context: ParserReadContext;
    parsers: ComponentParser[];
    tokenStack: any[];
    targetTracksDiagram: boolean;
    constructor(src: string, debug?: boolean, elementHandler?: ConfigListener);
    isDebug(): boolean;
    onElementAdded(child: HTMLElement, parent: HTMLElement): void;
    parse(): Diagramable;
    parseNextComponent(callerState: ParserState): any[];
    getParser(callerState: ParserState): ParserState;
    prepareTroubleshootingHint(): string;
    addToTokenisedStack(state: ParserState): void;
    registerParser(parser: ComponentParser): void;
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
declare class ParserState {
    parser: ComponentParser;
    startsFrom: number;
    openSyntax: string;
    closeSyntax: string;
    operationName: string;
    items: any[];
    attr: any;
    constructor(parser: ComponentParser, startsFrom: number, openSyntax: string, closeSyntax: string, operationName: string);
}
declare abstract class ComponentParser {
    controller: ParserManager;
    ctx: ParserReadContext;
    constructor(controller: ParserManager);
    abstract canParse(): ParserState;
    abstract parse(state: ParserState): any;
    protected canParseWith(openingList: string[], closingList: string[], regOrStr: RegExp, opName: string): ParserState;
    protected canParseWith(openingList: string[], closingList: string[], regOrStr: string, opName: string): ParserState;
    protected raiseMissingClosureError(open: string, close: string, op: string): void;
}
