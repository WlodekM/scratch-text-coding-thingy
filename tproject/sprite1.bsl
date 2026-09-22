#include <"blocks/js" "base.js">

fn test_fn(a, b, c) {
	looks_say(b)
}

gf {
	control_wait(1)
	var test = "a"
	for var test2 in 4 {
		looks_say(test2)
		control_wait(1)
		test_fn(3, 2, 1)
	}
}