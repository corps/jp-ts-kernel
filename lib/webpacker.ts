import webpack = require("webpack");
import MemoryFs = require("memory-fs");
import * as fs from "fs";
import * as path from "path";

export class Webpacker {
  constructor(public workingDir: string) {
  }

  run(entry: string, content: string) {
    let fullEntryPath = path.resolve(this.workingDir, entry);
    this.fs.memoryFs.mkdirpSync(path.dirname(fullEntryPath));
    this.fs.memoryFs.writeFileSync(fullEntryPath, content);

    let compiler = new webpack.Compiler();

    compiler.outputFileSystem = this.fs;
    (compiler as any).inputFileSystem = this.fs;

    compiler.options = {
      entry: fullEntryPath,
      output: {
        path: path.resolve(this.workingDir, "build"),
        filename: "built.js",
      },
      devtool: "source-map",
      context: this.workingDir,
    };

    compiler.options

    return new Promise<string>((resolve, reject) => {
      compiler.run((err, stats) => {
        if (stats.hasErrors()) {
          reject(stats.toString());
        }
        if (err) {
          console.error(err, err.stack);
          reject(err);
        } else {
          try {
            resolve(this.fs.memoryFs.readFileSync(path.resolve(this.workingDir, "build/built.js"), "utf-8"));
          } catch (e) {
            reject(e);
          }
        }
      });
    })
  }

  fs = createCellFs();
}

function createCellFs() {
  let memoryFs = new MemoryFs();
  const result = {memoryFs};
  const config = result as any;

  config.existsSync = function (_path: string): boolean {
    return memoryFs.existsSync(_path) || fs.existsSync(_path);
  };

  ["mkdirSync", "mkdirpSync", "rmdirSync", "unlinkSync", "writeFileSync", "createWriteStream",
    "writeFile", "mkdirp", "rmdir", "unlink", "mkdir", "join", "pathToArray", "normalize"].forEach(methodName => {
    config[methodName] = function () {
      console.error("calling", methodName, "on memoryFs", [].slice.call(arguments));
      return (memoryFs as any)[methodName].apply(memoryFs, arguments);
    }
  });

  ["statSync", "readFileSync", "readdirSync", "readlinkSync", "createReadStream", "exists",
    "stat", "readdir", "readlink", "readFile"].forEach(methodName => {
    config[methodName] = function (path: string) {
      console.error("calling", methodName, "on fs / memoryFs", [].slice.call(arguments));
      if (memoryFs.existsSync(path)) return (memoryFs as any)[methodName].apply(memoryFs, arguments);
      return (fs as any)[methodName].apply(fs, arguments);
    }
  });

  return result;
}
