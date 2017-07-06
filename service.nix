{ pkgs ? import <nixpkgs> { inherit system; },
  system ? builtins.currentSystem,
  jptsDir ? "./",
  nodejs ? pkgs.nodejs }:

let
  deps = with pkgs.python35Packages; [ jupyter_core notebook ];
  pynb = pkgs.python.buildEnv.override {
    extraLibs = deps;
    ignoreCollisions = true;
  };
in

with pkgs;
stdenv.mkDerivation rec {
  name = "jp-ts-notebook";
  buildInputs = [ ];

  phases = ["installPhase"];

  jupyterConfig = pkgs.writeText "jupyter_config.py" ''
    c.KernelSpecManager.whitelist = { "jp-ts" }
    # c.NotebookApp.disable_check_xsrf = True
    c.NotebookApp.token = ""
  '';

  runScript = pkgs.substituteAll {
    name = "jptsbook";
    src = ./jptsbook.sh;
    isExecutable = true;
    inherit pynb jupyterConfig jptsDir;
  };

  installPhase = ''
    mkdir -p $out/bin
    cp $runScript $out/bin/jptsbook
  '';
}


