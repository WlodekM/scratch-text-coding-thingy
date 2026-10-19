# v2 TO-DO

## need to do

### to-do
 - [ ] feilds in extension blocks dont work
 - [ ] clean up v1 stuff (put necessary stuff for retro mode in a legacy/ folder)
    + [ ] (eventually) remove retro mode
 - [ ] documentation
    + [ ] document bsl (based on wiki but update)
	+ [ ] document target.trg.yaml
 - [ ] examples
    + [ ] pong

### in-progress
 - [ ] check block type (command/reporter)

### done



## not necessary but maybe do

### to-do
 - [ ] possibly make it decode blocks and modify/stingify as backslash them
 - [ ] fix penguinmod control_expandableIf without the jank fix in asttoblocks2
 - [ ] add support for project.prj.ymal?
 - [ ] better compat with penguinmod types and other language features (object, array, lambda, oop)
    + [ ] make "extensions" for tshv2 and preprocessor
    + [ ] add an optional field for variable type in scratchoop Variable
    + [ ] ads type casting (for lists and such)
    + [ ] add arrays and objects
       * [ ] add array literal
       * [ ] add object literal
       * [ ] add array accessor
       * [ ] add object accessor
    + [ ] add lambda support
       * [ ] add lambda syntax
       * [ ] implement it in preprocessor
       * [ ] (maybe) make it the primary mechanism for functions
    + [ ] add scoped vars with `local` or something

### in-progress

### done



## backlog (do but later)

### to-do
 - [ ] LSP
 - [ ] OOP
    + [ ] ```[14:22]amy: i should make a mechanism for like picking between "backends" for more advanced language features
          [14:22]amy: so that i could add a backend that uses lists and custom blocks for oop in vanilla scratch
          [14:22]amy: and one that uses classes and objects in
          [14:22]amy: non vanilla```

### in-progress

### done
