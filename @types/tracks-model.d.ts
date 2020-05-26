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
    Group: any;
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
export declare class Configuration {
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
export declare const defaultCSS = "\n\tsvg {\n\t\tbackground-color: hsl(30,20%,95%);\n\t}\n\tpath {\n\t\tstroke-width: 3;\n\t\tstroke: black;\n\t\tfill: rgba(0,0,0,0);\n\t}\n\ttext {\n\t\tfont: bold 14px monospace;\n\t\ttext-anchor: middle;\n\t\twhite-space: pre;\n\t}\n\ttext.diagram-text {\n\t\tfont-size: 12px;\n\t}\n\ttext.diagram-arrow {\n\t\tfont-size: 16px;\n\t}\n\ttext.label {\n\t\ttext-anchor: start;\n\t}\n\ttext.comment {\n\t\tfont: italic 12px monospace;\n\t}\n\tg.non-terminal text {\n\t\t/*font-style: italic;*/\n\t}\n\trect {\n\t\tstroke-width: 3;\n\t\tstroke: black;\n\t\tfill: hsl(120,100%,90%);\n\t}\n\trect.group-box {\n\t\tstroke: gray;\n\t\tstroke-dasharray: 10 5;\n\t\tfill: none;\n\t}\n\tpath.diagram-text {\n\t\tstroke-width: 3;\n\t\tstroke: black;\n\t\tfill: white;\n\t\tcursor: help;\n\t}\n\tg.diagram-text:hover path.diagram-text {\n\t\tfill: #eee;\n\t}";
export declare class FakeSVG {
    protected _children: any;
    protected _tagName: string;
    attrs: {};
    up: number;
    down: number;
    height: number;
    width: number;
    needsSpace: boolean;
    constructor(tagName: string, attrs?: object, text?: string | FakeSVG[]);
    protected _mergeAttributes(attrs?: object): Object;
    format(): FakeSVG;
    format(x?: number, y?: number): FakeSVG;
    format(x?: number, y?: number, width?: number): FakeSVG;
    addTo(parent: FakeSVG | Node): any;
    toSVG(): any;
    toString(): string;
    walk(cb: any): void;
}
export interface PathAttributes {
    d: string;
}
export declare class Path extends FakeSVG {
    constructor(x: number, y: number);
    m(x: number, y: number): Path;
    h(val: number): Path;
    right(val: number): Path;
    left(val: number): Path;
    v(val: number): Path;
    downFn(val: number): Path;
    upFn(val: number): Path;
    arc(sweep: string): Path;
    arc_8(start: string, dir: string): Path;
    l(x: number, y: number): Path;
    format(): Path;
}
export declare class LruCache<K, T> {
    protected _values: Map<K, T>;
    protected _maxEntries: number;
    get(key: K): T;
    put(key: K, value: T): void;
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
export interface Containable {
    implementsContainable(): void;
    getItemCount(): number;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
}
export declare abstract class Container extends Component implements Containable {
    protected items: Component[];
    constructor(items: (string | Component)[], tagName: string, attrs?: object, text?: string | FakeSVG[]);
    implementsContainable(): void;
    getItemCount(): number;
    protected _prepareItemsPriorToLinage(items: (string | Component)[]): void;
    protected _prepareComponentLinage(items: (string | Component)[]): void;
    protected _assertValidLinageVerification(childCtx: Component): void;
    abstract getDownlineComponent(childCtx: Component): Component;
    abstract getUplineComponent(childCtx: Component): Component;
    hasDownlineSupport(childCtx: Component): boolean;
    hasUplineSupport(childCtx: Component): boolean;
    walk(cb: any): void;
}
export interface Sequenceable {
    implementsSequenceable(): void;
    isThreaded(): boolean;
}
export declare class SequenceableContainer extends Container implements Sequenceable {
    constructor(items: (string | Component)[], tagName: string, attrs?: object, text?: string | FakeSVG[]);
    implementsSequenceable(): void;
    isThreaded(): boolean;
    isEntrySupported(): boolean;
    isExitSupported(): boolean;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
    protected _refreshSequentially(): void;
    protected _formatSequentially(target: FakeSVG, x?: number, y?: number, width?: number): FakeSVG;
    protected _renderComponent(item: Component, x: number, y: number, target: FakeSVG): void;
    protected _formatDownlineConnection(x: number, item: Component, y: number, i: number, target: FakeSVG): {
        x: number;
        y: number;
    };
    protected _formatUplineConnection(item: Component, i: number, x: number, y: number, target: FakeSVG): number;
    protected _formatEntryExits(width: number, x: number, y: number, target: FakeSVG): number;
}
export interface Diagramable {
    implementsDiagramable(): void;
    getItems(): Component[];
    isFormatted(): boolean;
    refresh(): void;
    addTo(parent?: FakeSVG | Node): any;
    toSVG(): any;
    toString(): any;
}
export declare class TracksDiagram extends SequenceableContainer implements Diagramable {
    protected _formatted: boolean;
    protected _extraViewboxHeight: number;
    constructor(...items: any[]);
    implementsDiagramable(): void;
    getItems(): Component[];
    isFormatted(): boolean;
    refresh(): void;
    protected _formatEntryExits(width: number, x: number, y: number, target: FakeSVG): number;
    protected _renderComponent(item: Component, x: number, y: number, target: FakeSVG): void;
    format(paddingt?: number, paddingr?: number, paddingb?: number, paddingl?: number): FakeSVG;
    addTo(parent?: FakeSVG | Node): any;
    toSVG(): any;
    toString(): string;
    toStandalone(style: any): string;
}
export declare class Diagram extends TracksDiagram {
    protected _prepareItemsPriorToLinage(items: (string | Component)[]): void;
}
export declare class ComplexDiagram extends Diagram {
    protected _prepareItemsPriorToLinage(items: (string | Component)[]): void;
}
export interface Conditionable {
    implementsConditionable(): void;
    getDefaultIndex(): number;
}
export interface Repeatable {
    implementsRepeatable(): void;
    isThreaded(): boolean;
    isExitSupported(): boolean;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
}
export declare class Control extends Component {
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
export declare abstract class ConditionableContainer extends Container implements Conditionable {
    abstract getDefaultIndex(): number;
    implementsConditionable(): void;
    isEntrySupported(): boolean;
    isExitSupported(): boolean;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
}
export declare class Choice extends ConditionableContainer implements Conditionable {
    protected _normal: number;
    extraHeight: number;
    constructor(normal: number, ...items: (string | Component)[]);
    getDefaultIndex(): number;
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class HorizontalChoice extends ConditionableContainer implements Conditionable {
    protected _upperTrack: number;
    protected _lowerTrack: number;
    constructor(...items: (string | Component)[]);
    getDefaultIndex(): number;
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class MultipleChoice extends ConditionableContainer implements Conditionable {
    protected _normal: number;
    protected _type: any;
    protected _innerWidth: any;
    constructor(normal: number, type: string, ...items: (string | Component)[]);
    getDefaultIndex(): number;
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare class Optional extends Choice implements Conditionable {
    constructor(item: Component, skip: string | undefined);
}
export declare class OneOrMore extends SequenceableContainer implements Repeatable {
    protected _item: Component;
    protected _rep: Component;
    protected _showArrow: boolean;
    constructor(item: string | Component, rep: string | Component, showArrow?: boolean);
    implementsRepeatable(): void;
    isThreaded(): boolean;
    isExitSupported(): boolean;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
    format(x?: number, y?: number, width?: number): FakeSVG;
    walk(cb: any): void;
}
export declare class Group extends Container {
    protected _item: Component;
    protected _label: Component;
    protected _boxUp: number;
    constructor(...items: (string | Component)[]);
    format(x?: number, y?: number, width?: number): FakeSVG;
    walk(cb: any): void;
    getDownlineComponent(childCtx: Component): Component;
    getUplineComponent(childCtx: Component): Component;
}
export declare class ZeroOrMore extends Optional implements Conditionable, Repeatable {
    constructor(item: Component | string, rep: Component | string, skip: string | undefined);
    implementsRepeatable(): void;
    isThreaded(): boolean;
}
export declare abstract class AnchorableControl extends Control {
    label?: string;
    title?: string;
    href?: string;
    constructor(label?: string, title?: string, href?: string, attrs?: object);
    protected _formatSides(x: number, y: number, width: number, addToRightY?: number): number;
}
export declare class TerminusNode extends AnchorableControl {
    type: string;
    connected: boolean;
    constructor(type?: string, label?: string, title?: string, href?: string, connected?: boolean);
    format(x?: number, y?: number, width?: number): FakeSVG;
    protected _formatTextElementAttr(x: number, y: number): Object;
}
export declare class Start extends TerminusNode {
    constructor(type?: string, label?: string, href?: string, connected?: boolean);
    format(x?: number, y?: number, width?: number): FakeSVG;
    isEntrySupported(): boolean;
}
export declare class End extends TerminusNode {
    constructor(type?: string, label?: string, href?: string, connected?: boolean);
    format(x?: number, y?: number, width?: number): FakeSVG;
    protected _formatTextElementAttr(x: number, y: number): object;
    isExitSupported(): boolean;
}
export declare class NonTerminusNode extends AnchorableControl {
    title?: string;
    constructor(label: string, title?: string, href?: string, attr?: object);
    protected _initialiseSizing(): void;
    protected _formatAnchor(x: number, y: number, attr: object): FakeSVG;
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
    format(x?: number, y?: number, width?: number): FakeSVG;
}
export declare function unnull(...args: any): any;
export declare function determineGaps(outer: number, inner: number): number[];
export declare function makeTerminalIfString(value: Component | string): Component;
export declare function sum(iter: any, func: any): any;
export declare function max(iter: any, func: any): any;
export declare function SVG(name: string, attrs?: Object, text?: string): any;
export declare function escapeString(str: string): string;
