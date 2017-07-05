{ pkgs ? import <nixpkgs> { inherit system; },
  system ? builtins.currentSystem,
  nodejs ? pkgs.nodejs,
  packages }:

let
  npmConfig = {
    inherit pkgs;
    inherit system;
    inherit nodejs;
  };

  getNpmPkgs = with pkgs; let
    buildPackagesLock = stdenv.mkDerivation rec {
      name = "npm-env";
      buildInputs = [ nodePackages.node2nix ];
      packagesJson = builtins.toJSON packages;
      packagesFile = builtins.toFile "package.json" packagesJson;

      phases = [ "buildPhase" "installPhase" ];

      buildPhase = ''
        mkdir opt
        cd opt
        node2nix -6 -i $packagesFile
      '';
      installPhase = ''
        mkdir $out
        mv ./* $out/
        echo "built again in $out"
      '';
    }; in
      import "${buildPackagesLock}";


  npmpkgs = getNpmPkgs npmConfig;
in

[ nodejs ] ++ (builtins.attrValues npmpkgs)
