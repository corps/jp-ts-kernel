{ pkgs ? import <nixpkgs> { inherit system; },
  system ? builtins.currentSystem,
  nodejs ? pkgs.nodejs }:

let
  npmInputs = import ./npm-env.nix {
    inherit pkgs system nodejs;
    packages = [
      "typescript" 
      "typing"
      { "mocha" = "3"; }
    ];
  };
in

with pkgs;
stdenv.mkDerivation {
  name = "jp-ts-kernel";
  buildInputs = npmInputs ++ [ zeromq (import ./service.nix {}) ];
}
