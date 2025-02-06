<h3 align="center"><b>backslash</b></h3>
<p align="right"><i>- a tosh-like programming language with a stupid name</i></p>
<p align="center">
  <img src="https://img.shields.io/github/contributors-anon/WlodekM/scratch-text-coding-thingy">
  <img src="https://img.shields.io/github/directory-file-count/WlodekM/scratch-text-coding-thingy">
  <img src="https://img.shields.io/github/commit-activity/t/WlodekM/scratch-text-coding-thingy">
  <img src="https://img.shields.io/badge/yes-ff9900">
</p>

## whart
**backslash** allows you to convert text-based code into Scratch-compatible blocks. It injects its own programming language into Scratch-compatible projects, expanding the possibilities for coding with a text-based language instead of block-based Scratch editing.

TL;DR: use text code 2 maek scratch project

also the top text might be incorrect the person who wrote it has never used this tool

it is designed for deno but it will probably work on other runtimes, maybe even in browser with some adjustments

## how

### step one - dependencies

make sure you have [deno](https://deno.com/) installed

### step two - project setup

make a folder for your project

in that folder make a `project.prj.yaml` file, the contents of it should be something like this

```yaml
sprites:
  stage:
    stage: true
    name: Stage
    costumes:
      backdrop1:
        format: svg
        path: assets/empty.svg
    sounds:
    code: null
  sprite1:
    name: Main
    code: main.bsl # this is the file containing the code for this sprite
    costumes:
      costume1:
        format: svg
        path: assets/cat_dango.svg
```

it has the settings for your project

### step three - writing the code

i'd recommend including base.js first, it has the base scratch blocks

```bsl
#include <"blocks/js" "base.js">
```

i'd also recommend using the vscode extension if you're using that

### step four - building the project

to build the project run `deno -A /path/to/backslash/main.ts .` if you're running this from project directory or `deno -A main.ts /path/to/project/directory/` if you're running this from the backslash directory

after that a `project.sb3` should pop up in the project folder, this is your built project, you can edit it in scratch/tw/[other fork] but it's not recommended

## where stuff is in the code

uh types for stuffs in sb3 r in `jsontypes.ts`

`main.ts` makes the project json and runs the code conversion for every sprite

`asttoblocks.ts` converts text code to blocks

`tshv2/` has stuff for parsing teh text code


## wow dis is AWESUMSAUCE can i contribut?

ye

#### p.s.
this is barney86. i am sorry, i sadly could not stop wlodekm from making this unreadable
