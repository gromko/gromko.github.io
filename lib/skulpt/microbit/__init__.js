var microphone = function(name) {
	
	var mod = {};
	mod.level = 0;
	mod.events = [];
	mod.thresholds = {
		loud: 128,
		quiet: 50
	}
	
	mod.current_event = new Sk.builtin.func(function() {
		return mod.SoundEvent.QUIET;
	});

	mod.was_event = new Sk.builtin.func(function(event) {
		var result = false;
		for(var i = 0; i < mod.events.length; i++) {
			if(mod.events[i] == event) {
				result = true;
				break;
			}
		}
		mod.events = [];
		updateMicEventList();
		return Sk.ffi.remapToPy(result);
	});

	mod.get_events = new Sk.builtin.func(function() {
		var events = new Sk.builtin.tuple(mod.events);
		mod.events = [];
		updateMicEventList();
		return events;
	});

	mod.sound_level = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(mod.level);
	});

	function updateMicEventList() {
		var html = '';
		for(var i = 0; i < mod.events.length; i++) {
			html += mod.events[i]._name + " ";
		}
		$('#mb_mic_event_list').html(html);

	}

	mod._setValue = function(jsVal) {
		mod.level = jsVal;
		var lastEvent = undefined;
		if(mod.events.length > 0) {
			lastEvent = mod.events[mod.events.length - 1];
		}
		if(mod.level > mod.thresholds.loud) {
			if(lastEvent != mod.SoundEvent.LOUD) {
				mod.events.push(mod.SoundEvent.LOUD);
				updateMicEventList();
			}
		} else {
			if(mod.level > mod.thresholds.quiet && lastEvent != mod.SoundEvent.QUIET) {
				mod.events.push(mod.SoundEvent.QUIET);
				updateMicEventList();
			}
		}

	}

	mod.updateThresholds = function() {
		$('#mb_mic_slider_volume').css({'background-image': 'linear-gradient(90deg, green, orange, orange ' 
		+ Math.floor(mod.thresholds.quiet * 100 / 255) + '%, orange, red '
		+ Math.floor(mod.thresholds.loud * 100 / 255) + '%)'});
	}

	mod.set_threshold = new Sk.builtin.func(function(event, value) {
		value = Sk.ffi.remapToJs(value);
		if(value > 255 || value < 0) {
			throw new Sk.builtin.ValueError("Threshold must be between 0 and 255");
		}
		if(event == mod.SoundEvent.LOUD) {
			mod.thresholds.loud = value;
		}
		if(event == mod.SoundEvent.QUIET) {
			mod.thresholds.quiet = value;
		}
	});
	return mod;
}

var speaker = function(name) {
	var mod = {};
	mod.volume = 127;
	mod._on = true;
	mod.off = new Sk.builtin.func(function() {
		$('#mb_speaker_enabled').text('disabled');
		mod._on = false;
	});

	mod.on = new Sk.builtin.func(function() {
		$('#mb_speaker_enabled').text(mod.volume);
		mod._on = true;
	});
	return mod;
}

var uart = function(name) {
	var mod = {};
	var init = function(baudrate, bits, parity, stop, tx, rx) {
		if(baudrate === undefined)
			baudrate = Sk.ffi.remapToPy(9600);
		if(bits === undefined)
			bits = Sk.ffi.remapToPy(8);
		if(parity === undefined)
			parity = Sk.builtin.none;
		if(stop === undefined)
			stop = Sk.ffi.remapToPy(1);
		if(tx === undefined)
			tx = Sk.builtin.none;
		if(rx === undefined)
			rx = Sk.builtin.none;
	}

	init.co_varnames = ['baudrate', 'bits', 'parity', 'stop', 'tx', 'rx'];
	init.$defaults = [Sk.ffi.remapToPy(9600), Sk.ffi.remapToPy(8), Sk.builtin.none, Sk.ffi.remapToPy(1), Sk.builtin.none, Sk.builtin.none];
	init.co_numargs = 6;
	mod.init = new Sk.builtin.func(init);

	mod.any = new Sk.builtin.func(function() {
		return Sk.builtin.bool(false);
	});

	var read = function(n) {
	}

	read.co_varnames = ['n'];
	read.$defaults = [Sk.ffi.remapToPy(0)];
	read.co_numargs = 1;
	mod.read = new Sk.builtin.func(read);

	mod.readall = new Sk.builtin.func(function() {

	});

	var readinto = function(buf, nbytes) {

	}
	readinto.co_varnames = ['buf', 'nbytes'];
	readinto.$defaults = [Sk.builtin.none, Sk.ffi.remapToPy(0)];
	readinto.co_num_args = 2;
	mod.readinto = new Sk.builtin.func(readinto);

	mod.readline = new Sk.builtin.func(function() {
		return Sk.builtin.none;
	});

	mod.write = new Sk.builtin.func(function(buf) {

	});


	return mod;
}

var spi = function(name) {
	var mod = {};

	var read = function(nbytes){
		data = [];
		for(var i = 0; i < Sk.ffi.remapToJs(nbytes); i++) {
			data.push(0);
		}
		return Sk.ffi.remapToPy(data);
	};

	mod.read = new Sk.builtin.func(read);

	var write = function(buffer){
	};
	mod.write = new Sk.builtin.func(write);

	var init = function(baudrate, bits, mode, sclk, mosi, miso) {
	}

	init.co_varnames = ["baudrate", "bits", "mode", "sclk", "mosi", "miso"]
	init.$defaults = [Sk.ffi.remapToPy(1000000), Sk.ffi.remapToPy(8), Sk.ffi.remapToPy(0), Sk.builtin.none, Sk.builtin.none, Sk.builtin.none];
	init.co_numargs = 6;
	mod.init = new Sk.builtin.func(init);
	
	return mod;
};

var i2c = function(name) {
	var mod = {};

	var read = function(addr, n, repeat){
		if(repeat === undefined) {
			repeat = new Sk.builtin.bool(false);
		}
		data = [];
		for(var i = 0; i < Sk.ffi.remapToJs(n); i++) {
			data.push(0);
		}
		return Sk.ffi.remapToPy(data);
	};

	read.co_varnames = ['addr', 'n', 'repeat'];
	read.$defaults = [Sk.builtin.none, Sk.builtin.none, Sk.builtin.bool(false)];
	read.co_numargs = 3;
	mod.read = new Sk.builtin.func(read);

	var write = function(addr, buf, repeat){
		if(repeat === undefined) {
			repeat = new Sk.builtin.bool(false);
		}
	};
	write.co_varnames = ['addr','buf', 'repeat'];
	write.$defaults = [Sk.builtin.none, Sk.builtin.none, Sk.builtin.bool(false)];
	write.co_numargs = 3;
	mod.write = new Sk.builtin.func(write);

	var init = function(freq, sda, scl) {
	}

	init.co_varnames = ["freq", "sda", "scl"]
	init.$defaults = [Sk.ffi.remapToPy(100000), Sk.builtin.none, Sk.builtin.none];
	init.co_numargs = 3;
	mod.init = new Sk.builtin.func(init);
	
	mod.scan = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy([]);
	});
	
	return mod;
};

var compass = function(name) {
	var mod = {};
	mod.data = {calibrated: false,
				x: 0,
				y: 0,
				z: 0,
				heading: 0,
				strength: 0
				};


	mod.calibrate = new Sk.builtin.func(function() {
		//PythonIDE.python.output("Calibration complete\n");
		mod.data.calibrated = true;
	});

	mod.is_calibrated = new Sk.builtin.func(function() {
		return new Sk.builtin.bool(mod.data.calibrated);
	});

	mod.clear_calibration = new Sk.builtin.func(function() {
		mod.data.calibrated = false;
	});

	mod.get_x = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(mod.data.x);
	});

	mod.get_y = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(mod.data.y);
	});

	mod.get_z = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(mod.data.z);
	});

	mod.heading = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(mod.data.heading);
	});

	mod.get_field_strength = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(mod.data.strength);
	});

	return mod;
};

var accelerometer = function(name) {

	var mod = {}

	mod.data = {};
	mod.data.x = 0;
	mod.data.y = 0;
	mod.data.z = 0;
	mod.data.gestureHistory = [];
	mod.data.currentGesture = "";
	mod.data.updateGestureList = function updateGestureList() {
		var html = mod.data.gestureHistory.join(" ") + ' <span class="mb_current_gesture">' + mod.data.currentGesture + '</span>';
		$('#mb_gesture_list').html(html);
	}

	mod.get_x = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(mod.data.x);
	});

	mod.get_y = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(mod.data.y);
	});

	mod.get_z = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(mod.data.z);
	});

	mod.get_values = new Sk.builtin.func(function() {
		return new Sk.builtin.tuple([mod.data.x, mod.data.y, mod.data.z]);
	});

	mod.current_gesture = new Sk.builtin.func(function() {
		return new Sk.builtin.str(mod.data.currentGesture);
	});

	mod.is_gesture = new Sk.builtin.func(function(gesture) {
		return new Sk.builtin.bool(gesture.v == mod.data.currentGesture);
	});

	mod.was_gesture = new Sk.builtin.func(function(gesture) {
		for(var i = 0; i < mod.data.gestureHistory.length; i++) {
			if(mod.data.gestureHistory == gesture.v) {
				mod.data.gestureHistory.splice(i, 1);
				mod.data.updateGestureList();
				return Sk.builtin.bool(true);
			}
		}
		return new Sk.builtin.bool(false);
	});

	mod.get_gestures = new Sk.builtin.func(function() {
		var gestures = mod.data.gestureHistory.slice();
		mod.data.gestureHistory = [];
		mod.data.updateGestureList();
		return new Sk.builtin.tuple(Sk.ffi.remapToPy(gestures));
	});

	return mod;
}

var display = function(name) {
	var leds = [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]];
	var letters = {
		A: [" 99  ",
			"9  9 ",
			"9999 ",
			"9  9 ",
			"9  9 "],

		B: ["999  ",
			"9  9 ",
			"999  ",
			"9  9 ",
			"999  "],

		C: [" 9999",
			"9    ",
			"9    ",
			"9    ",
			" 9999"],

		D: ["9999 ",
			"9   9",
			"9   9",
			"9   9",
			"9999 "],

		E: ["99999",
			"9    ",
			"99999",
			"9    ",
			"99999"],

		F: ["99999",
			"9    ",
			"9999 ",
			"9    ",
			"9    "],

		G: [" 9999",
			"9    ",
			"9  99",
			"9   9",
			" 9999"],

		H: ["9   9",
			"9   9",
			"99999",
			"9   9",
			"9   9"],

		I: [" 999 ",
			"  9  ",
			"  9  ",
			"  9  ",
			" 999 "],

		J: ["99999",
			"  9  ",
			"  9  ",
			"  9  ",
			"99   "],

		K: ["9  9 ",
			"9 9  ",
			"99   ",
			"9 9  ",
			"9  9 "],

		L: ["9    ",
			"9    ",
			"9    ",
			"9    ",
			"99999"],

		M: [" 9 9 ",
			"9 9 9",
			"9   9",
			"9   9",
			"9   9"],

		N: ["9   9",
			"99  9",
			"9 9 9",
			"9  99",
			"9   9"],

		O: [" 999 ",
			"9   9",
			"9   9",
			"9   9",
			" 999 "],

		P: ["9999 ",
			"9   9",
			"9999 ",
			"9    ",
			"9    "],

		Q: [" 999 ",
			"9   9",
			"9 9 9",
			"9  9 ",
			" 99 9"],

		R: ["9999 ",
			"9   9",
			"9999 ",
			"9 9  ",
			"9  9 "],

		S: ["99999",
			"9    ",
			"99999",
			"    9",
			"99999"],

		T: ["99999",
			"  9  ",
			"  9  ",
			"  9  ",
			"  9  "],

		U: ["9   9",
			"9   9",
			"9   9",
			"9   9",
			" 999 "],

		V: ["9   9",
			"9   9",
			" 9 9 ",
			" 9 9 ",
			"  9  "],

		W: ["9   9",
			"9   9",
			"9   9",
			"9 9 9",
			" 9 9 "],

		X: ["9   9",
			" 9 9 ",
			"  9  ",
			" 9 9 ",
			"9   9"],

		Y: ["9   9",
			" 9 9 ",
			"  9  ",
			" 9   ",
			"9    "],

		Z: ["99999",
			"   9 ",
			"  9  ",
			" 9   ",
			"99999"],



		a:	[" 999 ",
			 "    9",
			 " 9999",
			 "9   9",
			 " 9999"],

		b: [" 9   ",
			" 9   ",
			" 999 ",
			" 9  9",
			" 999 "],

		c: ["     ",
			"     ",
			" 9999",
			"9    ",
			" 9999"],

		d: ["    9",
			"    9",
			" 9999",
			"9   9",
			" 999 "],

		e: [" 99  ",
			"9  9 ",
			"9999 ",
			"9    ",
			" 999 "],

		f: ["  99 ",
			" 9   ",
			" 999 ",
			" 9   ",
			" 9   "],

		g: [" 999 ",
			"9   9",
			" 999 ",
			"   9 ",
			" 99  "],

		h: ["9    ",
			"9    ",
			"9999 ",
			"9   9",
			"9   9"],

		i: [" 9   ",
			"     ",
			" 9   ",
			" 9   ",
			" 9   "],

		j: ["   9 ",
			"     ",
			"   9 ",
			"   9 ",
			"  9  "],

		k: ["9    ",
			"9    ",
			"9 9  ",
			"99   ",
			"9 9  "],

		l: ["  9  ",
			"  9  ",
			"  9  ",
			"  9  ",
			"  9  "],

		m: ["     ",
			"99 9 ",
			"9 9 9",
			"9   9",
			"9   9"],

		n: ["     ",
			" 99  ",
			"9  9 ",
			"9  9 ",
			"9  9 "],

		o: ["     ",
			" 999 ",
			"9   9",
			"9   9",
			" 999 "],

		p: ["     ",
			"999  ",
			"9  9 ",
			"999  ",
			"9    "],

		q: ["     ",
			" 9999",
			"9   9",
			" 9999",
			"    9"],

		r: ["     ",
			" 999 ",
			"9    ",
			"9    ",
			"9    "],

		s: [" 999 ",
			"9    ",
			" 999 ",
			"    9",
			"9999 "],

		t: [" 9   ",
			"999  ",
			" 9   ",
			" 9   ",
			"  99 "],

		u: ["     ",
			"9   9",
			"9   9",
			"9   9",
			" 999 "],

		v: ["     ",
			"     ",
			"9   9",
			" 9 9 ",
			"  9  "],

		w: ["     ",
			"     ",
			"9 9 9",
			" 9 9 ",
			" 9 9 "],

		x: ["     ",
			"9  9 ",
			" 99  ",
			" 99  ",
			"9  9 "],

		y: ["     ",
			"9  9 ",
			" 99  ",
			"  9  ",
			"99   "],

		z: ["     ",
			"9999 ",
			"  9  ",
			" 9   ",
			"9999 "],

		"0": [" 999 ",
			  "99  9",
			  "9 9 9",
			  "9  99",
			  " 999 "],

		"1": [" 9   ",
			  "99   ",
			  " 9   ",
			  " 9   ",
			  "999  "],

		"2": [" 999 ",
		   	  "9   9",
			  "   9 ",
			  "  9  ",
			  " 9999"],

		"3": [" 999 ",
			  "9   9",
			  "   9 ",
			  "9   9",
			  " 999  "],

		"4": ["   9 ",
			  "  99 ",
			  " 9 9 ",
			  "99999",
			  "   9 "],

		"5": ["99999",
			  "9    ",
			  "9999 ",
			  "    9",
			  "9999 "],

		"6": [" 999 ",
			  "9    ",
			  "9999 ",
			  "9   9",
			  " 999 "],

		"7": ["99999",
			  "   9 ",
			  "  9  ",
			  " 9   ",
			  "9    "],

		"8": [" 999 ",
			  "9   9",
			  " 999 ",
			  "9   9",
			  " 999 "],

		"9": [" 999 ",
			  "9  9 ",
			  " 999 ",
			  "   9 ",
			  "  9  "],

		'!':	["  9  ",
			     "  9  ",
			     "  9  ",
			     "     ",
			     "  9  "],
		'"':	[" 9 9 ",
			     " 9 9 ",
			     "     ",
			     "     ",
			     "     "],

		'£':	["   99",
			     "  9  ",
			     " 9999",
			     " 9   ",
			     "9 999"],

		'$':	[" 9999",
			     "9 9  ",
			     " 999 ",
			     "  9 9",
			     "9999 "],

		'%':	["99  9",
			     "99 9 ",
			     "  9  ",
			     " 9 99",
			     "9  99"],

		'^':	["  9  ",
			     " 9 9 ",
			     "     ",
			     "     ",
			     "     "],

		'&':	[" 999 ",
			     " 9 9 ",
			     " 99  ",
			     "9  9 ",
			     " 99 9"],

		'*':	["9 9 9",
			     " 999 ",
			     "9 9 9",
			     " 999 ",
			     "9 9 9"],
		'(':	["  9  ",
			     " 9   ",
			     " 9   ",
			     " 9   ",
			     "  9  "],

		')':	["  9  ",
			     "   9 ",
			     "   9 ",
			     "   9 ",
			     "  9  "],

		'[':	[" 999 ",
			     " 9   ",
			     " 9   ",
			     " 9   ",
			     " 999 "],

		']':	[" 999 ",
			     "   9 ",
			     "   9 ",
			     "   9 ",
			     " 999 "],

		'{':	["  99 ",
			     " 9   ",
			     "  9  ",
			     " 9   ",
			     "  99 "],

		'}':	[" 99  ",
			     "   9 ",
			     "  9  ",
			     "   9 ",
			     " 99  "],

		'@':	[" 999 ",
			     "9   9",
			     "9 999",
			     "9 9 9",
			     "99999"],

		"'":	["  9  ",
			     "     ",
			     "     ",
			     "     ",
			     "     "],

		'~':	["     ",
			     " 99 9",
			     "   9 ",
			     "     ",
			     "     "],

		':':	["     ",
			     "  9  ",
			     "     ",
			     "  9  ",
			     "     "],

		'#':	[" 9 9 ",
			     "99999",
			     " 9 9 ",
			     "99999",
			     " 9 9 "],

		'/':	["    9",
			     "   9 ",
			     "  9  ",
			     " 9   ",
			     "9    "],

		'\\':	["9    ",
			     " 9   ",
			     "  9  ",
			     "   9 ",
			     "    9"],

		'?':	["9999 ",
			     "   9 ",
			     "  99 ",
			     "     ",
			     "  9  "],

		'.':	["     ",
			     "     ",
			     "     ",
			     "     ",
			     "  9  "],

		',':	["     ",
			     "     ",
			     "     ",
			     "   9 ",
			     "  9  "],

		'<':	["   9 ",
			     "  9  ",
			     " 9   ",
			     "  9  ",
			     "   9 "],

		'>':	[" 9   ",
			     "  9  ",
			     "   9 ",
			     "  9  ",
			     " 9   "],

		' ':	["     ",
			     "     ",
			     "     ",
			     "     ",
			     "     "],

		'-':	["     ",
			     "     ",
			     "99999",
			     "     ",
			     "     "],

		'+':	["  9  ",
			     "  9  ",
			     "99999",
			     "  9  ",
			     "  9  "],

		'_':	["     ",
			     "     ",
			     "     ",
			     "     ",
			     "99999"],


		'=':	["     ",
			     "99999",
			     "     ",
			     "99999",
			     "     "],



	};

	function setLED(x, y, brightness) {
		$('.mb_led.mb_led_row_' + y + '.mb_led_col_' + x).removeClass('mb_led_brightness_1 mb_led_brightness_2 mb_led_brightness_3 mb_led_brightness_4 mb_led_brightness_5 mb_led_brightness_6 mb_led_brightness_7 mb_led_brightness_8 mb_led_brightness_9').addClass('mb_led_brightness_' + brightness);

		leds[y][x] = brightness;
	}

	var mod = {};

	var backgroundAnimation;

	mod.get_pixel = new Sk.builtin.func(function(x, y) {
		return Sk.ffi.remapToPy(parseInt(leds[y.v][x.v]));
	});

	mod.set_pixel = new Sk.builtin.func(function(x, y, brightness) {
		setLED(parseInt(x.v), parseInt(y.v), parseInt(brightness.v));
	});

	mod.clear = new Sk.builtin.func(function() {
		clearScreen();
	});

	function clearScreen() {
		var x,y;
		for(x = 0; x < 5; x++) {
			for(y = 0; y < 5; y++) {
				setLED(x, y, 0);
			}
		}
	}

	var show = function(image, delay, wait, loop, clear) {
		if(backgroundAnimation) {
			clearTimeout(backgroundAnimation);
		}
		if(wait === undefined)
			wait = Sk.builtin.bool(true);

		if(loop === undefined)
			loop = Sk.builtin.bool(false);

		if(clear === undefined)
			clear = Sk.builtin.bool(false);

		if(delay === undefined)
			delay = Sk.ffi.remapToPy(400);

		if(image.tp$name == "number") {
			throw new Sk.builtin.TypeError("Convert the number to a string before showing it");
			image = new Sk.builtin.str(image.v);
		}


		return PythonIDE.runAsync(function(resolve, reject) {
			if(image && (image.tp$name == "list" || (image.tp$name == "tuple") || (image.tp$name == "str" && image.v.length > 1))) {
				var i = 0;

				function showNextFrame() {
					if(backgroundAnimation) {
						clearTimeout(backgroundAnimation);
					}
					if(i >= image.v.length) {
						if(loop.v) {
							i = 0;
						} else {
							if(clear.v) {
								clearScreen();
							}
							if(wait.v) {
								resolve();
							}
							return;
						}

					}

					if(image.v[i].tp$name == "Image") {
						for(y = 0; y < 5; y++) {
							for(x = 0; x < 5; x++) {
								setLED(x, y, image.v[i].lines[y][x]);
							}
						}
					}
					if(image.tp$name == "str") {
						showCharacter(image.v[i]);
					}

					if(image.v[i].tp$name == "str") {
						showCharacter(image.v[i].v[0]);
					}

					i++;
					backgroundTimeout = setTimeout(showNextFrame, delay.v)
				}

				showNextFrame();


				if(!wait.v) {
					resolve();
				}


			} else {

				if(image.tp$name == "Image") {
					for(y = 0; y < 5; y++) {
						for(x = 0; x < 5; x++) {
							setLED(x, y, image.lines[y][x]);
						}
					}
				}
				if(image.tp$name == "str") {
					showCharacter(image.v[0]);
				}
				resolve();
			}
		});

	}
	show.co_varnames = ['image', 'delay', 'wait', 'loop', 'clear'];
	show.$defaults = [Sk.builtin.none, Sk.ffi.remapToPy(400), Sk.ffi.remapToPy(true), Sk.ffi.remapToPy(false), Sk.ffi.remapToPy(false)];
	show.co_numargs = 5;
	mod.show = new Sk.builtin.func(show);

	function showCharacter(c) {
		var x, y;
		var rows = ['', '', '', '', ''];

		var letter = letters[" "];
		if(letters.hasOwnProperty(c)) {
			letter = letters[c];
		}
		for(y = 0; y < 5; y++) {
			for(x = 0; x < 5; x++) {
				setLED(x, y, letter[y][x]);
			}
		}

	}

	function scroll(message, delay, wait, loop, monospace) {
		
		function doScroll(resolve, reject) {
			var msg = " " + Sk.ffi.remapToJs(message) + " ";
			var i, x, y;
			var rows = ['', '', '', '', ''];
			for(i = 0; i < msg.length; i++) {
				var currentLetter = msg[i];

				var letter = letters[" "];
				if(letters.hasOwnProperty(currentLetter)) {
					letter = letters[currentLetter];
				}

				for(y = 0; y < 5; y++) {
					rows[y] += letter[y] + " ";
				}
			}

			var width = rows[0].length;
			var offset = 0;


			function showScroll() {
				mod._scrolling = true;
				for(y = 0; y < 5; y++) {
					for(x = offset; x < offset + 5; x++) {
						setLED(x - offset, y, rows[y][x]);
					}
				}
				if(backgroundAnimation) {
					clearTimeout(backgroundAnimation);
				}
				if(offset < width - 5) {
					offset++;
					backgroundAnimation = setTimeout(showScroll, delay.v / 2);
				} else {

					if(loop.v) {
						offset = 0;
						backgroundAnimation = setTimeout(showScroll, delay.v / 2);
					} else {
						mod._scrolling = false;

						resolve();	
					}
					
				}
			}

			showScroll();
			if(!wait.v) {
				resolve();
			}
		}
		if(mod._scrolling) {
			if(wait.v) {
				return PythonIDE.runAsync(function(resolve, reject) {
					var c;
					function checkAgain() {
						if(!mod._scrolling) {
							clearInterval(c);
							doScroll(resolve, reject);
						}
					}
					c = setInterval(checkAgain, 200);
				});
			}
			return;
		}
		
		return PythonIDE.runAsync(doScroll);
	}
	scroll.co_varnames = ['text', 'delay', 'wait', 'loop', 'monospace'];
	scroll.$defaults = [Sk.builtin.none, Sk.ffi.remapToPy(150), Sk.ffi.remapToPy(true), Sk.ffi.remapToPy(false), Sk.ffi.remapToPy(false)];
	scroll.co_numargs = 2;
	mod.scroll = new Sk.builtin.func(scroll);
	mod._on = true;
	mod.off = new Sk.builtin.func(function() {
		mod._on = false;
	});
	
	mod.on = new Sk.builtin.func(function() {
		mod._on = true;
	});

	
	mod.is_on = new Sk.builtin.func(function() {
		return new Sk.builtin.bool(mod._on);
	});


	return mod;
}



var $builtinmodule = function (name) {
	// microbit module


    var mod = {
    	data: {temperature: 23}
	};

	mod.panic = new Sk.builtin.func(function(n) {
		PythonIDE.python.output("Panic mode: " + n.v);
	});

	mod.reset = new Sk.builtin.func(function() {
		start_time = Date.now();
		throw new Sk.builtin.NotImplementedError("Reset not implemented in simulator");
		// not implemented yet
	});

	mod.temerature = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(23);
	});

	mod.running_time = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(Date.now() - start_time);
	});

	var start_time = Date.now();

	mod.sleep = new Sk.builtin.func(function(delay) {
		return PythonIDE.runAsync(function(resolve, reject) {
			setTimeout(function() {
				resolve();
			}, delay.v);
		});
	});

	mod.temperature = new Sk.builtin.func(function() {
		return Sk.ffi.remapToPy(mod.data.temperature);
	});

	var SoundEvent =  new Sk.misceval.buildClass(mod, function($gbl, $loc) {
		$loc.__init__ = new Sk.builtin.func(function(self, name) {
			self._name = name;
		});
	}, "SoundEvent", []);
	SoundEvent.LOUD = Sk.misceval.callsim(SoundEvent, 'loud');
	SoundEvent.QUIET = Sk.misceval.callsim(SoundEvent, 'quiet');
	mod.SoundEvent = SoundEvent;

	var ioPinDigital = new Sk.misceval.buildClass(mod, function($gbl, $loc) {
		$loc.__init__ = new Sk.builtin.func(function(self) {
			self.value = 0;
		});

		$loc.read_digital = new Sk.builtin.func(function(self){
			return Sk.ffi.remapToPy(self.value);
		});

		$loc.write_digital = new Sk.builtin.func(function(self, value){
			self.value = value.v == 1? 1: 0;
			PythonIDE.python.updateMicrobitPins();
		});
	}, "MicroBitDigitalPin", []);

	mod.pin5 = Sk.misceval.callsim(ioPinDigital);
	mod.pin6 = Sk.misceval.callsim(ioPinDigital);
	mod.pin7 = Sk.misceval.callsim(ioPinDigital);
	mod.pin8 = Sk.misceval.callsim(ioPinDigital);
	mod.pin9 = Sk.misceval.callsim(ioPinDigital);
	mod.pin11 = Sk.misceval.callsim(ioPinDigital);
	mod.pin12 = Sk.misceval.callsim(ioPinDigital);
	mod.pin13 = Sk.misceval.callsim(ioPinDigital);
	mod.pin14 = Sk.misceval.callsim(ioPinDigital);
	mod.pin15 = Sk.misceval.callsim(ioPinDigital);
	mod.pin16 = Sk.misceval.callsim(ioPinDigital);
	mod.pin19 = Sk.misceval.callsim(ioPinDigital);
	mod.pin20 = Sk.misceval.callsim(ioPinDigital);

	var ioPinAnalog = new Sk.misceval.buildClass(mod, function($gbl, $loc) {
		$loc.__init__ = new Sk.builtin.func(function(self) {
			self.value = 0;
			self.period_us = 35;
		});
		
		$loc.read_digital = new Sk.builtin.func(function(self){
			return Sk.ffi.remapToPy(self.value);
		});

		$loc.write_digital = new Sk.builtin.func(function(self, value){
			self.value = value.v == 1? 1: 0;
			PythonIDE.python.updateMicrobitPins();
		});

		$loc.read_analog = new Sk.builtin.func(function(self) {
			return Sk.ffi.remapToPy(self.value);
		});

		$loc.write_analog = new Sk.builtin.func(function(self, value) {
			self.value = value.v;
			PythonIDE.python.updateMicrobitPins();
		});

		$loc.set_analog_period = new Sk.builtin.func(function(self, period) {
			self.period_us = period.v * 1000;
			PythonIDE.python.updateMicrobitPins();
		});

		$loc.set_analog_period_microseconds = new Sk.builtin.func(function(self, period) {
			self.period_us = period.v;
			PythonIDE.python.updateMicrobitPins();
		});

	}, "MicroBitAnalogPin", []);
	mod.pin3 = new ioPinAnalog();
	mod.pin4 = new ioPinAnalog();
	mod.pin10 = new ioPinAnalog();
	mod.pin_speaker = new ioPinAnalog();

	var ioPinTouch = new Sk.misceval.buildClass(mod, function($gbl, $loc) {
		/// TODO: check actual values
		$loc.CAPACITIVE = Sk.ffi.remapToPy(1);
		$loc.RESISTIVE = Sk.ffi.remapToPy(2);
		$loc.__init__ = new Sk.builtin.func(function(self) {
			self.touched = false;
			self.value = 0;
			self.period_us = 35;
		});

		$loc.set_touch_mode = new Sk.builtin.func(function(self, mode) {
			// TODO - store mode (if necessary for simulator?)
		});
		
		$loc.read_digital = new Sk.builtin.func(function(self){
			return Sk.ffi.remapToPy(self.value);
		});

		$loc.write_digital = new Sk.builtin.func(function(self, value){
			self.value = value.v == 1? 1: 0;
			PythonIDE.python.updateMicrobitPins();
		});

		$loc.is_touched = new Sk.builtin.func(function(self) {
			if(self.pressed !== undefined) {
				self.touched = self.pressed;
			}
			return Sk.builtin.bool(self.touched);
		});

		$loc.read_analog = new Sk.builtin.func(function(self) {
			return Sk.ffi.remapToPy(self.value);
		});

		$loc.write_analog = new Sk.builtin.func(function(self, value) {
			self.value = value.v;
			PythonIDE.python.updateMicrobitPins();
		});

		$loc.set_analog_period = new Sk.builtin.func(function(self, period) {
			self.period_us = period.v * 1000;
			PythonIDE.python.updateMicrobitPins();
		});

		$loc.set_analog_period_microseconds = new Sk.builtin.func(function(self, period) {
			self.period_us = period.v;
			PythonIDE.python.updateMicrobitPins();
		});
	}, "MicroBitTouchPin", []);

	mod.pin0 = Sk.misceval.callsim(ioPinTouch);
	mod.pin1 = Sk.misceval.callsim(ioPinTouch);
	mod.pin2 = Sk.misceval.callsim(ioPinTouch);
	mod.pin_logo = Sk.misceval.callsim(ioPinTouch);

	mod.Button = new Sk.misceval.buildClass(mod, function($gbl, $loc) {
		$loc.__init__ = new Sk.builtin.func(function(self) {
			self.presses = 0;
			self.pressed = false;
			self.last_checked = 0;
		});

		$loc.is_pressed = new Sk.builtin.func(function(self) {
			return Sk.builtin.bool(self.pressed);
		});

		$loc.was_pressed = new Sk.builtin.func(function(self) {
			var r = self.presses > self.last_checked;
			self.last_checked = self.presses;
			return Sk.builtin.bool(r);
		});

		$loc.get_presses = new Sk.builtin.func(function(self) {
			var presses = self.presses;
			self.presses = 0;
			return Sk.ffi.remapToPy(presses);
		});
	}, "Button", []);

	mod.button_a = Sk.misceval.callsim(mod.Button);
	mod.button_b = Sk.misceval.callsim(mod.Button);

	mod.Image = new Sk.misceval.buildClass(mod, function($gbl, $loc) {
		$loc.__init__ = new Sk.builtin.func(function(self, str, y) {
			if(str === undefined | y !== undefined) str = Sk.builtin.str("00000:00000:00000:00000:00000");
			self.lines = str.v.split(/[:\n]/);
		});

		$loc.width = new Sk.builtin.func(function(self) {
			return self.lines[0].length;
		});

		$loc.height = new Sk.builtin.func(function(self) {
			return self.lines.length;
		});

		$loc.set_pixel = new Sk.builtin.func(function(self, x, y, value) {
			var row = self.lines[y.v].split("");
			row[x.v] = value.v;
			self.lines[y.v] = row.join("");
		});

		$loc.get_pixel = new Sk.builtin.func(function(self, x, y){
			return Sk.ffi.remapToPy(parseInt(self.lines[y.v][x.v]));
		});

		$loc.__repr__ = new Sk.builtin.func(function(self) {
			return Sk.builtin.str("Image('" + self.lines.join(":") + ":')");
		});

		$loc.__str__ = new Sk.builtin.func(function(self) {
			return Sk.builtin.str("Image(\n    '" + self.lines.join(":'\n    '") + ":'\n)");
		});

		$loc.shift_left = new Sk.builtin.func(function(self, n) {
			if(n == undefined) {
				throw new Sk.builtin.TypeError("parameter n not defined");
			}
			var copy = self.lines.slice(0);
			for(var j = 0; j < n.v; j++) {
				var width = copy[0].length;
				for(var i = 0; i < copy.length; i++) {
					copy[i] = copy[i].slice(1, width) + "0";
				}
			}

			var newImage = Sk.misceval.callsim(mod.Image, Sk.builtin.str(copy.join(":")));
			return newImage;
		});

		$loc.shift_right = new Sk.builtin.func(function(self, n) {
			if(n == undefined) {
				throw new Sk.builtin.TypeError("parameter n not defined");
			}
			var copy = self.lines.slice(0);
			for(var j = 0; j < n.v; j++) {
				var width = copy[0].length;
				for(var i = 0; i < copy.length; i++) {
					copy[i] = "0" + copy[i].slice(0, width - 1);
				}
			}
			var newImage = Sk.misceval.callsim(mod.Image, Sk.builtin.str(copy.join(":")));
			return newImage;
		});

		$loc.shift_up = new Sk.builtin.func(function(self, n) {
			if(n == undefined) {
				throw new Sk.builtin.TypeError("parameter n not defined");
			}
			var height = self.lines.length;
			var copy = [];
			var s;
			for(var i = n.v; i < height; i++) {
				copy.push(self.lines[i]);
			}
			while(copy.length < height) {
				s = "";
				for(var i = 0; i < self.lines[0].length; i++) {
					s += "0";
				}
				copy.push(s);
			}
			var newImage = Sk.misceval.callsim(mod.Image, Sk.builtin.str(copy.join(":")));
			return newImage;
		});

		$loc.shift_down = new Sk.builtin.func(function(self, n) {
			if(n == undefined) {
				throw new Sk.builtin.TypeError("parameter n not defined");
			}
			var height = self.lines.length;
			var copy = [];
			var s;
			for(var j = 0; j < n.v; j++) {
				s = "";
				for(var i = 0; i < self.lines[0].length; i++) {
					s += "0";
				}
				copy.push(s);
			}
			for(var i = 0; i < self.lines.length - n.v; i++) {
				copy.push(self.lines[i]);
			}
			var newImage = Sk.misceval.callsim(mod.Image, Sk.builtin.str(copy.join(":")));
			return newImage;
		});

		$loc.__add__ = new Sk.builtin.func(function(self, other) {
			var x,y,val;
			var copy = self.lines.slice(0);
			for(y = 0; y < copy.length; y++) {
				copy[y] = copy[y].split("");
				for(x = 0; x < copy[y].length; x++) {
					val = parseInt(copy[y][x]) + parseInt(other.lines[y][x]);

					if(val > 9) val = 9;
					copy[y][x] = val;
				}
				copy[y] = copy[y].join("");
			}
			var newImage = Sk.misceval.callsim(mod.Image, Sk.builtin.str(copy.join(":")));
			return newImage;
		});

		$loc.__mul__ = new Sk.builtin.func(function(self, n) {
			var copy = self.lines.slice(0);
			for(y = 0; y < copy.length; y++) {
				copy[y] = copy[y].split("");
				for(x = 0; x < copy[y].length; x++) {
					val = Math.round(parseInt(copy[y][x]) * n.v);
					if(val < 0) val = 0;
					if(val > 9) val = 9;
					copy[y][x] = val;
				}
				copy[y] = copy[y].join("");
			}
			var newImage = Sk.misceval.callsim(mod.Image, Sk.builtin.str(copy.join(":")));
			return newImage;
		});

		$loc.invert = new Sk.builtin.func(function(self) {
			var copy = self.lines.slice(0);
			for(y = 0; y < copy.length; y++) {
				copy[y] = copy[y].split("");
				for(x = 0; x < copy[y].length; x++) {
					val = parseInt(copy[y][x]);
					copy[y][x] = 9 - val;
				}
				copy[y] = copy[y].join("");
			}
			var newImage = Sk.misceval.callsim(mod.Image, Sk.builtin.str(copy.join(":")));
			return newImage;
		});


	}, 'Image', []);


	mod.Image.HEART = Sk.misceval.callsim(mod.Image, Sk.builtin.str("09090:99999:99999:09990:00900:"));
	mod.Image.HEART_SMALL = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:09090:09990:00900:00000:"));
	mod.Image.HAPPY = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:09090:00000:90009:09990:"));
	mod.Image.SMILE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00000:00000:90009:09990:"));
	mod.Image.SAD = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:09090:00000:09990:90009:"));
	mod.Image.CONFUSED = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:09090:00000:09090:90909:"));
	mod.Image.ANGRY = Sk.misceval.callsim(mod.Image, Sk.builtin.str("90009:09090:00000:99999:90909:"));
	mod.Image.ASLEEP = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:99099:00000:09990:00000:"));
	mod.Image.SURPRISED = Sk.misceval.callsim(mod.Image, Sk.builtin.str("09090:00000:00900:09090:00900:"));
	mod.Image.SILLY = Sk.misceval.callsim(mod.Image, Sk.builtin.str("90009:00000:99999:00909:00999:"));
	mod.Image.FABULOUS = Sk.misceval.callsim(mod.Image, Sk.builtin.str("99999:99099:00000:09090:09990:"));
	mod.Image.MEH = Sk.misceval.callsim(mod.Image, Sk.builtin.str("09090:00000:00090:00900:09000:"));
	mod.Image.YES = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00009:00090:90900:09000:"));
	mod.Image.NO = Sk.misceval.callsim(mod.Image, Sk.builtin.str("90009:09090:00900:09090:90009:"));
	mod.Image.CLOCK12 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:00900:00900:00000:00000:"));
	mod.Image.CLOCK1 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00090:00090:00900:00000:00000:"));
	mod.Image.CLOCK2 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00099:00900:00000:00000:"));
	mod.Image.CLOCK3 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00000:00999:00000:00000:"));
	mod.Image.CLOCK4 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00000:00900:00099:00000:"));
	mod.Image.CLOCK5 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00000:00900:00090:00090:"));
	mod.Image.CLOCK6 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00000:00900:00900:00900:"));
	mod.Image.CLOCK7 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00000:00900:09000:09000:"));
	mod.Image.CLOCK8 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00000:00900:99000:00000:"));
	mod.Image.CLOCK9 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00000:99900:00000:00000:"));
	mod.Image.CLOCK10 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:99000:00900:00000:00000:"));
	mod.Image.CLOCK11 = Sk.misceval.callsim(mod.Image, Sk.builtin.str("09000:09000:00900:00000:00000:"));
	mod.Image.ARROW_N = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:09990:90909:00900:00900:"));
	mod.Image.ARROW_NE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00999:00099:00909:09000:90000:"));
	mod.Image.ARROW_E = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:00090:99999:00090:00900:"));
	mod.Image.ARROW_SE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("90000:09000:00909:00099:00999:"));
	mod.Image.ARROW_S = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:00900:90909:09990:00900:"));
	mod.Image.ARROW_SW = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00009:00090:90900:99000:99900:"));
	mod.Image.ARROW_W = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:09000:99999:09000:00900:"));
	mod.Image.ARROW_NW = Sk.misceval.callsim(mod.Image, Sk.builtin.str("99900:99000:90900:00090:00009:"));
	mod.Image.TRIANGLE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00900:09090:99999:00000:"));
	mod.Image.TRIANGLE_LEFT = Sk.misceval.callsim(mod.Image, Sk.builtin.str("90000:99000:90900:90090:99999:"));
	mod.Image.CHESSBOARD = Sk.misceval.callsim(mod.Image, Sk.builtin.str("09090:90909:09090:90909:09090:"));
	mod.Image.DIAMOND = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:09090:90009:09090:00900:"));
	mod.Image.DIAMOND_SMALL = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:00900:09090:00900:00000:"));
	mod.Image.SQUARE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("99999:90009:90009:90009:99999:"));
	mod.Image.SQUARE_SMALL = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:09990:09090:09990:00000:"));
	mod.Image.RABBIT = Sk.misceval.callsim(mod.Image, Sk.builtin.str("90900:90900:99990:99090:99990:"));
	mod.Image.COW = Sk.misceval.callsim(mod.Image, Sk.builtin.str("90009:90009:99999:09990:00900:"));
	mod.Image.MUSIC_CROTCHET = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:00900:00900:99900:99900:"));
	mod.Image.MUSIC_QUAVER = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:00990:00909:99900:99900:"));
	mod.Image.MUSIC_QUAVERS = Sk.misceval.callsim(mod.Image, Sk.builtin.str("09999:09009:09009:99099:99099:"));
	mod.Image.PITCHFORK = Sk.misceval.callsim(mod.Image, Sk.builtin.str("90909:90909:99999:00900:00900:"));
	mod.Image.XMAS = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:09990:00900:09990:99999:"));
	mod.Image.PACMAN = Sk.misceval.callsim(mod.Image, Sk.builtin.str("09999:99090:99900:99990:09999:"));
	mod.Image.TARGET = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:09990:99099:09990:00900:"));
	mod.Image.TSHIRT = Sk.misceval.callsim(mod.Image, Sk.builtin.str("99099:99999:09990:09990:09990:"));
	mod.Image.ROLLERSKATE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00099:00099:99999:99999:09090:"));
	mod.Image.DUCK = Sk.misceval.callsim(mod.Image, Sk.builtin.str("09900:99900:09999:09990:00000:"));
	mod.Image.HOUSE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:09990:99999:09990:09090:"));
	mod.Image.TORTOISE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00000:09990:99999:09090:00000:"));
	mod.Image.BUTTERFLY = Sk.misceval.callsim(mod.Image, Sk.builtin.str("99099:99999:00900:99999:99099:"));
	mod.Image.STICKFIGURE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:99999:00900:09090:90009:"));
	mod.Image.GHOST = Sk.misceval.callsim(mod.Image, Sk.builtin.str("99999:90909:99999:99999:90909:"));
	mod.Image.SWORD = Sk.misceval.callsim(mod.Image, Sk.builtin.str("00900:00900:00900:09990:00900:"));
	mod.Image.GIRAFFE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("99000:09000:09000:09990:09090:"));
	mod.Image.SKULL = Sk.misceval.callsim(mod.Image, Sk.builtin.str("09990:90909:99999:09990:09990:"));
	mod.Image.UMBRELLA = Sk.misceval.callsim(mod.Image, Sk.builtin.str("09990:99999:00900:90900:09900:"));
	mod.Image.SNAKE = Sk.misceval.callsim(mod.Image, Sk.builtin.str("99000:99099:09090:09990:00000:"));

	mod.Image.ALL_CLOCKS = Sk.builtin.list([mod.Image.CLOCK1, mod.Image.CLOCK2, mod.Image.CLOCK3, mod.Image.CLOCK4, mod.Image.CLOCK5, mod.Image.CLOCK6, mod.Image.CLOCK7, mod.Image.CLOCK8, mod.Image.CLOCK9, mod.Image.CLOCK10, mod.Image.CLOCK11, mod.Image.CLOCK12]);
	mod.Image.ALL_ARROWS = Sk.builtin.list([mod.Image.ARROW_N, mod.Image.ARROW_NE, mod.Image.ARROW_E, mod.Image.ARROW_SE, mod.Image.ARROW_S, mod.Image.ARROW_SW, mod.Image.ARROW_W, mod.Image.ARROW_NW]);




	mod.test = new Sk.builtin.func(function(i){
		console.log(i);
	});

	mod.display = new Sk.builtin.module();
	mod.display.$d = new display("microbit.display");

	mod.accelerometer = new Sk.builtin.module();
	mod.accelerometer.$d = new accelerometer("microbit.accelerometer");

	mod.compass = new Sk.builtin.module();
	mod.compass.$d = new compass("microbit.compass");
	
	mod.spi = new Sk.builtin.module();
	mod.spi.$d = new spi("microbit.spi");

	mod.i2c = new Sk.builtin.module();
	mod.i2c.$d = new i2c("microbit.i2c");

	mod.uart = new Sk.builtin.module();
	mod.uart.$d = new uart("microbit.uart");

	mod.speaker = new Sk.builtin.module();
	mod.speaker.$d = new speaker("microbit.speaker");

	mod.set_volume = new Sk.builtin.func(function(v) {
		v = Sk.ffi.remapToJs(v);
		if(v >= 0 && v <= 255) {
			mod.speaker.$d.volume = v;
			if(mod.speaker.$d._on) {
				$('#mb_speaker_enabled').text(v);
			}
		} else {
			throw new Sk.builtin.ValueError("Volume must be between 0 and 255");
		}
	});

	mod.microphone = new Sk.builtin.module();
	mod.microphone.$d = new microphone("microbit.microphone");
	mod.microphone.$d.SoundEvent = SoundEvent;

	var mb = {
		init: function() {
			var html = '';
			html += '<div id="mb_tabs">';
			html += '<ul>';
			html += '<li><a href="#mb_tabs_tools">Засоби micro:bit</a></li>';
			html += '<li><a href="#mb_tabs_help">Допомога та поради</a></li>';
			html += '<li><a href="#mb_tabs_accelerometer">Акселерометр</a></li>';
			html += '<li><a href="#mb_tabs_compass">Компас</a></li>';
			html += '<li><a href="#mb_tabs_pins">Контакти I/O</a></li>';
			html += '<li><a href="#mb_tabs_thermometer">Термометр</a></li>';
			html += '<li><a href="#mb_tabs_radio">Радіо</a></li>';
			html += '<li><a href="#mb_tabs_v2">Можливості v2</a></li>';
			html += '</ul>';
			html += '<div id="mb_tabs_v2">';
			html += 'Звук: <span id="mb_speaker_enabled">увімкнено</span>';
			html += '<div>';
			html += '<!--<label for="mb_microphone_enabled">Listen to microphone</label>';
			html += '<input name="mb_microphone_enabled" id="mb_microphone_enabled" type="checkbox">-->';
			html += '<label for="mb_mic_volume">Гучність: <span id="mb_volume_val">0</span></label>';
			html += '<div class="mb_slider" id="mb_mic_slider_volume"></div>';
			html += '<div id="mb_mic_event_list"> </div>';
			html += '</div>';
			html += '</div>';
			html += '<div id="mb_tabs_radio">';
			html += '<fieldset><legend>Налаштування:</legend>';
			html += '<label for="mb_radio_channel">Канал (0-100): </label>';
			html += '<input name="mb_radio_channel"  id="mb_radio_channel" value="7"> ';
			html += '<label for="mb_radio_address">Адреса (32 bit hex): </label>';
			html += '<input name="mb_radio_address" id="mb_radio_address" value="0x75626974"> ';
			html += '<label for="mb_radio_group">Група (0-255): </label>';
			html += '<input name="mb_radio_group" id="mb_radio_group" value="0"> ';
			html += '<label for="mb_radio_rate">Data rate: </label>';
			html += '<select name="mb_radio_rate" id="mb_radio_rate"><option value="250">RATE_250KBIT</option><option value="1000" selected="selected">RATE_1MBIT</option><option value="2000">RATE_2MBIT</option></select>';
			html += '<button id="mb_btn_radio_update">Оновити</button>';
			html += '<div id="mb_radio_status"></div>';
			html += '</fieldset>';
			html += '<fieldset><legend>Дані:</legend>';
			html += '<label for="mb_radio_message">Повідомлення: </label>';
			html += '<input name="mb_radio_message" id="mb_radio_message">';
			html += '<button id="mb_btn_radio_send">Надіслати</button>';
			html += '</fieldset>';
			html += '</div>';
			html += '<div id="mb_tabs_thermometer">';
			html += 'Температура: <span id="mb_therm_value">23</span>&deg;C<div class="mb_slider" id="mb_therm_slider"></div>';
			html += '</div>';
			html += '<div id="mb_tabs_compass">';
			html += 'Напрям: <div class="mb_slider_com" id="mb_com_slider_heading"></div><div id="mb_com_heading"><span id="mb_com_value_heading">0</span><div id="mb_compass_pointer"></div></div>';
			html += 'x: <span id="mb_com_value_x">0</span><div class="mb_slider" id="mb_com_slider_x"></div>';
			html += 'y: <span id="mb_com_value_y">0</span><div class="mb_slider" id="mb_com_slider_y"></div>';
			html += 'z: <span id="mb_com_value_z">0</span><div class="mb_slider" id="mb_com_slider_z"></div>';
			html += '</div>';
			html += '<div id="mb_tabs_pins">';
			html += '<label for="mb_pin_num">Контакти</label> ';
			html += '<input name="mb_pin_num" id="mb_pin_num"><span id="mb_pin_type"></span>';
			html += ' <span id="mb_pin_detail"></span>';
			html += '</div>';
			html += '<div id="mb_tabs_accelerometer">';
			html += 'x: <span id="mb_acc_value_x">0</span><div class="mb_slider" id="mb_acc_slider_x"></div>';
			html += 'y: <span id="mb_acc_value_y">0</span><div class="mb_slider" id="mb_acc_slider_y"></div>';
			html += 'z: <span id="mb_acc_value_z">9</span><div class="mb_slider" id="mb_acc_slider_z"></div>';
			html += '<h3>Жести</h3>';
			html += '<span class="mb_help_link mb_gesture">вгору</span>';
			html += '<span class="mb_help_link mb_gesture">вниз</span>';
			html += '<span class="mb_help_link mb_gesture">ліворуч</span>';
			html += '<span class="mb_help_link mb_gesture">праворуч</span>';
			html += '<span class="mb_help_link mb_gesture">передом</span>';
			html += '<span class="mb_help_link mb_gesture">тилом</span>';
			html += '<span class="mb_help_link mb_gesture">вільне падіння</span>';
			html += '<span class="mb_help_link mb_gesture">3g</span>';
			html += '<span class="mb_help_link mb_gesture">6g</span>';
			html += '<span class="mb_help_link mb_gesture">8g</span>';
			html += '<span class="mb_help_link mb_gesture">струснути</span>';
			html += '<div id="mb_gesture_list"></div>';
			html += '</div>';
			html += '<div id="mb_tabs_tools">';
			html += '<button id="mb_btn_save_hex"><i class="fa fa-download"></i> Завантажити Hex</button>';
			html += '<a class="mb_help_link" id="mb_btn_both">Press A + B</a>';
			html += '</div>';
			html += '<div id="mb_tabs_help">';
			html += '<a class="mb_help_link" href="https://microbit-micropython.readthedocs.io/en/latest/tutorials/hello.html" target="_blank"><i class="fa fa-question-circle"></i> Допомога та зразки коду </a>';
			html += '<a class="mb_help_link" href="https://www.microbit.co.uk/" target="_blank"><i class="fa fa-external-link"></i> Офіційний сайт </a>';
			html += '<a class="mb_help_link" href="http://blog.withcode.uk/tag/microbit/" target="_blank"><i class="fa fa-check"></i> Блоґ розробників </a>';
			html += '<a class="mb_help_link" href="http://cheat.microbit-playground.co.uk/" target="_blank"><i class="fa fa-smile-o"></i> Шпаргалка</a>';
			html += '</div>';
			html += '</div>';
			html += '<link rel="stylesheet" href="./lib/skulpt/microbit/mb.css?v2"><div id="microbit">';
			html += '<div id="mb_btn_logo" class="mb_btn"></div>';
			html += '<div id="mb_btn_A" class="mb_btn"></div>';
			html += '<div id="mb_btn_B" class="mb_btn"></div>';
			html += '<iframe id="mb_if" src="https://create.withcode.uk/lib/skulpt/microbit/ext/editor.html?controller=1" width="1" height="1" style="display:none;"></iframe>';
			var x,y;
			for(x = 0; x < 5; x++) {
				for(y = 0; y < 5; y++) {
					html += '<div class="mb_led mb_led_row_' + y + ' mb_led_col_' + x + '"></div>';
				}
			}
			html += '</div>';
			html += '<div class="mb_info">micro:bit simulator by Pete Dring</div>';
			PythonIDE.python.output(html, true);
			
			$('#mb_btn_save_hex').button().click(function() {
				var i = document.getElementById('mb_if');
				var FS = i.contentWindow.FS;
				for(var name in PythonIDE.files) {
					var contents = PythonIDE.files[name];
					if(name == "mycode.py") {
						name = "main.py";
					}
					FS.write(name, contents);
				}
				var hex = i.contentWindow.FS.getUniversalHex();
				var filename = "my_code";
				var blob = new Blob([hex], {type: "text/plain"});
				saveAs(blob, filename + ".hex");	
			});
			$('#mb_btn_radio_send').button().click(function() {
				if(typeof(radio) !== "undefined") {
					if(radio.fn_receive) {
						radio.fn_receive("\x00\x01\x00" + $('#mb_radio_message').val());
					} else {
						$('#mb_radio_status').html('Not tuned to the same settings as the microbit radio. Check settings and press Update');
					}
				} else {
					$('#mb_radio_status').html('Radio module not found: did you include "import radio"?');
				}
			});

			mod.radio = {
				channel: 7,
				group: 0,
				address: parseInt('0x75626974', 16),
				data_rate: 1000
			};

			$('#mb_btn_radio_update').button().click(function() {
				function getValueInRange(id, min, max, def, message){
					var value = Number($('#' + id).val());
					if(value != NaN && value >= min && value <= max) {
						return value;
					}
					$('#mb_radio_status').html(message);
					return def;
				}
				function getHexValue(id, def, message){
					var value = parseInt($('#' + id).val(), 16);
					if(value != NaN) {
						return value;
					}
					$('#mb_radio_status').html(message);
					return def;
				}


				mod.radio.channel = getValueInRange('mb_radio_channel', 0, 100, 'Please enter a channel number between 0 and 100');
				mod.radio.group = getValueInRange('mb_radio_group', 0, 255, 'Please enter a group number between 0 and 255');
				mod.radio.address = getHexValue('mb_radio_address', 'Please enter a valid 32bit hex number');
				mod.radio.data_rate = $('#mb_radio_rate').val();
				if(typeof(radio) !== "undefined") {
					var tuned = true;

					if(mod.radio.channel != radio.channel) {
						$('#mb_radio_status').html("Channel doesn't match: currently set to " + radio.channel);
						tuned = false;
					}
					if(mod.radio.group != radio.group) {
						$('#mb_radio_status').html("Group doesn't match: currently set to " + radio.group);
						tuned = false;
					}
					if(mod.radio.address != radio.address) {
						$('#mb_radio_status').html("Address doesn't match: currently set to " + radio.address.toString(16));
						tuned = false;
					}
					if(mod.radio.data_rate != radio.data_rate){
						$('#mb_radio_status').html("Data rate doesn't match: currently set to " + radio.data_rate);
						tuned = false;
					}
					if(tuned) {
						$('#mb_radio_status').html("Tuned in to radio module");
						radio.fn_send = function(message) { // send from microbit to UI
							$('#mb_radio_status').html("Received message: " + message);
						}
						radio.fn_receive = function(message) { // send from UI to microbit
							if(radio.buffer.length < radio.queue) {
								radio.buffer.push(message);
							} else {
								$('#mb_radio_status').html("Queue is full in microbit radio");
							}

						}
					}

				} else {
					$('#mb_radio_status').html('Radio module not detected - did you include "import radio"?');
				}
			});


			$('#mb_btn_both').on("mousedown mouseup click", function(e) {
				switch(e.type) {
					case 'mousedown':
						mod.button_a.pressed = true;
						mod.button_b.pressed = true;
					break;
					case 'mouseup':
						mod.button_a.pressed = false;
						mod.button_b.pressed = false;
					break;
					case 'click':
						mod.button_a.presses++;
						mod.button_b.presses++;
					break;
				}
			});
			PythonIDE.python.updateMicrobitPins = function() {
				try {
					var pinNumber = parseInt($('#mb_pin_num').val());
					updatePinSpinner(pinNumber);
				} catch(e) {
				}
			}
			function updatePinSpinner(pinNumber) {
				var pinType = undefined;
				var pin = undefined;
				var html = '';
				function sliderChange(event, ui) {
					$('#mb_pin_analog_value').text(ui.value);
					pin.value = ui.value;
				};
				switch(pinNumber) {
					case 0:
					case 1:
					case 2:
						pinType = "Touch";
						pin = mod['pin' + pinNumber];
						html = '<button id="mb_btn_pin_touch">Touch</button> Величина: <span id="mb_pin_analog_value">' + pin.value + '</span><div class="mb_slider" id="mb_pin_analog"></div> період PWM: ' + pin.period_us / 1000 + 'ms';
						$('#mb_pin_detail').html(html);
						$('#mb_btn_pin_touch').button().mousedown(function() {
							pin.touched = true;
						}).mouseup(function() {
							pin.touched = false;
						});
						$('#mb_pin_analog').slider({
							value: pin.value,
							min: 0,
							max: 1023,
							step: 1,
							change: sliderChange
						}).on("slide", sliderChange);
						break;
					case 3:
					case 4:
					case 10:
						pinType = "Analog";
						pin = mod['pin' + pinNumber];
						html = 'Величина: <span id="mb_pin_analog_value">' + pin.value + '</span><div class="mb_slider" id="mb_pin_analog"></div> період PWM: ' + pin.period_us / 1000 + 'мс';
						$('#mb_pin_detail').html(html);
						$('#mb_pin_analog').slider({
							value: pin.value,
							min: 0,
							max: 1023,
							step: 1,
							change: sliderChange
						}).on("slide", sliderChange);
						break;
					case 5:
					case 6:
					case 7:
					case 8:
					case 9:
					case 11:
					case 12:
					case 13:
					case 14:
					case 15:
					case 16:
					case 19:
					case 20:
						pinType = "Digital";
						pin = mod['pin' + pinNumber];

						html = 'Currently switched: <button id="mb_btn_pin_digital">' + (pin.value? 'On' : 'Off') + '</button>';

						$('#mb_pin_detail').html(html);
						$('#mb_btn_pin_digital').button().click(function() {
							pin.value = !pin.value;
							$('#mb_btn_pin_digital').button('option', 'label', pin.value? 'On' : 'Off');
						});
						break;
					default:
						pinType = "+3v";
						$('#mb_pin_detail').html(html);
						break;

				}


				$('#mb_pin_type').text('Type: ' + pinType);
			}
			$('#mb_pin_num').spinner({
				spin: function(event, ui) {
					updatePinSpinner(ui.value);
					if(ui.value < 0) {
						$('#mb_pin_num').spinner("value", 20 );
						return false;
					}
					if(ui.value > 20) {
						$('#mb_pin_num').spinner("value", 0 );
						return false;
					}
				}
			});
			$('#mb_pin_num').spinner("value", 0);
			updatePinSpinner(0);

			var updateGestureList = mod.accelerometer.$d.data.updateGestureList;
			$('.mb_gesture').click(function(e) {
				var gesture = e.currentTarget.innerHTML;
				mod.accelerometer.$d.data.gestureHistory.push(gesture);
				updateGestureList();
			}).mousedown(function(e) {
				var gesture = e.currentTarget.innerHTML;
				mod.accelerometer.$d.data.currentGesture = gesture;
				updateGestureList();
				$('#microbit').addClass("mb_active_gesture_" + gesture);
			}).mouseup(function(e) {
				var gesture = e.currentTarget.innerHTML;
				mod.accelerometer.$d.data.currentGesture = '';
				updateGestureList();
				$('#microbit').removeClass("mb_active_gesture_" + gesture);
			});

			function sliderChange(event, ui) {
				switch(event.target.id) {
					case 'mb_therm_slider':
						$('#mb_therm_value').text(ui.value);
						mod.data.temperature = ui.value;
					break;
					case 'mb_acc_slider_x':
						$('#mb_acc_value_x').text(ui.value);
						mod.accelerometer.$d.data.x = ui.value;
					break;
					case 'mb_acc_slider_y':
						$('#mb_acc_value_y').text(ui.value);
						mod.accelerometer.$d.data.y = ui.value;
					break;
					case 'mb_acc_slider_z':
						$('#mb_acc_value_z').text(ui.value);
						mod.accelerometer.$d.data.z = ui.value;
					break;
					case 'mb_com_slider_x':
						$('#mb_com_value_x').text(ui.value);
						mod.compass.$d.data.x = ui.value;
						mod.compass.$d.data.strength = Math.sqrt(Math.pow(mod.compass.$d.data.x, 2) + Math.pow(mod.compass.$d.data.y, 2) + Math.pow(mod.compass.$d.data.z, 2));
					break;
					case 'mb_com_slider_y':
						$('#mb_com_value_y').text(ui.value);
						mod.compass.$d.data.strength = Math.sqrt(Math.pow(mod.compass.$d.data.x, 2) + Math.pow(mod.compass.$d.data.y, 2) + Math.pow(mod.compass.$d.data.z, 2));
					break;
					case 'mb_com_slider_z':
						$('#mb_com_value_z').text(ui.value);
						mod.compass.$d.data.z = ui.value;
						mod.compass.$d.data.strength = Math.sqrt(Math.pow(mod.compass.$d.data.x, 2) + Math.pow(mod.compass.$d.data.y, 2) + Math.pow(mod.compass.$d.data.z, 2));
					break;
				}
			}

			function compassHeadingChange(event, ui) {
				$('#mb_com_value_heading').text(ui.value);
				$('#mb_compass_pointer').css({transform: 'rotate(' + ui.value + 'deg)'});
				mod.compass.$d.data.heading = ui.value;
			}

			$('.mb_slider').slider({
				value: 0,
				min: -1024,
				max: 1024,
				step: 1,
				change: sliderChange
			}).on("slide", sliderChange);
			$('#mb_mic_slider_volume').slider({
				value: 0,
				min: 0,
				max: 255,
				step: 1
			}).on("slide", function(event, ui) {
				mod.microphone.$d.level = ui.value;
				mod.microphone.$d._setValue(ui.value);
				$('#mb_volume_val').text(ui.value);
			});
			mod.microphone.$d.updateThresholds();
			$('#mb_microphone_enabled').on("change", function() {
				var ticked = this.checked;
				if(ticked) {
					PythonIDE.showHint("Mic integration not implemented yet");
					//mod.microphone.$d.startListening();
				} else {
					//mod.microphone.$d.stopListening();
				}
			});

			$('#mb_therm_slider').slider({
				value: 23,
				min: 0,
				max: 100
			});
			$('.mb_slider_com').slider({
				value: 0,
				min: 0,
				max: 360,
				step: 1,
				change: compassHeadingChange
			}).on("slide", compassHeadingChange);
			$('#mb_tabs').tabs();
			$('.mb_btn').on("mousedown mouseup click", function(e) {
				var btn = mod.button_a;
				if(e.currentTarget.id == "mb_btn_B") {
					btn = mod.button_b;
				}
				if(e.currentTarget.id == "mb_btn_logo") {
					btn = mod.pin_logo;
				}
				switch(e.type) {
					case 'mousedown':
						btn.pressed = true;
					break;
					case 'mouseup':
						btn.pressed = false;
					break;
					case 'click':
						btn.presses++;
					break;
				}
			});
		}
	};


	mb.init();


	return mod;

};

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||function(e){"use strict";if("undefined"==typeof navigator||!/MSIE [1-9]\./.test(navigator.userAgent)){var t=e.document,n=function(){return e.URL||e.webkitURL||e},o=t.createElementNS("http://www.w3.org/1999/xhtml","a"),r="download"in o,i=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},a=e.webkitRequestFileSystem,c=e.requestFileSystem||a||e.mozRequestFileSystem,u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},f="application/octet-stream",s=0,d=500,l=function(t){var o=function(){"string"==typeof t?n().revokeObjectURL(t):t.remove()};e.chrome?o():setTimeout(o,d)},v=function(e,t,n){t=[].concat(t);for(var o=t.length;o--;){var r=e["on"+t[o]];if("function"==typeof r)try{r.call(e,n||e)}catch(i){u(i)}}},p=function(e){return/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)?new Blob(["﻿",e],{type:e.type}):e},w=function(t,u,d){d||(t=p(t));var w,y,m,S=this,h=t.type,O=!1,R=function(){v(S,"writestart progress write writeend".split(" "))},b=function(){if((O||!w)&&(w=n().createObjectURL(t)),y)y.location.href=w;else{var o=e.open(w,"_blank");void 0==o&&"undefined"!=typeof safari&&(e.location.href=w)}S.readyState=S.DONE,R(),l(w)},g=function(e){return function(){return S.readyState!==S.DONE?e.apply(this,arguments):void 0}},E={create:!0,exclusive:!1};return S.readyState=S.INIT,u||(u="download"),r?(w=n().createObjectURL(t),o.href=w,o.download=u,void setTimeout(function(){i(o),R(),l(w),S.readyState=S.DONE})):(e.chrome&&h&&h!==f&&(m=t.slice||t.webkitSlice,t=m.call(t,0,t.size,f),O=!0),a&&"download"!==u&&(u+=".download"),(h===f||a)&&(y=e),c?(s+=t.size,void c(e.TEMPORARY,s,g(function(e){e.root.getDirectory("saved",E,g(function(e){var n=function(){e.getFile(u,E,g(function(e){e.createWriter(g(function(n){n.onwriteend=function(t){y.location.href=e.toURL(),S.readyState=S.DONE,v(S,"writeend",t),l(e)},n.onerror=function(){var e=n.error;e.code!==e.ABORT_ERR&&b()},"writestart progress write abort".split(" ").forEach(function(e){n["on"+e]=S["on"+e]}),n.write(t),S.abort=function(){n.abort(),S.readyState=S.DONE},S.readyState=S.WRITING}),b)}),b)};e.getFile(u,{create:!1},g(function(e){e.remove(),n()}),g(function(e){e.code===e.NOT_FOUND_ERR?n():b()}))}),b)}),b)):void b())},y=w.prototype,m=function(e,t,n){return new w(e,t,n)};return"undefined"!=typeof navigator&&navigator.msSaveOrOpenBlob?function(e,t,n){return n||(e=p(e)),navigator.msSaveOrOpenBlob(e,t||"download")}:(y.abort=function(){var e=this;e.readyState=e.DONE,v(e,"abort")},y.readyState=y.INIT=0,y.WRITING=1,y.DONE=2,y.error=y.onwritestart=y.onprogress=y.onwrite=y.onabort=y.onerror=y.onwriteend=null,m)}}("undefined"!=typeof self&&self||"undefined"!=typeof window&&window||this.content);"undefined"!=typeof module&&module.exports?module.exports.saveAs=saveAs:"undefined"!=typeof define&&null!==define&&null!=define.amd&&define([],function(){return saveAs});
