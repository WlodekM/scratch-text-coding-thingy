// idk about this one tbh

gf {
	sprite::hide()
	control_foever() {
		control_wait_until(sensing_mousedown())
		sprite::clone()
		control_wait_until(!sensing_mousedown())
	}
}

control_start_as_clone() {
    var initialY = sprite::position::y
    var timer = 0
    sprite::show()
    control_forever() {
        timer += 1
        sprite::position::y = operator_mathop("sin", timer * 10) * 10 + initialY
    }
}
