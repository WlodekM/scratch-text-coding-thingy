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

### step uno

edit project.prj.yaml

it is the project config

coole

haz sprite configuration n stuff

wow

in that u can specify code for sprites

uh yea

code for sprites is in .bsl/.tsh files but like use whatever extension you want i dont care

### step duo

run `deno task run` to make the project sb3 (this one works on windows)

or run `deno task run-and-open` to open tw with that project after compiling (linux only bc fuck windowse)

or run `deno task open` to open the current project sb3 (also only linux i think)

### done

hooraye


## how dis worx

uh types for stuffs in sb3 r in `jsontypes.ts`

`main.ts` makes the project json and runs the code conversion for every sprite

`asttoblocks.ts` converts text code to blocks

`tshv2/` has stuff for parsing teh text code


## wow dis is AWESUMSAUCE can i contribut?

ye

#### p.s.
this is barney86. i am sorry, i sadly could not stop wlodekm from making this unreadable
