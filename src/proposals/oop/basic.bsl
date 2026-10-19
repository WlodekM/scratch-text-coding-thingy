class Object {
	var x = 0
	var y = 0
	list z = { 1 2 3 }
	fn meow() {
		this::z::push(this::x + this::y)
		var sum = 0
		for var i in this::z::length {
			sum += this::z::at(i)
		}
		return = sum
	}
}

gf {
	var thing = new Object
	looks_say(thing::meow())
}

