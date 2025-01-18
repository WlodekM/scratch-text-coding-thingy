<p align="center">
  <img src="https://raw.githubusercontent.com/WlodekM/scratch-text-coding-thingy/6e4d8510902923624ef47b27a8bedf9f1fa0ca42/assets/SLTLCC2.svg" style="width:40%">
  &nbsp;&nbsp;
  <img src="https://raw.githubusercontent.com/WlodekM/scratch-text-coding-thingy/6e4d8510902923624ef47b27a8bedf9f1fa0ca42/assets/SLTLCC.svg" style="width:40%">
</p>
<p align="right">
  <img src="https://raw.githubusercontent.com/WlodekM/scratch-text-coding-thingy/0fb09eddfabf59b6963c60ecc93f5227209d090a/assets/TJI.svg" style="width:5%">
</p>
<h3 align="center"><b>Scratch-Like Trans-Language Cross-Compiler</b></h3>
<p align="right"><i>- a tosh-like programming language with no pronounceable acronym</i></p>
<p align="center">
  <img src="https://img.shields.io/github/contributors-anon/WlodekM/scratch-text-coding-thingy">
  <img src="https://img.shields.io/github/directory-file-count/WlodekM/scratch-text-coding-thingy">
  <img src="https://img.shields.io/github/commit-activity/t/WlodekM/scratch-text-coding-thingy">
  <img src="https://img.shields.io/badge/yes-ff9900">
</p>

## About SLTLCC
**SLTLCC**, or *Scratch-Like Trans-Language Cross-Compiler*, allows you to convert text-based code into Scratch-compatible blocks. It injects its own programming language into Scratch-compatible projects, expanding the possibilities for coding with a text-based language instead of block-based Scratch editing.
### How to Use SLTLCC
1. Edit the `project.prj.yaml` file to configure your project settings. This file includes settings for sprites, backgrounds, and more.
2. Run `deno task run` to compile your project into a Scratch 3 (.sb3) project file.
    * If you're on a Linux system, you can run deno task run-and-open to compile your project and automatically open TurboWarp (TW) with the compiled project.
    * If you just want to open a compiled SB3 file, run deno task open to launch TurboWarp with the current project SB3 file.
## How SLTLCC Works
SLTLCC uses a variety of files and tools to convert your text-based code into Scratch blocks:

* `jsontypes.ts` contains definitions for the types of data used in SB3 files;
* `main.ts` is the main file that assembles the project JSON and runs the code conversion process for each sprite;
* `asttoblocks.ts` is responsible for converting the parsed text code into Scratch blocks;
* The `tshv2/` directory contains tools for parsing the text code.
## Contributing to SLTLCC
Yes.
