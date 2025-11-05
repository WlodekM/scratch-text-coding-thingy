# berry's shitty guide to project.json

so like, project.json
its a json

it has like 4 keys: some metadata stuff (`meta`), extension stuff (`extensions`, `extensionURLs`) and the most important of them - targets

targets is an array containing data for every sprite in the project
they mostly follow the same format that being
```jsonc
{
	"name": "the name of the sprite",
	"isStage": true, // <-- a boolean for if the sprite is the stage or not
	"lists": {}, // <-- object for the lists (the key is the id and the value is [the name, value (array)])
	"variables": {}, // <-- object for teh variables (same format except the value is string or number
	"broadcasts": {}, // <-- honestly dont know how the format here works since im just relying on the vm's ability to generate broadcasts from blocks
	"costumes": [
		{
			"assetId": "16 bytes in hex form which might be the hash of the asset??",
			"dataFormat": "svg", // ["png", "svg", "jpeg", "jpg", "bmp", "gif"]
			"bitmapResolution": 1, // uhhhhh i think this is two for bitmaps because one bitmap pixel is actually two pixels
			"md5ext": "(id).svg",
			"name": "the costume name",
			"rotationCenterX": 0, // self-explanatory
			"rotationCenterY": 0
		}
	],
	"blocks": {}, //we'll get into this later
	"currentCostume": 0, // index of the current costume
	"sounds": [ // array of the sounds
		{
			"name": "the sound's name",
			"assetId": "ditto the costume equivalent",
			"dataFormat": "wav", // one of ["wav", "wave", "mp3"]
			"format": "", // no fucking idea
			"rate": 44100, // yeah
			"sampleCount": 1032, // sound shit idfk
			"md5ext": "(id).wav"
		}
	],
	"volume": 100, // self-explanatory
	"layerOrder": 0, // layer
	"tempo": 60, // mhm, the tempo
	"videoTransparency": 50, // this is boring
	"videoState": "on" // you get what this is youre not stupid (i hope)
}
```

the properties are mostly self-explanatory except for `"blocks"`

this property is an object where the key is the block's id and the value is the block data

the block data can be one of two formats: an array, or an object

the array format is used for stuff like empty inputs, variables and lists

there is a rable for how this format works over on [scratch wiki](https://www.en.scratch-wiki.info/wiki/Scratch_File_Format#Blocks)

---

now onto the object format

```jsonc
"c": {
	"opcode": "data_addtolist", // the opcode (aka id) of the block
	"next": "d", // the block on the bottom of this one (if it's a reporter) (set to null if nothing)
	"parent": "b", // the parent of this block (set to null if top-level)
	"inputs": { // the inputs of the block!
		"ITEM": [
			1, // iirc this thing dictates whether you can disconnect the input or not
			[ // format same as the array blocks!!
				10,
				"meow"
			]
		],
		"LIST": [
			1,
			"g" // this input has the block "g" in it
			// normally thered be an array block after the block id which would show up when you disconnected the block but it is actually unnecessary
		]
	},
	"fields": { // key-value object of all the fields ( [something v] inputs ) of the lbock
		"LIST": [
			"a-test", // the id
			"test", // the name
			"list" // the type
		]
	},
	"shadow": false, // shadow blocks are ones that can't be taken out of their parent block, such as inputs or arguments on custom block definitions (those ones have custom logic allowing you to duplicate them)
	"topLevel": false // whether the block is connected to something (false) or not (true)
}
```

custom block definitions have some weird logic, let's look into that
```jsonc
{
// ...
"r": {
	"opcode": "argument_reporter_string_number",
	"next": null,
	"parent": "p",
	"inputs": {},
	"fields": {
		"VALUE": [
			"size",
			null
		]
	},
	"shadow": true,
	"topLevel": false
},
"q": {
	"opcode": "procedures_definition",
	"next": "s",
	"parent": null,
	"inputs": {
		"custom_block": [
			1,
			"p"
		]
	},
	"fields": {},
	"shadow": false,
	"topLevel": true,
	"x": 0,
	"y": 0
},
"p": {
	"opcode": "procedures_prototype",
	"next": null,
	"parent": "q",
	"inputs": {
		"Bujz},g9uR`cg1!CCr54": [
			1,
			"r"
		]
	},
	"fields": {},
	"shadow": true,
	"topLevel": false,
	"mutation": {
		"tagName": "mutation",
		"children": [],
		"proccode": "heapthing._expand_heap %s",
		"argumentids": "[\"Bujz},g9uR`cg1!CCr54\"]",
		"argumentnames": "[\"size\"]",
		"argumentdefaults": "[\"\"]",
		"warp": "false" // whether this block runs without screen refresh or not
	}
},
// ...
}
```
