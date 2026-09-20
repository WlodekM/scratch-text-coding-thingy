// class Meow {
// 	count = 0
// 	foo = "bar"
// 	increment() {
// 		this::set_prop("count", this::get_prop("count") + 1)
// 	}
// 	constructor(string) {
// 		this::set_prop("foo", string)
// 	}
// } // size: 2
//
// gf {
// 	var meow1 = new Meow("maow")
// 	var meow2 = new Meow("second")
// 	meow1::increment()
// 	meow2::increment()
// 	meow1::increment()
// 	looks_sayforsecs(meow1::get_prop("count"), 1) // should be 2
// 	looks_sayforsecs(meow2::get_prop("count"), 1) // should be 1
// }

list __Meow__instances = {}
var __Meow__instance = 0 // holds the index when running __Meow__new
fn __Meow__new(string) {
	__Meow__instance = __Meow__instances::length() + 1
	__Meow__instances::push(0)
	__Meow__instances::push("bar")
	__Meow__instances::replace(__Meow__instance + 1, string)
}
fn __Meow_increment(this) {
	__Meow__instances::replace(this + 0, __Meow__instances::at(this + 0) + 1)
}

gf {
	__Meow__new("maow")
	var meow1 = __Meow__instance
	__Meow__new("second")
	var meow2 = __Meow__instance
	__Meow_increment(meow1)
	__Meow_increment(meow2)
	__Meow_increment(meow1)
	looks_sayforsecs(__Meow__instances::at(meow1 + 0), 1) // should be 2
	looks_sayforsecs(__Meow__instances::at(meow2 + 0), 1) // should be 1
}
