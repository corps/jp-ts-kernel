import * as assert from "assert";

import {CellScript, LanguageServiceHost} from "../lib/typescript-host";

describe("LanguageServiceHost", () => {
  let host: LanguageServiceHost;
  beforeEach(() => {
    host = new LanguageServiceHost(__dirname + "/../");
  });

  it("can compile cell scripts, detect updates, and cross reference each other", (done: Function) => {
    let script1 = new CellScript(0);
    let script2 = new CellScript(1);

    script1.update(`
      import * as fs from "fs";
      import { two } from "./two-script";
      
      fs.readFile
      let v:number = 1;
      console.log(v, two);
    `);

    script2.update(`
      // two-script
      export let two = 2;
    `);

    host.updateScript(script2);
    host.updateScript(script1);

    host.compileScript(script1).then(result => {
      assert.equal(result.entry, "cell/0.tsx");
      assert.deepEqual(Object.keys(result.contents).sort(), ["cell/0.js"]);
    }).then(() => done(), (e) => done(e));
  });

  it("can codeComplete", (done: Function) => {
    let script1 = new CellScript(0);
    let script2 = new CellScript(1);

    script1.update(`
      import * as fs from "fs";
      import { tw } from "./two-script";
      
      fs.readFile
      let v:number = 1;
      console.log(v, two);
    `);

    script2.update(`
      // two-script
      export let two = 2;
    `);

    host.updateScript(script2);
    host.updateScript(script1);

    host.codeComplete(script1, script1.contents.indexOf("{ tw") + 2).then(result => {
      assert.deepEqual(result, {cursorStart: 48, cursorEnd: 50, textMatches: ['two']});
    }).then(() => done(), (e) => done(e));
  });

  it("can inspect", (done: Function) => {
    let script1 = new CellScript(0);
    let script2 = new CellScript(1);

    script1.update(`
      import * as fs from "fs";
      import { two } from "./two-script";
      
      fs.readFile
      let v:number = 1;
      console.log(v, two);
    `);

    script2.update(`
      // two-script
      export let two = 2;
    `);

    host.updateScript(script2);
    host.updateScript(script1);

    host.inspect(script1, script1.contents.indexOf("readFile") + 1).then(result => {
      assert.deepEqual(result, {details: "function readFile(filename: string, encoding: string, callback: (err: NodeJS.ErrnoException, data: string) => void): void (+3 overloads)"});
    }).then(() => done(), (e) => done(e));
  });
});