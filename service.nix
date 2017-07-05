{ pkgs ? import <nixpkgs> { inherit system; },
  system ? builtins.currentSystem,
  nodejs ? pkgs.nodejs }:

let
  deps = with pkgs.python35Packages; [ notebook jupyter_core ];
  pynb = pkgs.python.buildEnv.override {
    extraLibs = deps;
    ignoreCollisions = true;
  };
in

with pkgs;
stdenv.mkDerivation {
  name = "jp-ts-notebook";
  buildInputs = [ ];

  phases = ["installPhase"];

  runScript = pkgs.substituteAll {
    name = "jptsbook";
    src = ./jptsbook.sh;
    isExecutable = true;
    inherit pynb;
  };

  installPhase = ''
    mkdir -p $out/bin
    cp $runScript $out/bin/jptsbook
  '';
}


