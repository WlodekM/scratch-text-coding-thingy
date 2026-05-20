#include <"blocks/js" "../../tw-blocks/blocks_vertical/looks.js">
#include <"blocks/js" "../../tw-blocks/blocks_vertical/operators.js">
#include <"blocks/js" "../../tw-blocks/blocks_vertical/event.js">
// #include <"blocks/js" "base.js">

gf {
	var percentage_iron = 0
	var drop_iron = 0.12
	var drop_flint = 0.25
	var flint = 0
	var gravel = 1
	var iron = 0

	for i in 10 {
		iron = gravel * drop_iron
		percentage_iron += drop_iron
		flint = gravel * drop_flint
		gravel = flint
	}
	looks_say(5+7)
}
