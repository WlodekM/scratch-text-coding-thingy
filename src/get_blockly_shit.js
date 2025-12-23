const _global = (new Function('return this'))()

_global.Blockly = {}
_global.goog = {
	require(){},
	provide(p){
		// console.debug('\t\b', `${p} = {};`)
		eval(`${p} = {};`)
	},
	math: {},
	isString(s) {return typeof s === 'string'},
	isFunction(f) {return typeof f === 'function'},
	isObject: function(val) {
		var type = typeof val;
		return type == 'object' && val != null || type == 'function';
		// return Object(val) === val also works, but is slower, especially if val is
		// not an object.
	},
	isArray: a=>Array.isArray(a),
	inherits(a, b) {return a.prototype instanceof b},
	string: {
		// Copyright 2006 The Closure Library Authors. All Rights Reserved.
		//
		// Licensed under the Apache License, Version 2.0 (the "License");
		// you may not use this file except in compliance with the License.
		// You may obtain a copy of the License at
		//
		//      http://www.apache.org/licenses/LICENSE-2.0
		//
		// Unless required by applicable law or agreed to in writing, software
		// distributed under the License is distributed on an "AS-IS" BASIS,
		// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
		// See the License for the specific language governing permissions and
		// limitations under the License.
		isEmptyOrWhitespace: function(str) {
			// testing length == 0 first is actually slower in all browsers (about the
			// same in Opera).
			// Since IE doesn't include non-breaking-space (0xa0) in their \s character
			// class (as required by section 7.2 of the ECMAScript spec), we explicitly
			// include it in the regexp to enforce consistent cross-browser behavior.
			return /^[\s\xa0]*$/.test(str);
		}
	}
}

function thing(name, i) {
	// console.log(name)
}

thing('constants',		await import('../tw-blocks/core/constants.js'))
thing('utils',			await import('../tw-blocks/core/utils.js'))
thing('events',			await import('../tw-blocks/core/events.js'))
thing('block',			await import('../tw-blocks/core/block.js'))
thing('blocks',			await import('../tw-blocks/core/blocks.js'))
thing('extensions',		await import('../tw-blocks/core/extensions.js'))
thing('msg',			await import('../tw-blocks/core/msg.js'))
thing('field_dropdown',	await import('../tw-blocks/core/field.js'))
// thing('field_dropdown',	await import('../tw-blocks/core/field_dropdown.js'))
// Blockly.FieldDropdown.superClass_ = {}
// Blockly.FieldDropdown.superClass_.costructor = ()=>{}//Blockly.FieldDropdown
Blockly.FieldDropdown = class {}

// console.log('done')

_global.Blockly.ScratchBlocks = _global.Blockly
const fakeWorkspace = {
    blockDB_:{},
    addTopBlock(){},
    options:{}
}
_global.Blockly.mainWorkspace = fakeWorkspace
Blockly.Constants = {}

/** @type {await import('../tw-blocks/core/blockly.js')} */
export default _global.Blockly
