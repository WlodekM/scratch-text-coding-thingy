#include <"blocks/js" "base.js">
#include <"extension" "https://extensions.turbowarp.org/box2d.js">

// func_redefine(penis, "fnc_helper('looks_say', [literal_helper('penis')])")

list test = {
	1 2 3
}
global list glist = {"um""meow""yea"}
var testvar = 123
global var gvar = "woskpafsfk;l"

warp fn test_fn(a, b, c) {
	looks_say(b)
}

on penis_broadcast {
	looks_say("penis!!!")
}

gf {
	// penis()
	event_broadcast("penis_broadcast")
    griffpatch_setStage("floor")
	control_wait(1)
	control_if_else(false) {
		looks_say("this should never be ran")
	} {
		looks_say("meow")
	}
	glist::push("penis")

	var test = "a"
	for var test2 in 4 {
		looks_say(test2)
		control_wait(1)
		test_fn(3, 2, 1)
	}
}