#include <"blocks/js" "base.js">

fn test_fn() {
	looks_say("uh")
}

gf {
	control_wait(1)
	var test = "a"
	for var test2 in 4 {
		looks_say(test)
		control_wait(1)
		test_fn()
	}
}