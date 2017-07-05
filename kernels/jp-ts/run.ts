import {Kernel} from "../../lib/kernel";
if (!process.env.DEBUG) {
  console.log = function () {
  }
}

import * as fs from "fs";
import * as path from "path";

let workingDir = process.argv[1] || process.cwd();
let connectionFile = process.argv[2];

if (!connectionFile || !fs.existsSync(connectionFile)) {
  throw new Error("Could not find connection file " + connectionFile);
}

let connection = JSON.parse(fs.readFileSync(connectionFile, "utf-8"));

let kernel = new Kernel({workingDir, connection});
