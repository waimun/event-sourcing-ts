{
  description = "Node 24 development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      system = "aarch64-darwin";
      pkgs = import nixpkgs { inherit system; };
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = [
          pkgs.nodejs_24
          pkgs.git
        ];

        shellHook = ''
          echo "Node.js environment loaded with Git support."
        '';
      };
    };
}