<h3 align="center"><b>backslash</b></h3>
<p align="right"><i>- a tosh-like programming language with a stupid name</i></p>
<p align="center">
  <img src="https://img.shields.io/github/contributors-anon/WlodekM/scratch-text-coding-thingy">
  <img src="https://img.shields.io/github/directory-file-count/WlodekM/scratch-text-coding-thingy">
  <img src="https://img.shields.io/github/commit-activity/t/WlodekM/scratch-text-coding-thingy">
  <img src="https://img.shields.io/badge/yes-ff9900">
</p>

## whart
**backslash** allows you to make scratch projects with text code

it is designed for deno but it will probably work on other runtimes, maybe even in browser with some adjustments

## how

### step zero - bsl

bsl is the programming language made for backslash

there is documentation for it [here](https://github.com/WlodekM/scratch-text-coding-thingy/wiki)

### step one - dependencies

make sure you have [deno](https://deno.com/) installed

download/clone the source code into some folder, if you have git installed you can run `git clone -r https://github.com/WlodekM/scratch-text-coding-thingy.git`

and if you're downloading the zip from git hub, make sure to put [TurboWarp's scratch-blocks](https://github.com/TurboWarp/scratch-blocks) in the `tw-blocks` folder

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

---

btw if you like this tool thingy please star the repo and if youre in the tw discord [dango the post](https://discord.com/channels/837024174865776680/1330150950786043925)

## where stuff is in the code

uh types for stuffs in sb3 r in `jsontypes.ts`

`main.ts` makes the project json and runs the code conversion for every sprite

`asttoblocks.ts` converts text code to blocks

`tshv2/` has stuff for parsing teh text code


## wow dis is AWESUMSAUCE can i contribut?

ye

note: do `git submodule update --init --recursive` to add `tw-blocks` and `tw-vm` also do `yarn install` ig

#### p.s.
this is barney86. i am sorry, i sadly could not stop wlodekm from making this unreadable
