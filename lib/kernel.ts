// var Message = require("jmp").Message; // IPython/Jupyter protocol message
// var Socket = require("jmp").Socket; // IPython/Jupyter protocol socket
// var zmq = require("jmp").zmq; // ZMQ bindings

import {Message, Socket} from "jmp";
import * as zeromq from "zeromq";
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

export interface JupyterConnection {
  signature_schema: string
  key: string
  ip: string
  hb_port: number
  shell_port: number
  control_port: number
  iopub_port: number
}

export interface KernelConfig {
  connection: JupyterConnection
  workingDir: string
  debug: boolean
  kernelInfo: any
  protocolVersion: string
}

export class Kernel {
  constructor(public config: KernelConfig) {
    if (this.majorVersion !== "5") {
      throw new Error("jp-ts-kernel currently only supports jupyter protocol version 5");
    }

    this._bindSockets();
    this._initSession();
  }

  scheme = this.config.connection.signature_schema.slice("hmac-".length);
  heartbeatSocket = zeromq.createSocket("rep");
  ioPubSocket = new Socket("pub", this.scheme, this.config.connection.key);
  shellSocket = new Socket("router", this.scheme, this.config.connection.key);
  controlSocket = new Socket("router", this.scheme, this.config.connection.key);
  executionCount = 0;
  majorVersion = this.config.protocolVersion.split(".")[0];

  tsHost = (function() {

  })

  tsConfigFilePath = ts.findConfigFile(this.config.workingDir, fs.existsSync);
  tsConfig = ts.readConfigFile(this.tsConfigFilePath, (p) => fs.readFileSync(p, "utf-8"));
  tsHost = this.tsConfig.error ? null : ts.createCompilerHost(this.tsConfig.config);
  formatHost: ts.FormatDiagnosticsHost = {
    getCurrentDirectory() {
      return this.config.workingDir;
    },
    getCanonicalFileName(fileName: string) {
      return path.relative(this.config.workingDir, fileName);
    },
    getNewLine() {
      return "\n";
    }
  };

  logDebug(...parts: any[]) {
    if (!process.env["DEBUG"]) return;

    console.log("KERNEL (DEBUG):", ...parts);
  }

  logWarning(...parts: any[]) {
    console.warn("KERNEL (WARN):", ...parts);
  }

  logError(e: Error) {
    console.error("KERNEL (ERROR):", e.message, e.stack);
  }

  logDiagnostic(d: ts.Diagnostic) {
    let message = ts.formatDiagnostics([d], this.formatHost);

    switch (d.category) {
      case 2:
        this.logDebug(message);
      case 1:
        console.error("KERNEL (ERROR):", message);
      case 0:
      default:
        this.logWarning(message);
    }
  }


  onHeartbeat = (msg: Message) => {
    this.logDebug("heartbeat");
    this.heartbeatSocket.send(msg);
  };

  onShellMessage = (msg: Message) => {
    try {
      this.logDebug("received msg", msg.header.msg_type);

      switch (msg.header.msg_type) {
        case "a":
          break;
        default:
          this.logWarning("Unhandled message type", msg.header.msg_type);
      }
    } catch (e) {
      this.logError(e);
    }
  };

  onControlMessage = (msg: Message) => {
    try {
      switch (msg.header.msg_type) {
        case "shutdown_request":
          // call shutdown here
          break;
        default:
        // log the thing
      }
    } catch (e) {
      // log the error
    }
  };

  private _bindSockets() {
    let config = this.config;
    var address = "tcp://" + config.connection.ip + ":";

    this.heartbeatSocket.on("message", this.onHeartbeat);
    this.shellSocket.on("message", this.onShellMessage);
    this.controlSocket.on("message", this.onControlMessage);

    this.heartbeatSocket.bindSync(address + config.connection.hb_port);
    this.shellSocket.bindSync(address + config.connection.shell_port);
    this.controlSocket.bindSync(address + config.connection.control_port);
    this.ioPubSocket.bindSync(address + config.connection.iopub_port);
  }

  private _initSession() {

  }

  close(cb: () => void) {
    this.logWarning("Kernel shutting down");

    // TODO(NR) Handle socket `this.stdin` once it is implemented

    this.controlSocket.removeAllListeners();
    this.shellSocket.removeAllListeners();
    this.heartbeatSocket.removeAllListeners();
    this.ioPubSocket.removeAllListeners();

    // this.session.kill("SIGTERM", function(code, signal) {
    //   if (destroyCB) {
    //     destroyCB(code, signal);
    //   }
    //
    //   this.controlSocket.close();
    //   this.shellSocket.close();
    //   this.iopubSocket.close();
    //   this.hbSocket.close();
    // }.bind(this));
  }
}