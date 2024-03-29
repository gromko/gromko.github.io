var GPIO = function(name) {
	var mod = {};

	mod.BOARD = Sk.builtin.int_(10);
	mod.MODE_UNKNOWN = Sk.builtin.int_(-1);
	mod.BCM = Sk.builtin.int_(11);
	mod.SERIAL = Sk.builtin.int_(40);
	mod.SPI = Sk.builtin.int_(41);
	mod.I2C = Sk.builtin.int_(42);
	mod.BOARD = Sk.builtin.int_(10);
	mod.PWM = Sk.builtin.int_(43);
	mod.IN = Sk.builtin.int_(1);
	mod.OUT = Sk.builtin.int_(0);
	mod.HIGH = Sk.builtin.int_(1);
	mod.LOW = Sk.builtin.int_(0);
	mod.PUD_OFF = Sk.builtin.int_(0);
	mod.PUD_DOWN = Sk.builtin.int_(1);
	mod.PUD_UP = Sk.builtin.int_(2);
	mod.FALLING = Sk.builtin.int_(32);
	mod.RISING = Sk.builtin.int_(31);

	var internals = {
		mode: mod.BOARD,
		warnings: Sk.builtin.bool(true),
		pins: [],
		pinCount: 26,
		THRESHOLD: 1.25
	};

	function pin(physical, name, type) {
		var p = {
			physical: physical,
			name: name,
			type: type,
			voltage: 0.0
		}

		switch(type) {
			case "power":
				p.voltage = name == "Ground"?0.0:parseFloat(name.split(" ")[0].replace("v", "."));
				break;
			case "io":
				p.bcm = parseInt(name.split(" ")[1]);
				p.direction = "input";
			break;
		}

		return p;
	}

	function addPin(pin) {
		internals.pins[pin.physical] = pin;
	}
	
	function setupPins() {
		var connections = PythonIDE.files['RPi.txt'];
		
		var model = 'B+';
		
		if(connections) {
			var lines = connections.split("\n");
			for(var i = 0; i < lines.length; i++) {
				if(lines[i].indexOf('model') > -1) {
					var parts = lines[i].split(/\s+/);
					
					if(parts.length > 1) {
						model = parts[1];
					}
				}
			}
		
		}
		
		// determin RPi model 
		switch(model) {
			case 'A':
			case 'B':
				internals.pinCount = 26;
				addPin(pin(1, "3v3 Power", "power"));
				addPin(pin(2, "5v Power", "power"));
				addPin(pin(3, "BCM 2", "io"));
				addPin(pin(4, "5v Power", "power"));
				addPin(pin(5, "BCM 3", "io"));
				addPin(pin(6, "Ground", "power"));
				addPin(pin(7, "BCM 4", "io"));
				addPin(pin(8, "BCM 14", "io"));
				addPin(pin(9, "Ground", "power"));
				addPin(pin(10, "BCM 15", "io"));
				
				addPin(pin(11, "BCM 17", "io"));
				addPin(pin(12, "BCM 18", "io"));
				addPin(pin(13, "BCM 27", "io"));
				addPin(pin(14, "Ground", "power"));
				addPin(pin(15, "BCM 22", "io"));
				addPin(pin(16, "BCM 23", "io"));
				addPin(pin(17, "3v3 Power", "power"));
				addPin(pin(18, "BCM 24", "io"));
				addPin(pin(19, "BCM 10", "io"));
				addPin(pin(20, "Ground", "power"));
				
				addPin(pin(21, "BCM 9", "io"));
				addPin(pin(22, "BCM 25", "io"));
				addPin(pin(23, "BCM 11", "io"));
				addPin(pin(24, "BCM 8", "io"));
				addPin(pin(25, "Ground", "power"));
				addPin(pin(26, "BCM 7", "io"));
			break;
			case 'A+':
			case 'B+':
				internals.pinCount = 40;
				addPin(pin(1, "3v3 Power", "power"));
				addPin(pin(2, "5v Power", "power"));
				addPin(pin(3, "BCM 2", "io"));
				addPin(pin(4, "5v Power", "power"));
				addPin(pin(5, "BCM 3", "io"));
				addPin(pin(6, "Ground", "power"));
				addPin(pin(7, "BCM 4", "io"));
				addPin(pin(8, "BCM 14", "io"));
				addPin(pin(9, "Ground", "power"));
				addPin(pin(10, "BCM 15", "io"));
			
				addPin(pin(11, "BCM 17", "io"));
				addPin(pin(12, "BCM 18", "io"));
				addPin(pin(13, "BCM 27", "io"));
				addPin(pin(14, "Ground", "power"));
				addPin(pin(15, "BCM 22", "io"));
				addPin(pin(16, "BCM 23", "io"));
				addPin(pin(17, "3v3 Power", "power"));
				addPin(pin(18, "BCM 24", "io"));
				addPin(pin(19, "BCM 10", "io"));
				addPin(pin(20, "Ground", "power"));
			
				addPin(pin(21, "BCM 9", "io"));
				addPin(pin(22, "BCM 25", "io"));
				addPin(pin(23, "BCM 11", "io"));
				addPin(pin(24, "BCM 8", "io"));
				addPin(pin(25, "Ground", "power"));
				addPin(pin(26, "BCM 7", "io"));
				addPin(pin(27, "BCM 0", "io"));
				addPin(pin(28, "BCM 1", "io"));
				addPin(pin(29, "BCM 5", "io"));
				addPin(pin(30, "Ground", "power"));
			
				addPin(pin(31, "BCM 6", "io"));
				addPin(pin(32, "BCM 12", "io"));
				addPin(pin(33, "BCM 13", "io"));
				addPin(pin(34, "Ground", "power"));
				addPin(pin(35, "BCM 19", "io"));
				addPin(pin(36, "BCM 16", "io"));
				addPin(pin(37, "BCM 26", "io"));
				addPin(pin(38, "BCM 20", "io"));
				addPin(pin(39, "Ground", "power"));
				addPin(pin(40, "BCM 21", "io"));

			break;
			default:
				throw new Sk.builtin.Exception("Unknown RPi model number in RPi.txt (Supported models are currently A, B, A+, B+)");
		}
	}
	
	setupPins();

	

	function getPin(pinNumber) {
		var pin;
		if(internals.mode.v == 10) { // board numbers
			pin = pinNumber;
		} else {	// bcm numbers
			for(var i = 1; i <=internals.pinCount; i++) {
				if(internals.pins[i].bcm && internals.pins[i].bcm == pinNumber) {
					pin = internals.pins[i].physical;
					break;
				}
			}
		}
		return internals.pins[pin];
	}




	mod.input = new Sk.builtin.func(function(channel) {
		var pin = getPin(channel.v);
		if(pin.type != "io") {
			throw new Sk.builtin.Exception("Cannot read input from non io pin " + channel.v + " (" + pin.name + ")");
		}
		if(pin.direction != "input") {
			throw new Sk.builtin.Exception("Cannot read input from output pin " + channel.v + " (" + pin.name + ")");
		}
		return pin.voltage > internals.THRESHOLD? mod.HIGH: mod.LOW;
	});

	function output(channel, state){
		var pin = getPin(channel);
		if(pin.type != "io") {
			throw new Sk.builtin.Exception("Cannot set output for non io pin " + channel + " (" + pin.name + ")");
		}
		if(pin.direction != "output") {
			throw new Sk.builtin.Exception("Cannot set output for input pin " + channel + " (" + pin.name + ")");
		}
		pin.voltage = state == 1? 3.3 : 0.0;
		updateIOs();
	}

	mod.output = new Sk.builtin.func(function(channel, state) {
		switch(channel.__proto__.tp$name) {
			case 'int':
			case 'number':
				output(channel.v, state.v);
				break;
			case 'list':
			case 'tuple':
				var pins = Sk.ffi.remapToJs(channel);
				for(var i = 0; i < pins.length; i++) {
					output(pins[i], state.v);
				}

				break;

			default:
				throw new Sk.builtin.Exception("Don't know how to handle a channel type of " + channel.__proto__.tp$name);
				break;
			}
	});

	mod.setmode = new Sk.builtin.func(function(mode) {
		internals.mode = mode;
	});

	mod.getmode = new Sk.builtin.func(function() {
		return internals.mode;
	});

	mod.setwarnings = new Sk.builtin.func(function(warnings) {
		internals.warnings = warnings;
	});

	mod.PWM = new Sk.misceval.buildClass(mod, function($gbl, $loc) {
		$loc.__init__ = new Sk.builtin.func(function(self, pin, frequency){
			self.pinNumber = pin.v;
			self.f = frequency.v;
			self.period = 1000.0 / self.f;

			self.pin = getPin(self.pinNumber);
			if(self.pin.type != "io") {
				throw new Sk.builtin.Exception("Software PWM only works on IO pins");
			}

			if(self.pin.direction != "output") {
				throw new Sk.builtin.Exception("You must set to an output before using PWM");
			}
		});

		$loc.start = new Sk.builtin.func(function(self, dutyCycle) {
			if(!dutyCycle)
				throw new Sk.builtin.Exception("You must specify the duty cycle when starting PWM");
			self.dutyCycle = dutyCycle.v;

			if(dutyCycle < 0 || dutyCycle > 100) {
				throw new Sk.builtin.Exception("Duty cycle must be between 0 and 100");
			}
			if(typeof PWMNextTimeout !== 'undefined')
				clearTimeout(PWMNextTimeout);

			var led = $('#RPi_pin_' + self.pin.physical + ' .out_RPi');

			var high = function() {
				PWMNextTimeout = setTimeout(function() {
					self.pin.voltage = 0;
					//updateIOs();
					led.removeClass('out_RPi_high').addClass('out_RPi_low');
					low();
				}, self.period  * self.dutyCycle / 100)
			};

			var low = function() {
				PWMNextTimeout = setTimeout(function() {
					self.pin.voltage = 3.3;
					//updateIOs();
					led.removeClass('out_RPi_low').addClass('out_RPi_high');
					high();
				}, self.period  * (100 - self.dutyCycle) / 100)
			};

			high();

		});

		$loc.stop = new Sk.builtin.func(function(self) {
			if(PWMNextTimeout)
				clearTimeout(PWMNextTimeout);
		});

		$loc.ChangeDutyCycle = new Sk.builtin.func(function(self, dutyCycle) {
			self.dutyCycle = dutyCycle.v;
		});

		$loc.ChangeFrequence = new Sk.builtin.func(function(self, frequency) {
			self.f = frequency.v;
			self.period = 1000.0 / self.f;
		});



	}, "RPi.GPIO.PWM", []);


	var setup = function(channel, direction, initial, pull_up_down) {
		function changePin(pinNumber) {
			var pin = getPin(pinNumber);
			if(pin.type == "io") {


				if(direction.v == mod.OUT.v) {
					pin.direction = "output";
					if(initial == undefined) {
						initial = mod.LOW;
					}
					pin = initial.v == mod.LOW.v? 0.0 : 3.3;
				} else {
					pin.direction = "input";
					if(pull_up_down && pull_up_down.v == mod.PUD_UP.v) {
						pin.voltage = 3.3;
					} else {
						pin.voltage = 0;
					}

				}
			} else {
				throw new Sk.builtin.Exception("You cannot set pin " + pinNumber + " (" + pin.name + ") to be an input or output");
			}
			updateIOs();
		}

		switch(channel.__proto__.tp$name) {
			case 'number':
			case 'int':
				changePin(channel.v);
				break;
			case 'list':
			case 'tuple':
				var pins = Sk.ffi.remapToJs(channel);
				for(var i = 0; i < pins.length; i++) {
					changePin(pins[i]);
				}


				break;

			default:
				throw new Sk.builtin.Exception("Don't know how to handle a channel type of " + channel.__proto__.tp$name);
				break;
			}
	}

	setup.co_varnames = ["channel", "direction", "initial", "pull_up_down"];
	setup.$defaults = [Sk.builtin.none, Sk.builtin.none, mod.LOW, Sk.builtin.none];
	setup.co_numargs = 4;

	mod.setup = new Sk.builtin.func(setup);
	mod._event_handlers = [];

	var add_event_detect = function(gpio, edge, callback, bouncetime) {
		mod._event_handlers.push({
			gpio: gpio,
			edge: edge,
			callback:callback,
			bouncetime:bouncetime
		});
		//throw new Sk.builtin.Exception("Event detection is not implemented yet");
	};

	add_event_detect.co_varnames = ["gpio", "edge", "callback", "bouncetime"];
	setup.$defaults = [Sk.builtin.none, Sk.builtin.none, Sk.builtin.none, Sk.builtin.none];
	setup.co_numargs = 4;
	mod.add_event_detect = new Sk.builtin.func(add_event_detect);

	


	var cleanup = function(channel) {
		internals.mode = mod.BOARD;

		if(channel == undefined) {
			for(var i = 1; i <= internals.pinCount; i++) {
				var pin = internals.pins[i];
				if(pin.type == "io") {
					setup(Sk.ffi.remapToPy(i), mod.IN);
				}
			}
		} else {
			switch(channel.__proto__.tp$name) {
			case 'number':
			case 'int':
				setup(channel, mod.IN);
				break;
			case 'list':
			case 'tuple':
				var pins = Sk.ffi.remapToJs(channel);
				for(var i = 0; i < pins.length; i++) {
					setup(Sk.ffi.remapToPy(pins[i]), mod.IN);
				}
				break;
			}

		}
		updateIOs();

	};

	cleanup.co_varnames = ["channel"];
	cleanup.$defaults = [Sk.builtin.none];
	cleanup.co_numargs = 1;
	mod.cleanup = new Sk.builtin.func(cleanup);

	mod.RPI_INFO = Sk.ffi.remapToPy({'P1_REVISION': 3, 'RAM': '1024M', 'REVISION': 'a01041', 'TYPE': 'Pi2 Model B', 'PROCESSOR': 'BCM2836', 'MANUFACTURER': 'Sony'});
	mod.VERSION = Sk.builtin.str('0.5.3a');

	var html = '<div id="RPi"><style>.RPi_pin_value {float: right} .out_RPi {width: 10px; height: 10px; display: block; border-radius: 5px;} .out_RPi_low {background-color: #300;} .out_RPi_high {background-color: #F00; box-shadow: 0px 0px 5px #FF0} .RPi_pin_type_power {background-color: #400} .RPi_pin_type_io {background-color: #040} td {background-color: #000;} .RPi_pin_name {font-size: 0.5em; color: #FFF;} #RPi {background-color: #FFF; padding: 10px; border-radius: 10px;} #RPiTable {}</style><h1><img float="left" src="https://upload.wikimedia.org/wikipedia/en/thumb/c/cb/Raspberry_Pi_Logo.svg/810px-Raspberry_Pi_Logo.svg.png" width="50px">RPi GPIO connectors:</h1><table width="100%" id="RPiTable"><tr>';
	for(var i = 2; i <= internals.pinCount; i += 2) {
		html += '<td class="RPi_pin_type_' + internals.pins[i].type + '"><span class="RPi_pin_number">' + i + '</span><span class="RPi_pin_value" id="RPi_pin_' + i + '"></span><div class="RPi_pin_name">' + internals.pins[i].name + '</div></td>';
	}
	html += '</tr><tr>';
	for(var i = 1; i <= internals.pinCount; i += 2) {
		html += '<td class="RPi_pin_type_' + internals.pins[i].type + '"><span class="RPi_pin_number">' + i + '</span><span class="RPi_pin_value" id="RPi_pin_' + i + '"></span><div class="RPi_pin_name">' + internals.pins[i].name + '</div></td>';
	}
	html += '</tr></table></div>';
	$('#RPi').remove();
	PythonIDE.python.output(html, true);

	function updateIOs() {
		console.log("update");
		$('.chk_RPi').unbind();
		for(var i = 1; i <= internals.pinCount; i++) {
			var pin = internals.pins[i];
			if(pin.type =="io") {
				switch(pin.direction) {
					case "input":
						$('#RPi_pin_' + i).html('<input class="chk_RPi" type="checkbox" ' + (pin.voltage > internals.THRESHOLD? 'checked ' : '') + 'id="chk_RPi_' + i + '">');
					break;
					case "output":
						$('#RPi_pin_' + i).html('<span class="out_RPi out_RPi_' + (pin.voltage > internals.THRESHOLD? 'high' : 'low') + '" id="out_RPi_' + i + '"> </span>');
					break;
				}

			}
		}
		$('.chk_RPi').change(function(e) {
			var id = e.currentTarget.id;
			var state = document.getElementById(id).checked;
			var pinNumber = id.split('_')[2];
			var pin = internals.pins[pinNumber];
			var prevVoltage = pin.voltage;
			pin.voltage = state? 3.3 : 0.0;
			var vDiff = pin.voltage - prevVoltage;
			if(vDiff > 0) {
				for(var i = 0; i < mod._event_handlers.length; i++) {
					var h = mod._event_handlers[i];
					if(h.gpio.v == pin.bcm) {
						if(h.edge.v == mod.RISING.v) {
							if(h.callback) {
								Sk.misceval.callsimAsync({}, h.callback, h.gpio);
							}
						}
					}
				}
				
			}
			if(vDiff < 0) {
				for(var i = 0; i < mod._event_handlers.length; i++) {
					var h = mod._event_handlers[i];
					if(h.gpio.v == pin.bcm) {
						if(h.edge.v == mod.FALLING.v) {
							if(h.callback) {
								Sk.misceval.callsimAsync({}, h.callback, h.gpio);
							}
						}
					}
				}
			}

		});
	}
	updateIOs();

	return mod;
}

var RPi = function(name) {
	var mod = {};
	mod.GPIO = new Sk.builtin.module();
	mod.GPIO.$d = new GPIO("RPi.GPIO");
	return mod;
}

var $builtinmodule = function(name) {
	var mod;
	switch(Sk.ffi.remapToJs(name.__name__)) {
		case 'RPi':
			mod = new RPi(name);
		break;
		case 'RPi.GPIO':
			mod = new GPIO(name);
		break;
	}
	return mod;
};
