import { DiagramParser } from "./railroad-ascii-parser";

let source = `
<-     "test1 ->" [H] {F} @arw [{G} "s]-" ] @arw "test 2" @dbg (?A|B|C?) [<- A B ->] { A B | C } @dbg /"this is \\|a comment|http://google.com"/ -> @esc$ <"$terminal"> x @esc\\ y z
`;

let parser = new DiagramParser(source);
let x = parser.parse();
console.log(x.toString());