"use strict";
/*
Railroad Diagrams
by Tab Atkins Jr. (and others)
http://xanthir.com
http://twitter.com/tabatkins
http://github.com/tabatkins/railroad-diagrams

This document and all associated files in the github project are licensed under CC0: http://creativecommons.org/publicdomain/zero/1.0/
This means you can reuse, remix, or otherwise appropriate this project for your own use WITHOUT RESTRICTION.
(The actual legal meaning can be found at the above link.)
Don't ask me for permission to use any part of this project, JUST USE IT.
I would appreciate attribution, but that is not required by the license.
*/

// Export function versions of all the constructors.
// Each class will add itself to this object.
const funcs = {
	TrackDiagram: undefined,
	Diagram: undefined,
	ComplexDiagram: undefined,
	Sequence: undefined,
	Stack: undefined,
	OptionalSequence: undefined,
	AlternatingSequence: undefined,
	Choice: undefined,
	HorizontalChoice: undefined,
	MultipleChoice: undefined,
	Optional: undefined,
	ZeroOrMore: undefined,
	OneOrMore: undefined,
	Group: undefined,
	Start: undefined,
	End: undefined,
	Terminal: undefined,
	NonTerminal: undefined,
	Comment: undefined,
	Skip: undefined,
	Block: undefined,
	generate: undefined,
};
export default funcs;

export interface ConfigListener {
	onElementAdded(child: HTMLElement, parent: HTMLElement): void;
}

export class Configuration {
	public DEBUG= false; // if true; writes some debug information into attributes
	public VS= 8; // minimum vertical separation between things. For a 3px stroke; must be at least 4
	public AR= 10; // radius of arcs
	public DIAGRAM_CLASS= 'tracks'; // class to put on the root <svg>
	public STROKE_ODD_PIXEL_LENGTH= true; // is the stroke width an odd (1px; 3px; etc) pixel length?
	public INTERNAL_ALIGNMENT= 'center'; // how to align items when they have extra space. left/right/center
	public CHAR_WIDTH= 8.5; // width of each monospace character. play until you find the right value for your font
	public COMMENT_CHAR_WIDTH= 7; // comments are in smaller text by default

	public configListeners = new Array<ConfigListener>();
	
	public notify(child: HTMLElement, parent: HTMLElement): void {
		if (this.configListeners.length > 0)
			this.configListeners[this.configListeners.length-1].onElementAdded(child, parent);
	}

	public pushListener(lsnr: ConfigListener): void {
		this.configListeners.push(lsnr);
	}

	public popListener(): void {
		this.configListeners.pop();
	}
}

export const Options = new Configuration(); // singleton

export const defaultCSS = `
	svg {
		background-color: hsl(30,20%,95%);
	}
	path {
		stroke-width: 3;
		stroke: black;
		fill: rgba(0,0,0,0);
	}
	text {
		font: bold 14px monospace;
		text-anchor: middle;
		white-space: pre;
	}
	text.diagram-text {
		font-size: 12px;
	}
	text.diagram-arrow {
		font-size: 16px;
	}
	text.label {
		text-anchor: start;
	}
	text.comment {
		font: italic 12px monospace;
	}
	g.non-terminal text {
		/*font-style: italic;*/
	}
	rect {
		stroke-width: 3;
		stroke: black;
		fill: hsl(120,100%,90%);
	}
	rect.group-box {
		stroke: gray;
		stroke-dasharray: 10 5;
		fill: none;
	}
	path.diagram-text {
		stroke-width: 3;
		stroke: black;
		fill: white;
		cursor: help;
	}
	g.diagram-text:hover path.diagram-text {
		fill: #eee;
	}`;

export class FakeSVG {
	protected _children: any;
	protected _tagName: string;
	public attrs 								= {};
	public up: number						= 0;
	public down: number					= 0;
	public height: number				= 0;
	public width: number				= 0;
	public needsSpace: boolean	= true;

	public constructor(tagName: string, attrs?: object, text?: string|FakeSVG[]) {
		this._tagName = tagName;
		if (text) 
			this._children = text;
		else 
			this._children = [];
		this._mergeAttributes(attrs);
	}

	protected _mergeAttributes(attrs?: object): Object {
		if (attrs)
			this.attrs = {...this.attrs, ...attrs};	// merge
		return this.attrs;
	}

	public format(): FakeSVG;
	public format(x?: number,y?: number): FakeSVG;
	public format(x?: number,y?: number,width?: number): FakeSVG;
	public format(paddingt?: number, paddingr?: number, paddingb?: number, paddingl?: number): FakeSVG {
			throw new Error("FakeSVG.format() is an overloaded method intended to be overridden by subclasses");
	}

	public addTo(parent:FakeSVG | Node): any {
		if(parent instanceof FakeSVG) {
			parent._children.push(this);
			return this;
		} else {
			var svg = this.toSVG();
			parent.appendChild(svg);
			return svg;
		}
	}

	public toSVG(): any {
		var el = SVG(this._tagName, this.attrs);
		if(typeof this._children == 'string') {
			el.textContent = this._children;
		} else {
			this._children.forEach(function(e) {
				let svg = e.toSVG();
				el.appendChild(svg);
				Options.notify(svg, <HTMLElement> el);
			});
		}
		return el;
	}

	public toString(): string {
		var str = '<' + this._tagName;
		var group = this._tagName == "g" || this._tagName == "svg";
		for(var attr in this.attrs) {
			str += ' ' + attr + '="' + (this.attrs[attr]+'').replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
		}
		str += '>';
		if(group) str += "\n";
		if(typeof this._children == 'string') {
			str += escapeString(this._children);
		} else {
			this._children.forEach(function(e) {
				str += e;
			});
		}
		str += '</' + this._tagName + '>\n';
		return str;
	}

	public walk(cb): void {
		cb(this)
	}
}

export interface PathAttributes {
	d: string;
}

export class Path extends FakeSVG {
	public constructor(x: number, y:number) {
		super('path', {d: "M"+x+' '+y});
	}
	
	public m(x: number,y:number): Path {
		(<PathAttributes>this.attrs).d += 'm'+x+' '+y;
		return this;
	}
	
	public h(val:number): Path {
		(<PathAttributes>this.attrs).d += 'h'+val;
		return this;
	}
	
	public right(val:number): Path { return this.h(Math.max(0, val)); }
	
	public left(val:number): Path { return this.h(-Math.max(0, val)); }
	
	public v(val:number): Path {
		(<PathAttributes>this.attrs).d += 'v'+val;
		return this;
	}
	
	public downFn(val:number): Path { return this.v(Math.max(0, val)); }
	
	public upFn(val:number): Path { return this.v(-Math.max(0, val)); }

	public arc(sweep: string): Path {
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
		(<PathAttributes>this.attrs).d += "a"+Options.AR+" "+Options.AR+" 0 0 "+cw+' '+x+' '+y;
		return this;
	}

	public arc_8(start: string, dir: string): Path {
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
		(<PathAttributes>this.attrs).d += path;
		return this;
	}

	public l(x: number,y:number): Path {
		(<PathAttributes>this.attrs).d += 'l'+x+' '+y;
		return this;
	}

	public format(): Path {
		// All paths in this library start/end horizontally.
		// The extra .5 ensures a minor overlap, so there's no seams in bad rasterizers.
		(<PathAttributes>this.attrs).d += 'h.5';
		return this;
	}
}

export class LruCache<K, T> {
	protected _values: Map<K, T> = new Map<K, T>();
	protected _maxEntries: number = 20;

	public get(key: K): T {
		const hasKey = this._values.has(key);
		let entry: T;
		if (hasKey) {
			entry = this._values.get(key);
			this._values.delete(key);
			this._values.set(key, entry);
		}
		return entry;
	}

	public put(key: K, value: T) {
		if (this._values.size >= this._maxEntries) {
			const keyToDelete = this._values.keys().next().value;
			this._values.delete(keyToDelete);
		}
		this._values.set(key, value);
	}
}	


export abstract class Component extends FakeSVG {
	private static CONNECTION_UPLINE_CACHE = new LruCache<Component, boolean>();
	private static CONNECTION_DNLINE_CACHE = new LruCache<Component, boolean>();
	private static SAVINGS_COUNT = 0;
	private static CALL_COUNT = 0;

	public parentContainer: Container;
	public previous: Component;
	public next: Component;

	public isEntrySupported(): boolean {
		return true;
	}

	public isExitSupported(): boolean {
		return true;
	}

	public canConnectUpline(): boolean {
		let ret = Component.CONNECTION_UPLINE_CACHE.get(this);
		if (ret === undefined) {
			ret = (this.isEntrySupported() 
				&& this.parentContainer.hasUplineSupport(this));
				Component.CONNECTION_UPLINE_CACHE.put(this, ret);
		} else
			Component.SAVINGS_COUNT++;
		Component.CALL_COUNT++;
		return ret;
	}

	public canConnectDownline(): boolean {
		let ret = Component.CONNECTION_DNLINE_CACHE.get(this);
		if (ret === undefined) {
			ret = (this.isExitSupported() 
			&& this.parentContainer.hasDownlineSupport(this));
			Component.CONNECTION_DNLINE_CACHE.put(this, ret);
		} else
			Component.SAVINGS_COUNT++;
		Component.CALL_COUNT++;
		return ret;
	}
}

export interface Containable {
	implementsContainable(): void;
	getItemCount(): number;
	getDownlineComponent(childCtx: Component): Component;
	getUplineComponent(childCtx: Component): Component;
}

export abstract class Container extends Component implements Containable {
	protected items: Component[];

	public constructor(items: (string|Component)[], tagName: string, attrs?: object, text?: string | FakeSVG[]) {
		super(tagName, attrs, text);
		this._prepareItemsPriorToLinage(items);
		this._prepareComponentLinage(items);
	}

	public implementsContainable(): void {}

	public getItemCount(): number {
		if (this.items)
			return this.items.length;
		return 0;
	}

	protected _prepareItemsPriorToLinage(items: (string|Component)[]): void {
		for (let i = items.length-1; i >= 0 ; i--) {
			if (!items[i]) // ie. null or undefined or empty string
				items.splice(i, 1);
		}
	}

	protected _prepareComponentLinage(items: (string|Component)[]): void {
		this.items = items.map((val: string | Component, i: number, arr: (string | Component)[]) => {
			let newVal: Component = makeTerminalIfString(val);
			arr[i] = newVal;
			newVal.parentContainer = this;
			newVal.previous = (i === 0 ? undefined : arr[i-1]) as Component;
			if (newVal.previous)
				newVal.previous.next = newVal;
			return newVal;
		});
	}

	// assertion can be removed after sufficient testing
	protected _assertValidLinageVerification(childCtx: Component): void {
		if (this.items.indexOf(childCtx) === -1)
			throw new Error(`Invalid argument: linage validation is limited to parent/child relationships`);
	}

	public abstract getDownlineComponent(childCtx: Component): Component;

	public abstract getUplineComponent(childCtx: Component): Component;

	public hasDownlineSupport(childCtx: Component): boolean {
		if (!childCtx.parentContainer)
			return true;
		let next = childCtx.parentContainer.getDownlineComponent(childCtx);
		if (next)
			return next.isEntrySupported();
		// go up a level and try parent
		return childCtx.parentContainer.hasDownlineSupport(childCtx.parentContainer); 
	}

	public hasUplineSupport(childCtx: Component): boolean {
		if (!childCtx.parentContainer)
			return true;
		let previous = childCtx.parentContainer.getUplineComponent(childCtx);
		if (previous)
			return previous.isExitSupported();
		// go up a level and try parent
		return childCtx.parentContainer.hasUplineSupport(childCtx.parentContainer); 
	}

	public walk(cb): void {
		cb(this);
		this.items.forEach(x=>x.walk(cb));
	}
}

export interface Sequenceable {
	implementsSequenceable(): void;
	// NB: threaded sequences (eg. alternating sequence) have a different
	// isEntry|ExitSupported & Up|Down line acquisition strategy
	isThreaded(): boolean;
}


export class SequenceableContainer extends Container implements Sequenceable {
	public constructor(items: (string|Component)[], tagName: string, attrs?: object, text?: string | FakeSVG[]) {
		super(items, tagName, attrs, text);
	}

	public implementsSequenceable(): void {}

	public isThreaded(): boolean {
		return false;
	}

	public isEntrySupported(): boolean {
		let ret = this.items[0].isEntrySupported();
		return ret;
	}

	public isExitSupported(): boolean {
		let ret = this.items[this.items.length-1].isExitSupported();
		return ret;
	}

	public getDownlineComponent(childCtx: Component): Component {
		this._assertValidLinageVerification(childCtx);
		if (childCtx.next)
			return childCtx.next;
		return undefined;
	}

	public getUplineComponent(childCtx: Component): Component {
		this._assertValidLinageVerification(childCtx);
		if (childCtx.previous)
			return childCtx.previous;
		return undefined;
	}

	protected _refreshSequentially(): void {
		for(const item of this.items) {
			this.width += item.width + (item.needsSpace?20:0);
			this.up = Math.max(this.up, item.up - this.height);
			this.height += item.height;
			this.down = Math.max(this.down - item.height, item.down);
		}
	}

	protected _formatSequentially(target: FakeSVG, x?: number,y?: number,width?: number): FakeSVG {
		// Hook up the two sides if this is narrower than its stated width.
		x = this._formatEntryExits(width, x, y, target);
		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			x = this._formatUplineConnection(item, i, x, y, target);
			this._renderComponent(item, x, y, target);
			({ x, y } = this._formatDownlineConnection(x, item, y, i, target));
		}
		return this;
	}

	protected _renderComponent(item: Component, x: number, y: number, target: FakeSVG): void {
		item.format(x, y, item.width).addTo(target);
	}

	protected _formatDownlineConnection(x: number, item: Component, y: number, i: number, target: FakeSVG): {x: number, y: number} {
		x += item.width;
		y += item.height;
		if (item.needsSpace && i < this.items.length - 1) {
			if (item.canConnectDownline()) {
				new Path(x, y).h(10).addTo(target);
			}
			x += 10;
		}
		return { x, y };
	}

	protected _formatUplineConnection(item: Component, i: number, x: number, y: number, target: FakeSVG): number {
		if (item.needsSpace && i > 0) {
			if (item.canConnectUpline()) {
				new Path(x, y).h(10).addTo(target);
			}
			x += 10;
		}
		return x;
	}

	protected _formatEntryExits(width: number, x: number, y: number, target: FakeSVG): number {
		var gaps = determineGaps(width, this.width);
		if (this.canConnectUpline()) {
			new Path(x, y).h(gaps[0]).addTo(target);
		}
		if (this.canConnectDownline()) {
			new Path(x + gaps[0] + this.width, y + this.height).h(gaps[1]).addTo(target);
		}
		x += gaps[0];
		return x;
	}
}

export interface Diagramable {
	implementsDiagramable(): void;

	getItems(): Component[];
	isFormatted(): boolean;
	refresh(): void;
	addTo(parent?:FakeSVG | Node): any;
	toSVG(): any;
	toString(): any;
}

export class TracksDiagram extends SequenceableContainer implements Diagramable {
	protected _formatted: boolean = false;
	protected _extraViewboxHeight= 0;

	public constructor(...items) {
		super(items, 'svg', {class: Options.DIAGRAM_CLASS}, undefined);
		this.needsSpace = false;
		this._refreshSequentially();
	}

	public implementsDiagramable(): void {}

	public getItems(): Component[] {
		return this.items;
	}

	public isFormatted(): boolean {
		return this._formatted;
	}

	public refresh(): void {
		super._refreshSequentially();
		this._formatted = false;
	}

	protected _formatEntryExits(width: number, x: number, y: number, target: FakeSVG): number {
		return x;	// nothing to do
	}

	protected _renderComponent(item: Component, x: number, y: number, target: FakeSVG): void {
		super._renderComponent(item, x, y, target);
		if (item instanceof Choice) // diagram viewbox height defect for Choice/Stack combo
			this._extraViewboxHeight += item.extraHeight ? item.extraHeight: 0; 
	}

	public format(paddingt?: number, paddingr?: number, paddingb?: number, paddingl?: number): FakeSVG {
		paddingt = unnull(paddingt, 20);
		paddingr = unnull(paddingr, paddingt, 20);
		paddingb = unnull(paddingb, paddingt, 20);
		paddingl = unnull(paddingl, paddingr, 20);
		var x = paddingl;
		var y = paddingt;
		y += this.up;
		var g = new FakeSVG('g', Options.STROKE_ODD_PIXEL_LENGTH ? {transform:'translate(.5 .5)'} : {});
		this._extraViewboxHeight = 0; 		
		this._formatSequentially(g, x, y, this.width);
		let _width = this.width + paddingl + paddingr;
		let _height = this.up + this.height + this.down + paddingt + paddingb + this._extraViewboxHeight;
		this._mergeAttributes({
				width: _width, height: _height,
				viewBox: `0 0 ${_width} ${_height}`
			});
		g.addTo(this);
		this._formatted = true;
		return this;
	}

	public addTo(parent?:FakeSVG | Node): any {
		if(!parent) {
			var scriptTag = document.getElementsByTagName('script');
			let scriptTagItem = scriptTag[scriptTag.length - 1];
			parent = scriptTagItem.parentNode;
		}
		return super.addTo(parent);
	}

	public toSVG(): any {
		if (!this._formatted) {
			this.format();
		}
		return super.toSVG();
	}

	public toString(): string {
		if (!this._formatted) {
			this.format();
		}
		return super.toString();
	}	

	public toStandalone(style): string {
		if(!this._formatted) {
			this.format();
		}
		const s = new FakeSVG('style', {}, style || defaultCSS);
		this._children.push(s);
		this.attrs['xmlns'] = "http://www.w3.org/2000/svg";
		this.attrs['xmlns:xlink'] = "http://www.w3.org/1999/xlink";
		const result = super.toString.call(this);
		this._children.pop();
		delete this.attrs['xmlns'];
		return result;
	}	
} 
funcs.TrackDiagram = (...args)=>new TracksDiagram(...args);

export class Diagram extends TracksDiagram {
	protected _prepareItemsPriorToLinage(items: (string|Component)[]): void {
		if(!(items[0] instanceof Start)) {
			items.unshift(new Start());
		}
		if(!(items[items.length-1] instanceof End)) {
			items.push(new End());
		}
	}
}
funcs.Diagram = (...args)=>new Diagram(...args);

export class ComplexDiagram extends Diagram {
	protected _prepareItemsPriorToLinage(items: (string|Component)[]): void {
		super._prepareItemsPriorToLinage(items);
		(<Start>this.items[0]).type = "complex";
		(<End>this.items[this.items.length-1]).type = "complex";
	}
}
funcs.ComplexDiagram = (...args)=>new ComplexDiagram(...args);

export interface Conditionable {
	implementsConditionable(): void;
	// consider using -2 for all, -1 for any, 0 - none, 1... for selection 
	getDefaultIndex(): number;
}

export interface Repeatable {
	implementsRepeatable(): void;

	// services that likely require extension considerations
	isThreaded(): boolean;
	isExitSupported(): boolean;
	getDownlineComponent(childCtx: Component): Component;
	getUplineComponent(childCtx: Component): Component;
}

export class Control extends Component {
}

export class Sequence extends SequenceableContainer implements Sequenceable {
	public constructor(...items: (string|Component)[]) {
		super(items, 'g', {}, undefined);
		this._refreshSequentially();
		if (this.items.length > 0) {
			if (this.items[0].needsSpace)
				this.width -= 10;
			if (this.items[this.items.length - 1].needsSpace)
				this.width -= 10;
		}
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "sequence";
		}
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		return this._formatSequentially(this, x, y, width);
	}
}
funcs.Sequence = (...args)=>new Sequence(...args);

export class Stack extends SequenceableContainer implements Sequenceable {
	public constructor(...items: (string|Component)[]) {
		super(items, 'g', {}, undefined);
		if( items.length === 0 ) {
			throw new RangeError("Stack() must have at least one child.");
		}
		this.width = Math.max.apply(null, this.items.map(function(e) { return e.width + (e.needsSpace?20:0); }));
		if(this.items.length > 1){
			this.width += Options.AR*2;
		}
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

	public format(x?: number,y?: number,width?: number): FakeSVG {
		var gaps = determineGaps(width, this.width);
		if (this.canConnectUpline()) {
				new Path(x,y).h(gaps[0]).addTo(this);
		}
		x += gaps[0];
		var xInitial = x;
		if(this.items.length > 1) {
			if (this.canConnectDownline()) {
				new Path(x, y).h(Options.AR).addTo(this);
			}
			x += Options.AR;
		}

		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			var innerWidth = this.width - (this.items.length>1 ? Options.AR*2 : 0);
			item.format(x, y, innerWidth).addTo(this);
			x += innerWidth;
			y += item.height;

			if(i !== this.items.length-1) {
				if (this.items[i+1].canConnectUpline()) {
					new Path(x, y)
					.arc('ne').downFn(Math.max(0, item.down + Options.VS - Options.AR*2))
					.arc('es').left(innerWidth)
					.arc('nw').downFn(Math.max(0, this.items[i+1].up + Options.VS - Options.AR*2))
					.arc('ws').addTo(this);
				}
				y += Math.max(item.down + Options.VS, Options.AR*2) + Math.max(this.items[i+1].up + Options.VS, Options.AR*2);
				//y += Math.max(Options.AR*4, item.down + Options.VS*2 + this.items[i+1].up)
				x = xInitial+Options.AR;
			}
		}

		if(this.items.length > 1) {
			if (item.canConnectDownline()) {
				new Path(x,y).h(Options.AR).addTo(this);
			}
			x += Options.AR;
			new Path(x,y).h(gaps[1]).addTo(this);
		}
		return this;
	}
}
funcs.Stack = (...args)=>new Stack(...args);

export class OptionalSequence extends SequenceableContainer implements Sequenceable, Conditionable {
	public constructor(...items: (string|Component)[]) {
		super(items, 'g', {}, undefined);
		if( items.length === 0 ) {
			throw new RangeError("OptionalSequence() must have at least one child.");
		}
		if( items.length === 1 ) {
			items.push(new Skip());
			// return new Sequence(items);
		}
		var arc = Options.AR;
		this.needsSpace = true;
		this.width = 0;
		this.up = 0;
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

	public implementsSequenceable(): void {}
	public implementsConditionable(): void {}

	public getDefaultIndex(): number {
		return -1;
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		var arc = Options.AR;
		var gaps = determineGaps(width, this.width);
		if (this.canConnectUpline()) {
			new Path(x, y).right(gaps[0]).addTo(this);
		}
		if (this.canConnectDownline()) {
			new Path(x + gaps[0] + this.width, y + this.height).right(gaps[1]).addTo(this);
		}
		x += gaps[0];
		var upperLineY = y - this.up;
		var last = this.items.length - 1;
		let show1stUpper = true;
		for(var i = 0; i < this.items.length; i++) {
			var item = this.items[i];
			var itemSpace = (item.needsSpace?10:0);
			var itemWidth = item.width + itemSpace;
			if(i === 0) {
				// Upper skip
				if (/* item.canConnectUpline() */ true) {
					new Path(x,y)
					.arc('se')
					.upFn(y - upperLineY - arc*2)
					.arc('wn')
					.right(itemWidth - arc)
					.arc('ne')
					.downFn(y + item.height - upperLineY - arc*2)
					.arc('ws')
					.addTo(this);
				} else
					show1stUpper = false;
				if ((show1stUpper && i === last) ||
						(item.canConnectUpline())) {
					// Straight line
					new Path(x, y)
						.right(itemSpace + arc)
						.addTo(this);
				}
				item.format(x + itemSpace + arc, y, item.width).addTo(this);
				x += itemWidth + arc;
				y += item.height;
				if (show1stUpper && i === last) {
					// Straight line
					new Path(x,y)
					.right(arc*2)
					.addTo(this);
				}
				// x ends on the far side of the first element,
				// where the next element's skip needs to begin
			} else if(i < last) {
				// Upper skip
				if (show1stUpper) {
					new Path(x, upperLineY)
					.right(arc*2 + Math.max(itemWidth, arc) + arc)
					.arc('ne')
					.downFn(y - upperLineY + item.height - arc*2)
					.arc('ws')
					.addTo(this);
				}
				if (item.canConnectUpline()) {
					// Straight line
						new Path(x,y)
						.right(arc*2)
						.addTo(this);
				}
				item.format(x + arc*2, y, item.width).addTo(this);
				new Path(x + item.width + arc*2, y + item.height)
				.right(itemSpace + arc)
				.addTo(this);
				if (item.canConnectUpline()) {
					// Lower skip
					new Path(x,y)
					.arc('ne')
					.downFn(item.height + Math.max(item.down + Options.VS, arc*2) - arc*2)
					.arc('ws')
					.right(itemWidth - arc)
					.arc('se')
					.upFn(item.down + Options.VS - arc*2)
					.arc('wn')
					.addTo(this); 
				}
				x += arc*2 + Math.max(itemWidth, arc) + arc;
				y += item.height;
			} else {
				// Straight line
				if (item.canConnectUpline()) {
					new Path(x, y)
					.right(arc*2)
					.addTo(this);
				}
				item.format(x + arc*2, y, item.width).addTo(this);
				if (item.canConnectDownline()) {
					new Path(x + arc*2 + item.width, y + item.height)
					.right(itemSpace + arc)
					.addTo(this);
				}
				// Lower skip
				if (item.canConnectDownline()) {
					new Path(x,y)
						.arc('ne')
						.downFn(item.height + Math.max(item.down + Options.VS, arc*2) - arc*2)
						.arc('ws')
						.right(itemWidth - arc)
						.arc('se')
						.upFn(item.down + Options.VS - arc*2)
						.arc('wn')
						.addTo(this);
				}
			}
		}
		return this;
	}
}
funcs.OptionalSequence = (...args)=>new OptionalSequence(...args);

export class AlternatingSequence extends SequenceableContainer implements Sequenceable {
	public constructor(...items: (string|Component)[]) {
		super(items, 'g', {}, undefined);
		if( items.length === 1 ) {
			 // rather than use delegation and lose the intended feature add an empty
			items.push(new Skip()); // return new Sequence(items);
		}
		if( items.length !== 2 ) {
			throw new RangeError("AlternatingSequence() must have two children.");
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

	public isThreaded(): boolean {
		return this.items.length > 1;
	}

	public isEntrySupported(): boolean {
		let ret = super.isEntrySupported(); 
		if (ret) 
			return ret;
		if (this.items.length > 1)
			ret = this.items[1].isEntrySupported();
		return ret;
	}

	public isExitSupported(): boolean {
		let ret = super.isExitSupported(); 
		if (ret) 
			return ret;
		if (this.items.length > 1)
			ret = this.items[0].isExitSupported();
		return ret;
	}

	public getDownlineComponent(childCtx: Component): Component {
		this._assertValidLinageVerification(childCtx);
		// go up a level and try parent's next sibling
		return childCtx.parentContainer.next; 
	}

	public getUplineComponent(childCtx: Component): Component {
		this._assertValidLinageVerification(childCtx);
		// go up a level and try parent's previous sibling
		return childCtx.parentContainer.previous; 
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		const arc = Options.AR;
		const gaps = determineGaps(width, this.width);
		if (this.canConnectUpline()) {
			new Path(x,y).right(gaps[0]).addTo(this);
		}
		x += gaps[0];
		if (this.canConnectDownline()) {
			new Path(x+this.width, y).right(gaps[1]).addTo(this);
		}
		// bounding box
		//new Path(x+gaps[0], y).upFn(this.up).right(this.width).downFn(this.up+this.down).left(this.width).upFn(this.down).addTo(this);
		const first = this.items[0];
		const second = this.items[1];

		// top
		const firstIn = this.up - first.up;
		const firstOut = this.up - first.up - first.height;
		if (first.canConnectUpline())
			new Path(x,y).arc('se').upFn(firstIn-2*arc).arc('wn').addTo(this);
		first.format(x + 2*arc, y - firstIn, this.width - 4*arc).addTo(this);
		if (first.canConnectDownline())
			new Path(x + this.width - 2*arc, y - firstOut).arc('ne').downFn(firstOut - 2*arc).arc('ws').addTo(this);

		// bottom
		const secondIn = this.down - second.down - second.height;
		const secondOut = this.down - second.down;
		if (second.canConnectUpline())
			new Path(x,y).arc('ne').downFn(secondIn - 2*arc).arc('ws').addTo(this);
		second.format(x + 2*arc, y + secondIn, this.width - 4*arc).addTo(this);
		if (second.canConnectDownline())
			new Path(x + this.width - 2*arc, y + secondOut).arc('se').upFn(secondOut - 2*arc).arc('wn').addTo(this);
		// crossover
		const arcX = 1 / Math.sqrt(2) * arc * 2;
		const arcY = (1 - 1 / Math.sqrt(2)) * arc * 2;
		const crossY = Math.max(arc, Options.VS);
		const crossX = (crossY - arcY) + arcX;
		const crossBar = (this.width - 4*arc - crossX)/2;
		if (second.isExitSupported())
			new Path(x+arc, y - crossY/2 - arc).arc('ws').right(crossBar)
				.arc_8('n', 'cw').l(crossX - arcX, crossY - arcY).arc_8('sw', 'ccw')
				.right(crossBar).arc('ne').addTo(this);
		if (first.isExitSupported())
			new Path(x+arc, y + crossY/2 + arc).arc('wn').right(crossBar)
			.arc_8('s', 'ccw').l(crossX - arcX, -(crossY - arcY)).arc_8('nw', 'cw')
			.right(crossBar).arc('se').addTo(this);
		return this;
	}
}
funcs.AlternatingSequence = (...args)=>new AlternatingSequence(...args);

export abstract class ConditionableContainer extends Container implements Conditionable {
	public abstract getDefaultIndex(): number;

	public implementsConditionable(): void {}

	public isEntrySupported(): boolean {
		for (let i = 0; i < this.items.length; i++) {
			// need at least one
			if (this.items[i].isEntrySupported())	
				return true;
		}
		return false;
	}

	public isExitSupported(): boolean {
		for (let i = 0; i < this.items.length; i++) {
			// need at least one
			if (this.items[i].isExitSupported())	
				return true;
		}
		return false;
	}

	public getDownlineComponent(childCtx: Component): Component {
		this._assertValidLinageVerification(childCtx);
		return childCtx.parentContainer.next; // go up a level and try parent's next sibling
	}

	public getUplineComponent(childCtx: Component): Component {
		this._assertValidLinageVerification(childCtx);
		return childCtx.parentContainer.previous; // go up a level and try parent's previous sibling
	}
}

export class Choice extends ConditionableContainer implements Conditionable {
	protected _normal: number;
	public extraHeight = 0;

	public constructor(normal: number, ...items: (string|Component)[]) {
		super(items, 'g', {}, undefined);
		if( typeof normal !== "number" || normal !== Math.floor(normal) ) {
			throw new TypeError("The first argument of Choice() must be an integer.");
		} else if(normal < 0 || normal >= items.length) {
			throw new RangeError("The first argument of Choice() must be an index for one of the items.");
		} else {
			this._normal = normal;
		}
		var first = 0;
		var last = items.length - 1;
		this.width = Math.max.apply(null, this.items.map(function(el){return el.width})) + Options.AR*4;
		this.height = this.items[normal].height;
		this.up = this.items[first].up;
		var arcs: number;
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

	public getDefaultIndex(): number {
		return this._normal;
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		if (this.canConnectUpline()) {
			new Path(x,y).h(gaps[0]).addTo(this);
		}
		if (this.canConnectDownline()) {
			new Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
		}
		x += gaps[0];

		var last = this.items.length -1;
		var innerWidth = this.width - Options.AR*4;
		var distanceFromY;
		for(var i = this._normal - 1; i >= 0; i--) {
			let item = this.items[i];
			if( i == this._normal - 1 ) {
				distanceFromY = Math.max(Options.AR*2, this.items[this._normal].up + Options.VS + item.down + item.height);
			}
			if (item.canConnectUpline()) {
				new Path(x,y)
				.arc('se')
				.upFn(distanceFromY - Options.AR*2)
				.arc('wn').addTo(this);
			}
			item.format(x+Options.AR*2,y - distanceFromY,innerWidth).addTo(this);
			if (item.canConnectDownline()) {
				new Path(x+Options.AR*2+innerWidth, y-distanceFromY+item.height)
				.arc('ne')
				.downFn(distanceFromY - item.height + this.height - Options.AR*2)
				.arc('ws').addTo(this);
		}
			distanceFromY += Math.max(Options.AR, item.up + Options.VS + (i === 0 ? 0 : this.items[i-1].down+this.items[i-1].height));
		}
		let item = this.items[this._normal];
		// Do the straight-line path. (normals is skip)
		if (item.canConnectUpline()) {
			new Path(x,y).right(Options.AR*2).addTo(this);
		}
		item.format(+x+Options.AR*2, y, innerWidth).addTo(this);
		if (item.canConnectDownline()) {
			new Path(x+Options.AR*2+innerWidth, y+this.height).right(Options.AR*2).addTo(this);
		}

		// Do the elements that curve below
		for(i = this._normal+1; i <= last; i++) {
			let item = this.items[i];
			if( i == this._normal + 1 ) {
				distanceFromY = Math.max(Options.AR*2, this.height + this.items[this._normal].down + Options.VS + item.up);
			}
			if (item.canConnectUpline()) {
				new Path(x,y)
						.arc('ne')
						.downFn(distanceFromY - Options.AR*2)
						.arc('ws').addTo(this);
			}
			item.format(x+Options.AR*2, y+distanceFromY, innerWidth).addTo(this);
			if (item instanceof Stack)
				this.extraHeight = 40 * item.getItemCount(); // there is a defect with diagram viewbox height for Choice/Stack combo
			if (item.canConnectDownline()) {
				new Path(x+Options.AR*2+innerWidth, y+distanceFromY+item.height)
					.arc('se')
					.upFn(distanceFromY - Options.AR*2 + item.height - this.height)
					.arc('wn').addTo(this);
			}
			distanceFromY += Math.max(Options.AR, item.height + item.down + Options.VS + (i == last ? 0 : this.items[i+1].up));
		}
		return this;
	}
}
funcs.Choice = (n,...args)=>new Choice(n,...args);

export class HorizontalChoice extends ConditionableContainer implements Conditionable {
	protected _upperTrack: number;
	protected _lowerTrack: number;

	public constructor(...items: (string|Component)[]) {
		super(items, 'g', {}, undefined);
		if( items.length === 0 ) {
			throw new RangeError("HorizontalChoice() must have at least one child.");
		}
		if( items.length === 1) {
			items.push(new Skip()); // inject a skip to render as intended
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
	
	public getDefaultIndex(): number {
		return 0;
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		if (this.canConnectUpline()) {
			new Path(x,y).h(gaps[0]).addTo(this);
		}
		if (this.canConnectDownline()) {
			new Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
		}
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
		if (this.items.length > 1) {
		new Path(x,y)
			.arc('se')
			.v(-(this._upperTrack - Options.AR*2))
			.arc('wn')
			.h(upperSpan)
			.addTo(this);
		}

		// lower track
		var lowerSpan = (sum(allButFirst, x=>x.width+(x.needsSpace?20:0))
			+ (this.items.length - 2) * Options.AR*2
			+ (last.height > 0 ? Options.AR : 0)
			- Options.AR
		);
		var lowerStart = x + Options.AR + first.width+(first.needsSpace?20:0) + Options.AR*2;
		if (this.items.length > 1) {
			new Path(lowerStart, y+this._lowerTrack)
			.h(lowerSpan)
			.arc('se')
			.v(-(this._lowerTrack - Options.AR*2))
			.arc('wn')
			.addTo(this);
		}
		// Items Typscript reporting errors with js generator
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
					if (item.canConnectUpline()) {
						new Path(x, y - this._upperTrack)
						.arc('ne')
						.v(this._upperTrack - Options.AR*2)
						.arc('ws')
						.addTo(this);
					}
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
					if (item.canConnectDownline()) {
						new Path(x, y+item.height)
						.arc('ne')
						.v(this._lowerTrack - item.height - Options.AR*2)
						.arc('ws')
						.addTo(this);
					}
				}
		}
		return this;
	}
}
funcs.HorizontalChoice = (...args: any[])=>new HorizontalChoice(...args);

export class MultipleChoice extends ConditionableContainer implements Conditionable {
	protected _normal: number;
	protected _type: any;
	protected _innerWidth: any;
	
	public constructor(normal: number, type: string, ...items: (string|Component)[]) {
		super(items, 'g', {}, undefined);
		if( typeof normal !== "number" || normal !== Math.floor(normal) ) {
			throw new TypeError("The first argument of MultipleChoice() must be an integer.");
		} else if(normal < 0 || normal >= items.length) {
			throw new RangeError("The first argument of MultipleChoice() must be an index for one of the items.");
		} else {
			this._normal = normal;
		}
		if( type != "any" && type != "all" ) {
			throw new SyntaxError("The second argument of MultipleChoice must be 'any' or 'all'.");
		} else {
			this._type = type;
		}
		this.needsSpace = true;
		this._innerWidth = max(this.items, function(x){return x.width});
		this.width = 30 + Options.AR + this._innerWidth + Options.AR + 20;
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

	public getDefaultIndex(): number {
		return this._normal;
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		var gaps = determineGaps(width, this.width);
		if (this.canConnectUpline()) {
			new Path(x, y).right(gaps[0]).addTo(this);
		}
		if (this.canConnectDownline()) {
			new Path(x + gaps[0] + this.width, y + this.height).right(gaps[1]).addTo(this);
		}
		x += gaps[0];

		var normal = this.items[this._normal];

		// Do the elements that curve above
		var distanceFromY;
		for(var i = this._normal - 1; i >= 0; i--) {
			var item = this.items[i];
			if( i == this._normal - 1 ) {
				distanceFromY = Math.max(10 + Options.AR, normal.up + Options.VS + item.down + item.height);
			}
			new Path(x + 30,y)
				.upFn(distanceFromY - Options.AR)
				.arc('wn').addTo(this);
			item.format(x + 30 + Options.AR, y - distanceFromY, this._innerWidth).addTo(this);
			new Path(x + 30 + Options.AR + this._innerWidth, y - distanceFromY + item.height)
				.arc('ne')
				.downFn(distanceFromY - item.height + this.height - Options.AR - 10)
				.addTo(this);
			if(i !== 0) {
				distanceFromY += Math.max(Options.AR, item.up + Options.VS + this.items[i-1].down + this.items[i-1].height);
			}
		}

		if (normal.canConnectUpline()) {
			new Path(x + 30, y).right(Options.AR).addTo(this);
		}
		normal.format(x + 30 + Options.AR, y, this._innerWidth).addTo(this);
		if (normal.canConnectDownline()) {
			new Path(x + 30 + Options.AR + this._innerWidth, y + this.height).right(Options.AR).addTo(this);
		}
		for(i = this._normal+1; i < this.items.length; i++) {
			let item = this.items[i];
			if(i == this._normal + 1) {
				distanceFromY = Math.max(10+Options.AR, normal.height + normal.down + Options.VS + item.up);
			}
			if (item.canConnectUpline()) {
				new Path(x + 30, y)
				.downFn(distanceFromY - Options.AR)
				.arc('ws')
				.addTo(this);
			}
			item.format(x + 30 + Options.AR, y + distanceFromY, this._innerWidth).addTo(this);
			if (item.canConnectDownline()) {
				new Path(x + 30 + Options.AR + this._innerWidth, y + distanceFromY + item.height)
				.arc('se')
				.upFn(distanceFromY - Options.AR + item.height - normal.height)
				.addTo(this);
			}
			if(i != this.items.length - 1) {
				distanceFromY += Math.max(Options.AR, item.height + item.down + Options.VS + this.items[i+1].up);
			}
		}
		var text = new FakeSVG('g', {"class": "diagram-text"}).addTo(this);
		new FakeSVG('title', {}, (this._type=="any"?"take one or more branches, once each, in any order":"take all branches, once each, in any order")).addTo(text);
		new FakeSVG('path', {
			"d": "M "+(x+30)+" "+(y-10)+" h -26 a 4 4 0 0 0 -4 4 v 12 a 4 4 0 0 0 4 4 h 26 z",
			"class": "diagram-text"
			}).addTo(text);
		new FakeSVG('text', {
			"x": x + 15,
			"y": y + 4,
			"class": "diagram-text"
			}, (this._type=="any"?"1+":"all")).addTo(text);
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
funcs.MultipleChoice = (n: number, t: string, ...args)=>new MultipleChoice(n, t, ...args);

export class Optional extends Choice implements Conditionable {
	public constructor(item: Component, skip: string|undefined) {
		super(skip === undefined ? 1: 0, new Skip(), item);
	}
}
funcs.Optional = (item: Component, skip: string|undefined)=>new Optional(item, skip);

export class OneOrMore extends SequenceableContainer implements Repeatable {
	protected _item: Component;
	protected _rep: Component;
	protected _showArrow: boolean;

	public constructor(item: string|Component, rep: string|Component, showArrow=false) {
		// super([makeTerminalIfString(item), makeTerminalIfString(rep || (new Skip()))], 'g', {}, undefined);
		super([item, rep || (new Skip())], 'g', {}, undefined);
		this._item = this.items[0];
		this._rep = this.items[1];
		this.width = Math.max(this._item.width, this._rep.width) + Options.AR*2;
		this.height = this._item.height;
		this.up = this._item.up;
		this.down = Math.max(Options.AR*2, this._item.down + Options.VS + this._rep.up + this._rep.height + this._rep.down);
		this.needsSpace = true;
		this._showArrow = showArrow;
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "oneormore";
		}
	}

	public implementsRepeatable(): void {}

	public isThreaded(): boolean {
		// only to extent that the return line may have optional nodes
		return true; 
	}

	public isExitSupported(): boolean {
		// note, the repeat journey follows the separator therefore we are only
		// interested in the mainline of the 1st sequence
		return this.items[0].isExitSupported(); 
	}

	public getDownlineComponent(childCtx: Component): Component {
		this._assertValidLinageVerification(childCtx);
		return childCtx.parentContainer.next; // go up a level and try parent's next sibling
	}

	public getUplineComponent(childCtx: Component): Component {
		this._assertValidLinageVerification(childCtx);
		return childCtx.parentContainer.previous; // go up a level and try parent's previous sibling
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		if (this.canConnectUpline()) {
			new Path(x,y).h(gaps[0]).addTo(this);
		}
		if (this.canConnectDownline()) {
			new Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
		}
		x += gaps[0];

		// Draw item
		if (this._item.canConnectUpline()) {
			new Path(x,y).right(Options.AR).addTo(this);
		}
		this._item.format(x+Options.AR,y,this.width-Options.AR*2).addTo(this);
		if (this._item.canConnectDownline()) {
			new Path(x+this.width-Options.AR,y+this.height).right(Options.AR).addTo(this);
		}

		// Draw repeat arc
		var distanceFromY = Math.max(Options.AR*2, this._item.height+this._item.down+Options.VS+this._rep.up);
		new Path(x+Options.AR,y).arc('nw').downFn(distanceFromY-Options.AR*2).arc('ws').addTo(this);
		this._rep.format(x+Options.AR, y+distanceFromY, this.width - Options.AR*2).addTo(this);
		new Path(x+this.width-Options.AR, y+distanceFromY+this._rep.height).arc('se').upFn(distanceFromY-Options.AR*2+this._rep.height-this._item.height).arc('en').addTo(this);

		if (this._showArrow) {
			var arrowSize = Options.AR/2;
			// Compensate for the illusion that makes the arrow look unbalanced if it's too close to the curve below it
			var multiplier = (distanceFromY < arrowSize*5) ? 1.2 : 1;
			new Path(x-arrowSize, y+distanceFromY/2 + arrowSize/2 /*, {class:"arrow"} */).
				l(arrowSize, -arrowSize).l(arrowSize*multiplier, arrowSize).addTo(this);
		}
		return this;
	}

	public walk(cb): void {
		cb(this);
		this._item.walk(cb);
		this._rep.walk(cb);
	}	
}
funcs.OneOrMore = (item: Component|string, rep: Component|string, arr: boolean)=>new OneOrMore(item, rep, arr);


export class Group extends Container {
	protected _item: Component;
	protected _label: Component;
	protected _boxUp: number;

	public constructor(...items: (string|Component)[]) {
		super(items, 'g', {}, undefined);
		if(items.length === 0 || items.length > 2) {
			throw new RangeError("Group() must have at least one child container and may have an optional label");
		}
		this._item = this.items[0];
		this._label = this.items[1];
		this.width = Math.max(
			this._item.width + (this._item.needsSpace?20:0),
			this._label ? this._label.width : 0,
			Options.AR*2);
		this.height = this._item.height;
		this._boxUp = this.up = Math.max(this._item.up + Options.VS, Options.AR);
		if(this._label) {
			this.up += this._label.up + this._label.height + this._label.down;
		}
		this.down = Math.max(this._item.down + Options.VS, Options.AR);
		this.needsSpace = true;
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "group";
		}
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		var gaps = determineGaps(width, this.width);
		// if (this.item.canConnectUpline()) 
			new Path(x,y).h(gaps[0]).addTo(this);
		// if (this.item.canConnectDownline()) 
			new Path(x+gaps[0]+this.width,y+this.height).h(gaps[1]).addTo(this);
		x += gaps[0];

		new FakeSVG('rect', {
			x,
			y:y-this._boxUp,
			width:this.width,
			height:this._boxUp + this.height + this.down,
			rx: Options.AR,
			ry: Options.AR,
			'class':'group-box',
		}).addTo(this);

		this._item.format(x,y,this.width).addTo(this);
		if(this._label) {
			this._label.format(
				x,
				y-(this._boxUp+this._label.down+this._label.height),
				this._label.width).addTo(this);
		}

		return this;
	}

	public walk(cb): void {
		cb(this);
		this._item.walk(cb);
		this._label.walk(cb);
	}

	public getDownlineComponent(childCtx: Component): Component {
		this._assertValidLinageVerification(childCtx);
		return childCtx.parentContainer.next; 
	}

	public getUplineComponent(childCtx: Component): Component {
		this._assertValidLinageVerification(childCtx);
		return childCtx.parentContainer.previous; 
	}
}
funcs.Group = (...args: any[])=>new Group(...args);

export class ZeroOrMore extends Optional implements Conditionable, Repeatable {
	public constructor(item: Component|string, rep: Component|string, skip: string|undefined) {
		super(new OneOrMore(item, rep), skip);
	}

	public implementsRepeatable(): void {}

	public isThreaded(): boolean {
		return (<OneOrMore>(this.items[0])).isThreaded()
	}
}
funcs.ZeroOrMore = (item: Component|string, rep: Component|string, skip: string|undefined)=>new ZeroOrMore(item, rep, skip);

export abstract class AnchorableControl extends Control {
	public constructor(public label?: string, public title?: string, public href?: string, attrs?: object) {
		super('g', attrs);
		this.label = label ? label : "";
	}

	protected _formatSides(x: number, y: number, width: number, addToRightY=0): number {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		if (this.canConnectUpline()) {
			new Path(x, y).h(gaps[0]).addTo(this);
		}
		if (this.canConnectDownline()) {
			new Path(x + gaps[0] + this.width, y+addToRightY).h(gaps[1]).addTo(this);
		}
		x += gaps[0];
	return x;
	}
}

export class TerminusNode extends AnchorableControl {
	public constructor(public type: string="complex", label?: string, title?: string, href?: string, public connected: boolean = true) {
		super(label, title, href);
		this.width = 20;
		this.height = 0;
		this.up = 10;
		this.down = 10;
		this.needsSpace = true; // false
		if(label) {
			this.label = ""+label;
			this.width = Math.max(20, this.label.length * Options.CHAR_WIDTH + 10);
		}
	}

	public format(x?: number,y?: number, width?: number): FakeSVG {
		if(this.label) {
			var text = new FakeSVG('text', this._formatTextElementAttr(x, y), this.label);
			if(this.href)
				new FakeSVG('a', {'xlink:href': this.href}, [text]).addTo(this);
			else
				text.addTo(this);
			if(this.title)
				new FakeSVG('title', {}, []).addTo(this);
		}
		return this;
	}

	protected _formatTextElementAttr(x: number, y: number): Object {
		return { x: x, y: y - 15, style: "text-anchor:start" };
	}
}

export class Start extends TerminusNode {
	public constructor(type: string="simple", label: string=undefined, href: string=undefined, connected:boolean=true) {
		super(type, label, undefined, href, connected);
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "start";
		}
	}

	public format(x?: number,y?: number, width?: number): FakeSVG {
		x = this._formatSides(x, y, width);
		let path = new Path(x, y-10);
		if (this.type === "complex") {
				path.downFn(20)
					.m(0, -10)
					.right(this.width)
					.addTo(this);
		} else {
				path.downFn(20)
					.m(10, -20)
					.downFn(20)
					.m(-10, -10)
					.right(this.width)
					.addTo(this);
		}
		return super.format(x, y, width);
	}

	public isEntrySupported(): boolean {
		return this.connected;
	}
}
funcs.Start = (...args)=>new Start(...args);

export class End extends TerminusNode {
	public constructor(type: string="simple", label: string=undefined, href: string=undefined, connected:boolean=true) {
		super(type, label, undefined, href, connected);
		this.width = 20; // restore it back
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "end";
		}
	}
	
	public format(x?: number,y?: number, width?: number): FakeSVG {
		x = this._formatSides(x, y, width);
		let path = new Path(x, y-10);
		if (this.type === "complex") {
			(<PathAttributes>path.attrs).d = 'M '+x+' '+y+' h 20 m 0 -10 v 20';
		} else {
			(<PathAttributes>path.attrs).d = 'M '+x+' '+y+' h 20 m -10 -10 v 20 m 10 -20 v 20';
		}
		path.addTo(this);
		return super.format(x, y, width);
	} 

	protected _formatTextElementAttr(x: number, y: number): object {
		return { x: x, y: y - 15, style: "text-anchor:start" }; // "text-anchor:end"
	}

	public isExitSupported(): boolean {
		return this.connected;
	}
}
funcs.End = (...args)=>new End(...args);

export class NonTerminusNode extends AnchorableControl {
	public constructor(label: string, public title?: string, href?: string, attr?: object) {
		super(label, title, href, attr);
		this._initialiseSizing();
	}

	protected _initialiseSizing(): void {
		this.width = this.label.length * Options.CHAR_WIDTH + 20; /* Assume that each char is .5em, and that the em is 16px */
		this.height = 0;
		this.up = 11;
		this.down = 11;
		this.needsSpace = true;
	}

	protected _formatAnchor(x: number, y: number, attr: object): FakeSVG {
		var text = new FakeSVG('text', attr, this.label);
		if (this.href)
			new FakeSVG('a', { 'xlink:href': this.href }, [text]).addTo(this);
		else
			text.addTo(this);
		if (this.title)
			new FakeSVG('title', {}, this.title).addTo(this);
		return this;
	}
}

export class Terminal extends NonTerminusNode {
	public constructor(label: string, public title: string=undefined, href: string=undefined) {
		super(label, title, href, {'class': 'terminal'});
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "terminal";
		}
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		x = this._formatSides(x, y, width);
		new FakeSVG('rect', {x:x, y:y-11, width:this.width, height:this.up+this.down, rx:10, ry:10}).addTo(this);
		this._formatAnchor(x, y, {x: x + this.width / 2, y: y + 4 });
		return this;
	}
}
funcs.Terminal = (l, ...args)=>new Terminal(l, ...args);

export class NonTerminal extends NonTerminusNode {
	public constructor(label: string, public title: string=undefined, href: string=undefined) {
		super(label, title, href, {'class': 'non-terminal'});
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "nonterminal";
		}
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		x = this._formatSides(x, y, width);
		new FakeSVG('rect', {x:x, y:y-11, width:this.width, height:this.up+this.down}).addTo(this);
		this._formatAnchor(x, y, {x: x + this.width / 2, y: y + 4});
		return this;
	}
}
funcs.NonTerminal = (l: string, ...args)=>new NonTerminal(l, ...args);

export class Comment extends NonTerminusNode {
	public constructor(label: string, public title: string=undefined, href: string=undefined) {
		super(label, title, href);
		// comments have different font/sizing ie. override initialiseSizing::width
		this.width = this.label.length * Options.COMMENT_CHAR_WIDTH + 10;
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "comment";
		}
	}

	public format(x?: number,y?: number,width?: number): FakeSVG {
		// Hook up the two sides if this is narrower than its stated width.
		x = this._formatSides(x, y, width, this.height);
		this._formatAnchor(x, y, {x:x+this.width/2, y:y+5, class:'comment'});
		return this;
	}
}
funcs.Comment = (l: string, ...args)=>new Comment(l, ...args);

export class Skip extends Control {
	public constructor() {
		super('g');
		this.needsSpace = false;
		if(Options.DEBUG) {
			this.attrs['data-updown'] = this.up + " " + this.height + " " + this.down;
			this.attrs['data-type'] = "skip";
		}
	}
	
	public format(x?: number, y?: number, width?: number): FakeSVG {
		new Path(x,y).right(width).addTo(this);
		return this;
	}
}
funcs.Skip = ()=>new Skip();

export class Block extends Control {
	public constructor(width=50, up=15, height=25, down=15, needsSpace=true) {
		super('g');
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

	public format(x?:number, y?: number, width?: number): FakeSVG {
		// Hook up the two sides if this is narrower than its stated width.
		var gaps = determineGaps(width, this.width);
		new Path(x,y).h(gaps[0]).addTo(this);
		new Path(x+gaps[0]+this.width,y).h(gaps[1]).addTo(this);
		x += gaps[0];
		new FakeSVG('rect', {x:x, y:y-this.up, width:this.width, height:this.up+this.height+this.down}).addTo(this);
		return this;
	}
}
funcs.Block = (...args)=>new Block(...args);

export function unnull(...args: any): any {
	// Return the first value that isn't undefined.
	// More correct than `v1 || v2 || v3` because falsey values will be returned.
	return args.reduce(function(sofar, x) { return sofar !== undefined ? sofar : x; });
}

export function determineGaps(outer: number, inner: number): number[] {
	var diff = outer - inner;
	switch(Options.INTERNAL_ALIGNMENT) {
		case 'left': return [0, diff];
		case 'right': return [diff, 0];
		default: return [diff/2, diff/2];
	}
}

export function makeTerminalIfString(value: Component|string): Component {
		return value instanceof Component ? value : new Terminal(""+value);
}

export function sum(iter, func): any {
	if(!func) func = function(x) { return x; };
	return iter.map(func).reduce(function(a,b){return a+b}, 0);
}

export function max(iter, func): any {
	if(!func) func = function(x) { return x; };
	return Math.max.apply(null, iter.map(func));
}

export function SVG(name: string, attrs?: Object, text?: string): any {
	attrs = attrs || {};
	text = text || '';
	var el = document.createElementNS("http://www.w3.org/2000/svg", name);
	for(var attr in attrs) {
		if(attr === 'xlink:href')
			el.setAttributeNS("http://www.w3.org/1999/xlink", 'href', attrs[attr]);
		else
			el.setAttribute(attr, attrs[attr]);
	}
	el.textContent = text;
	return el;
}

export function escapeString(str: string): string {
	// Escape markdown and HTML special characters
	return str.replace(/[*_\`\[\]<&]/g, function(charString) {
		return '&#' + charString.charCodeAt(0) + ';';
	});
}