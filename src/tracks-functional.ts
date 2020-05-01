import funcs from './tracks-model.js';

// function casts to support @jsc pragma
let TrackDiagram = (...a) => funcs.TrackDiagram(...a);
let Diagram = (...a) => funcs.Diagram(...a);
let ComplexDiagram = (...a) => funcs.ComplexDiagram(...a);
let Sequence = (...a) => funcs.Sequence(...a);
let Stack = (...a) => funcs.Stack(...a);
let OptionalSequence = (...a) => funcs.OptionalSequence(...a);
let AlternatingSequence = (...a) => funcs.AlternatingSequence(...a);
let Choice = (...a) => funcs.Choice(...a);
let HorizontalChoice = (...a) => funcs.HorizontalChoice(...a);
let MultipleChoice = (...a) => funcs.MultipleChoice(...a);
let Optional = (...a) => funcs.Optional(...a);
let OneOrMore = (...a) => funcs.OneOrMore(...a);
let Group = (...a) => funcs.Group(...a);
let ZeroOrMore = (...a) => funcs.ZeroOrMore(...a);
let Start = (...a) => funcs.Start(...a);
let End = (...a) => funcs.End(...a);
let Terminal = (...a) => funcs.Terminal(...a);
let NonTerminal = (...a) => funcs.NonTerminal(...a);
let Comment = (...a) => funcs.Comment(...a);
let Skip = (...a) => funcs.Skip(...a);
let Block = (...a) => funcs.Block(...a);

export function evalScript(script: string): any {
  return eval(script);
}