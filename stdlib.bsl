fn reset() {
	stdlib.split.result::clear()
}

list stdlib.split.result = {}
//// split into every letter
fn split_letters(str) {
	stdlib.split.result::clear()
	var stdlib.split._i = 0
	control_for_each("stdlib.split._i", str::str_length()) {
		stdlib.split.result::push(str::letter(stdlib.split._i))
	}
}

//// split with delimiter
fn split_letters(str, delimiter) {
	stdlib.split.result::clear()
	var stdlib.split._i = 0
	var stdlib.split._buffer = ""
	control_for_each("stdlib.split._i", str::str_length()) {
		stdlib.split.result::push(str::letter(stdlib.split._i))
	}
}
