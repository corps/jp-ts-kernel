import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

export interface CompileResult {
  entry: string
  contents: { [k: string]: string };
}

export interface CompletionResult {
  textMatches: string[],
  cursorStart: number
  cursorEnd: number
}

export interface InspectResult {
  details: string
}

export class LanguageServiceHost implements ts.LanguageServiceHost {
  getCompilationSettings(): ts.CompilerOptions {
    let options = {} as ts.CompilerOptions;

    options.target = ts.ScriptTarget.ES5;
    options.allowUnusedLabels = true;
    options.allowUnreachableCode = true;
    options.alwaysStrict = true;
    options.charset = "utf-8";
    options.jsx = ts.JsxEmit.React;
    options.moduleResolution = ts.ModuleResolutionKind.NodeJs;
    options.module = ts.ModuleKind.CommonJS;
    options.noImplicitAny = true;
    options.noImplicitThis = true;
    options.noEmitOnError = true;

    return options;
  }

  getScriptFileNames(): string[] {
    return Object.keys(this.scripts);
  }

  getScriptVersion(fileName: string): string {
    if (fileName in this.scripts) {
      return this.scripts[fileName].version + "";
    }

    let stats = fs.statSync(fileName);
    return stats.mtime.getTime() + "";
  }

  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | any {
    if (fileName in this.scripts) {
      return ts.ScriptSnapshot.fromString(this.scripts[fileName].contents);
    }

    if (!fs.existsSync(fileName)) {
      return undefined;
    }

    return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, "utf-8"));
  }

  getCurrentDirectory(): string {
    return this.workingDir;
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return "lib.d.ts";
  }

  dispose() {
    this.service.dispose();
  }

  constructor(public workingDir: string) {
  }

  scripts = {} as { [k: string]: CellScript };
  docRegistry = ts.createDocumentRegistry(false, this.workingDir);
  service = ts.createLanguageService(this, this.docRegistry);
  formatHost = new FormatDiagnosticsHost(this.workingDir);

  addScript(script: CellScript) {
    this.scripts[script.tmpFileName] = script;
    return script;
  }

  compileScript(script: CellScript): Promise<CompileResult> {
    return new Promise<CompileResult>((resolve, reject) => {
      if (!(script.tmpFileName in this.scripts)) {
        reject(new Error("Attempted to run cell " + script.cellCounter + " but it did not exist in the current service"));
        return;
      }

      let output = this.service.getEmitOutput(script.tmpFileName);

      if (output.emitSkipped) {
        let allDiagnostics = this.service.getCompilerOptionsDiagnostics()
                                 .concat(this.service.getSyntacticDiagnostics(script.tmpFileName))
                                 .concat(this.service.getSemanticDiagnostics(script.tmpFileName));

        reject(new Error(ts.formatDiagnostics(allDiagnostics, this.formatHost)));
        return;
      }

      let result = {entry: script.tmpFileName, contents: {}} as CompileResult;

      output.outputFiles.forEach(file => {
        result.contents[file.name] = file.text;
      });

      resolve(result);
    })
  }

  codeComplete(script: CellScript, cursor: number): Promise<CompletionResult> {
    return new Promise<CompletionResult>((resolve, reject) => {
      if (!(script.tmpFileName in this.scripts)) {
        throw new Error("Attempted to complete cell " + script.cellCounter + " but it did not exist in the current service");
      }

      let span = this.service.getQuickInfoAtPosition(script.tmpFileName, cursor).textSpan;
      let completions = this.service.getCompletionsAtPosition(script.tmpFileName, cursor);

      let result = {
        cursorStart: span.start,
        cursorEnd: span.start + span.length,
        textMatches: []
      } as CompletionResult;

      for (let completion of completions.entries) {
        if (completion.replacementSpan) continue;
        result.textMatches.push(completion.name);
      }

      resolve(result);
    })
  }

  inspect(script: CellScript, cursor: number): Promise<InspectResult> {
    return new Promise((resolve, reject) => {
      let info = this.service.getQuickInfoAtPosition(script.tmpFileName, cursor);
      resolve({details: info.documentation.map(d => d.text).join(" ")});
    });
  }
}

export class FormatDiagnosticsHost implements ts.FormatDiagnosticsHost {
  constructor(public workingDir: string) {
  }

  getCurrentDirectory() {
    return this.workingDir;
  }

  getCanonicalFileName(fileName: string) {
    return path.relative(this.workingDir, path.resolve(this.workingDir, fileName));
  }

  getNewLine() {
    return "\n";
  }
}

export class CellScript {
  constructor(public cellCounter: number) {
  }

  tmpFileName = "cell/" + this.cellCounter + ".tsx";
  version = 0;
  contents = "";

  update(contents: string) {
    this.contents = contents;
    this.version++;
  }
}

