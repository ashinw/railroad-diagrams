declare const funcs: {
    TrackDiagram: any;
    Diagram: any;
    ComplexDiagram: any;
    Sequence: any;
    Stack: any;
    OptionalSequence: any;
    AlternatingSequence: any;
    Choice: any;
    HorizontalChoice: any;
    MultipleChoice: any;
    Optional: any;
    ZeroOrMore: any;
    OneOrMore: any;
    Start: any;
    End: any;
    Terminal: any;
    NonTerminal: any;
    Comment: any;
    Skip: any;
    Block: any;
    generate: any;
};
export default funcs;
export interface ConfigListener {
    onElementAdded(child: HTMLElement, parent: HTMLElement): void;
}
declare class Configuration {
    DEBUG: boolean;
    VS: number;
    AR: number;
    DIAGRAM_CLASS: string;
    STROKE_ODD_PIXEL_LENGTH: boolean;
    INTERNAL_ALIGNMENT: string;
    CHAR_WIDTH: number;
    COMMENT_CHAR_WIDTH: number;
    configListeners: ConfigListener[];
    notify(child: HTMLElement, parent: HTMLElement): void;
    pushListener(lsnr: ConfigListener): void;
    popListener(): void;
}
export declare const Options: Configuration;
export declare class FakeSVG {
    children: any;
    tagName: string;
    attrs: {};
    up: number;
    down: number;
    height: number;
    width: number;
    needsSpace: boolean;
    constructor(tagName: string, attrs?: object, text?: string | FakeSVG[]);
    protected mergeAttributes(attrs?: object): Object;
    format(): FakeSVG;
    format(x?: number, y?: number): FakeSVG;
    format(x?: number, y?: number, width?: number): FakeSVG;
    addTo(parent: FakeSVG | Node): any;
    toSVG(): any;
    toString(): string;
}
export declare class PathAttributes {
    d: string;
}
export declare class Path extends FakeSVG {
    constructor(x: number, y: number);
    m(x: number, y: number): this;
    h(val: number): this;
    right(val: number): this;
    left(val: number): this;
    v(val: number): this;
    downFn(val: number): this;
    upFn(val: number): this;
    arc(sweep: string): Path;
    arc_8(start: string, dir: string): Path;
    l(x: number, y: number): Path;
    format(): Path;
}
export declare abstract class Component extends FakeSVG {
    private static CONNECTION_UPLINE_CACHE;
    private static CONNECTION_DNLINE_CACHE;
    private static SAVINGS_COUNT;
    private static CALL_COUNT;
    parentContainer: Container;
    previous: Component;
    next: Component;
    isEntrySupported(): boolean;
    isExitSupported(): boolean;
    canConnectUpline(): boolean;
    canConnectDownline(): boolean;
}
interface Containable {
    implementsContainable(): any;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
}
declare abstract class Container extends Component implements Containable {
    items: Component[];
    constructor(items: (string | Component)[], tagName: string, attrs?: object, text?: string | FakeSVG[]);
    implementsContainable(): void;
    prepareItemsPriorToLinage(items: (string | Component)[]): void;
    protected prepareComponentLinage(items: (string | Component)[]): void;
    protected assertValidLinageVerification(childCtx: Component): void;
    abstract getDownlineComponent(childCtx: Component): Component;
    abstract getUplineComponent(childCtx: Component): Component;
    hasDownlineSupport(childCtx: Component): boolean;
    hasUplineSupport(childCtx: Component): boolean;
}
interface Sequenceable {
    implementsSequenceable(): any;
    isThreaded(): boolean;
}
declare class SequenceableContainer extends Container implements Sequenceable {
    constructor(items: (string | Component)[], tagName: string, attrs?: object, text?: string | FakeSVG[]);
    implementsSequenceable(): void;
    isThreaded(): boolean;
    isEntrySupported(): boolean;
    isExitSupported(): boolean;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
    refreshSequentially(): void;
    formatSequentially(target: FakeSVG, x?: number, y?: number, width?: number): FakeSVG;
    protected renderComponent(item: Component, x: number, y: number, target: FakeSVG): void;
    protected formatDownlineConnection(x: number, item: Component, y: number, i: number, target: FakeSVG): {
        x: number;
        y: number;
    };
    protected formatUplineConnection(item: Component, i: number, x: number, y: number, target: FakeSVG): number;
    protected formatEntryExits(width: number, x: number, y: number, target: FakeSVG): number;
}
export interface Diagramable {
    implementsDiagramable(): any;
    getItems(): Component[];
    isFormatted(): boolean;
    refresh(): void;
    addTo(parent?: FakeSVG | Node): any;
    toSVG(): any;
    toString(): any;
}
export declare class TrackDiagram extends SequenceableContainer implements Diagramable {
    formatted: boolean;
    extraViewboxHeight: number;
    constructor(...items: any[]);
    implementsDiagramable(): void;
    getItems(): Component[];
    isFormatted(): boolean;
    refresh(): void;
    protected formatEntryExits(width: number, x: number, y: number, target: FakeSVG): number;
    protected renderComponent(item: Component, x: number, y: number, target: FakeSVG): void;
    format(paddingt?: number, paddingr?: number, paddingb?: number, paddingl?: number): FakeSVG;
    addTo(parent?: FakeSVG | Node): any;
    toSVG(): any;
    toString(): string;
}
export declare class Diagram extends TrackDiagram {
    prepareItemsPriorToLinage(items: (string | Component)[]): void;
}
export declare class ComplexDiagram extends Diagram {
    prepareItemsPriorToLinage(items: (string | Component)[]): void;
}
interface Conditionable {
    implementsConditionable(): any;
    getDefaultIndex(): number;
}
interface Repeatable {
    implementsRepeatable(): any;
    isThreaded(): boolean;
    isExitSupported(): boolean;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
}
declare class Control extends Component {
}
export declare class Sequence extends SequenceableContainer implements Sequenceable {
    constructor(...items: (string | Component)[]);
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class Stack extends SequenceableContainer implements Sequenceable {
    constructor(...items: (string | Component)[]);
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class OptionalSequence extends SequenceableContainer implements Sequenceable, Conditionable {
    constructor(...items: (string | Component)[]);
    implementsSequenceable(): void;
    implementsConditionable(): void;
    getDefaultIndex(): number;
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class AlternatingSequence extends SequenceableContainer implements Sequenceable {
    constructor(...items: (string | Component)[]);
    isThreaded(): boolean;
    isEntrySupported(): boolean;
    isExitSupported(): boolean;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
    format(x?: number, y?: number, width?: number): FakeSVG;
}
declare abstract class ConditionableContainer extends Container implements Conditionable {
    abstract getDefaultIndex(): number;
    implementsConditionable(): void;
    isEntrySupported(): boolean;
    isExitSupported(): boolean;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
}
export declare class Choice extends ConditionableContainer implements Conditionable {
    normal: number;
    extraHeight: number;
    constructor(normal: number, ...items: (string | Component)[]);
    getDefaultIndex(): number;
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class HorizontalChoice extends ConditionableContainer implements Conditionable {
    _upperTrack: number;
    _lowerTrack: number;
    constructor(...items: (string | Component)[]);
    getDefaultIndex(): number;
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class MultipleChoice extends ConditionableContainer implements Conditionable {
    normal: number;
    type: any;
    innerWidth: any;
    constructor(normal: number, type: string, ...items: (string | Component)[]);
    getDefaultIndex(): number;
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class Optional extends Choice implements Conditionable {
    constructor(item: Component, skip: string | undefined);
}
export declare class OneOrMore extends SequenceableContainer implements Repeatable {
    item: Component;
    rep: Component;
    showArrow: boolean;
    constructor(item: string | Component, rep: string | Component, showArrow?: boolean);
    implementsRepeatable(): void;
    isThreaded(): boolean;
    isExitSupported(): boolean;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class ZeroOrMore extends Optional implements Conditionable, Repeatable {
    constructor(item: Component | string, rep: Component | string, skip: string | undefined);
    implementsRepeatable(): void;
    isThreaded(): boolean;
}
declare class LabelTitleLinkControl extends Control {
    label?: string;
    title?: string;
    href?: string;
    constructor(label?: string, title?: string, href?: string, attrs?: object);
    protected formatSides(x: number, y: number, width: number, addToRightY?: number): number;
}
declare class TerminusNode extends LabelTitleLinkControl {
    type: string;
    connected: boolean;
    constructor(type?: string, label?: string, title?: string, href?: string, connected?: boolean);
    format(x?: number, y?: number, width?: number): FakeSVG;
    protected formatTextElementAttr(x: number, y: number): object;
}
export declare class Start extends TerminusNode {
    constructor(type?: string, label?: string, href?: string, connected?: boolean);
    format(x?: number, y?: number, width?: number): FakeSVG;
    isEntrySupported(): boolean;
}
export declare class End extends TerminusNode {
    constructor(type?: string, label?: string, href?: string, connected?: boolean);
    format(x?: number, y?: number, width?: number): FakeSVG;
    protected formatTextElementAttr(x: number, y: number): object;
    isExitSupported(): boolean;
}
declare class NonTerminusNode extends LabelTitleLinkControl {
    title?: string;
    constructor(label: string, title?: string, href?: string, attr?: object);
    initialiseSizing(): void;
    protected formatLabelTitleLink(x: number, y: number, attr: object): FakeSVG;
}
export declare class Terminal extends NonTerminusNode {
    title: string;
    constructor(label: string, title?: string, href?: string);
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class NonTerminal extends NonTerminusNode {
    title: string;
    constructor(label: string, title?: string, href?: string);
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class Comment extends NonTerminusNode {
    title: string;
    constructor(label: string, title?: string, href?: string);
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class Skip extends Control {
    constructor();
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class Block extends Control {
    constructor(width?: number, up?: number, height?: number, down?: number, needsSpace?: boolean);
    format(x?: number, y?: number, width?: number): this;
}
