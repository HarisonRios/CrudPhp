/**
 * QUnit v1.11.0 - A JavaScript Unit Testing Framework
 *
 * http://qunitjs.com
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 */

(function( window ) {

var QUnit,
	assert,
	config,
	onErrorFnPrev,
	testId = 0,
	fileName = (sourceFromStacktrace( 0 ) || "" ).replace(/(:\d+)+\)?/, "").replace(/.+\//, ""),
	toString = Object.prototype.toString,
	hasOwn = Object.prototype.hasOwnProperty,
	// Keep a local reference to Date (GH-283)
	Date = window.Date,
	defined = {
		setTimeout: typeof window.setTimeout !== "undefined",
		sessionStorage: (function() {
			var x = "qunit-test-string";
			try {
				sessionStorage.setItem( x, x );
				sessionStorage.removeItem( x );
				return true;
			} catch( e ) {
				return false;
			}
		}())
	},
	/**
	 * Provides a normalized error string, correcting an issue
	 * with IE 7 (and prior) where Error.prototype.toString is
	 * not properly implemented
	 *
	 * Based on http://es5.github.com/#x15.11.4.4
	 *
	 * @param {String|Error} error
	 * @return {String} error message
	 */
	errorString = function( error ) {
		var name, message,
			errorString = error.toString();
		if ( errorString.substring( 0, 7 ) === "[object" ) {
			name = error.name ? error.name.toString() : "Error";
			message = error.message ? error.message.toString() : "";
			if ( name && message ) {
				return name + ": " + message;
			} else if ( name ) {
				return name;
			} else if ( message ) {
				return message;
			} else {
				return "Error";
			}
		} else {
			return errorString;
		}
	},
	/**
	 * Makes a clone of an object using only Array or Object as base,
	 * and copies over the own enumerable properties.
	 *
	 * @param {Object} obj
	 * @return {Object} New object with only the own properties (recursively).
	 */
	objectValues = function( obj ) {
		// Grunt 0.3.x uses an older version of jshint that still has jshint/jshint#392.
		/*jshint newcap: false */
		var key, val,
			vals = QUnit.is( "array", obj ) ? [] : {};
		for ( key in obj ) {
			if ( hasOwn.call( obj, key ) ) {
				val = obj[key];
				vals[key] = val === Object(val) ? objectValues(val) : val;
			}
		}
		return vals;
	};

function Test( settings ) {
	extend( this, settings );
	this.assertions = [];
	this.testNumber = ++Test.count;
}

Test.count = 0;

Test.prototype = {
	init: function() {
		var a, b, li,
			tests = id( "qunit-tests" );

		if ( tests ) {
			b = document.createElement( "strong" );
			b.innerHTML = this.nameHtml;

			// `a` initialized at top of scope
			a = document.createElement( "a" );
			a.innerHTML = "Rerun";
			a.href = QUnit.url({ testNumber: this.testNumber });

			li = document.createElement( "li" );
			li.appendChild( b );
			li.appendChild( a );
			li.className = "running";
			li.id = this.id = "qunit-test-output" + testId++;

			tests.appendChild( li );
		}
	},
	setup: function() {
		if ( this.module !== config.previousModule ) {
			if ( config.previousModule ) {
				runLoggingCallbacks( "moduleDone", QUnit, {
					name: config.previousModule,
					failed: config.moduleStats.bad,
					passed: config.moduleStats.all - config.moduleStats.bad,
					total: config.moduleStats.all
				});
			}
			config.previousModule = this.module;
			config.moduleStats = { all: 0, bad: 0 };
			runLoggingCallbacks( "moduleStart", QUnit, {
				name: this.module
			});
		} else if ( config.autorun ) {
			runLoggingCallbacks( "moduleStart", QUnit, {
				name: this.module
			});
		}

		config.current = this;

		this.testEnvironment = extend({
			setup: function() {},
			teardown: function() {}
		}, this.moduleTestEnvironment );

		this.started = +new Date();
		runLoggingCallbacks( "testStart", QUnit, {
			name: this.testName,
			module: this.module
		});

		// allow utility functions to access the current test environment
		// TODO why??
		QUnit.current_testEnvironment = this.testEnvironment;

		if ( !config.pollution ) {
			saveGlobal();
		}
		if ( config.notrycatch ) {
			this.testEnvironment.setup.call( this.testEnvironment );
			return;
		}
		try {
			this.testEnvironment.setup.call( this.testEnvironment );
		} catch( e ) {
			QUnit.pushFailure( "Setup failed on " + this.testName + ": " + ( e.message || e ), extractStacktrace( e, 1 ) );
		}
	},
	run: function() {
		config.current = this;

		var running = id( "qunit-testresult" );

		if ( running ) {
			running.innerHTML = "Running: <br/>" + this.nameHtml;
		}

		if ( this.async ) {
			QUnit.stop();
		}

		this.callbackStarted = +new Date();

		if ( config.notrycatch ) {
			this.callback.call( this.testEnvironment, QUnit.assert );
			this.callbackRuntime = +new Date() - this.callbackStarted;
			return;
		}

		try {
			this.callback.call( this.testEnvironment, QUnit.assert );
			this.callbackRuntime = +new Date() - this.callbackStarted;
		} catch( e ) {
			this.callbackRuntime = +new Date() - this.callbackStarted;

			QUnit.pushFailure( "Died on test #" + (this.assertions.length + 1) + " " + this.stack + ": " + ( e.message || e ), extractStacktrace( e, 0 ) );
			// else next test will carry the responsibility
			saveGlobal();

			// Restart the tests if they're blocking
			if ( config.blocking ) {
				QUnit.start();
			}
		}
	},
	teardown: function() {
		config.current = this;
		if ( config.notrycatch ) {
			if ( typeof this.callbackRuntime === "undefined" ) {
				this.callbackRuntime = +new Date() - this.callbackStarted;
			}
			this.testEnvironment.teardown.call( this.testEnvironment );
			return;
		} else {
			try {
				this.testEnvironment.teardown.call( this.testEnvironment );
			} catch( e ) {
				QUnit.pushFailure( "Teardown failed on " + this.testName + ": " + ( e.message || e ), extractStacktrace( e, 1 ) );
			}
		}
		checkPollution();
	},
	finish: function() {
		config.current = this;
		if ( config.requireExpects && this.expected === null ) {
			QUnit.pushFailure( "Expected number of assertions to be defined, but expect() was not called.", this.stack );
		} else if ( this.expected !== null && this.expected !== this.assertions.length ) {
			QUnit.pushFailure( "Expected " + this.expected + " assertions, but " + this.assertions.length + " were run", this.stack );
		} else if ( this.expected === null && !this.assertions.length ) {
			QUnit.pushFailure( "Expected at least one assertion, but none were run - call expect(0) to accept zero assertions.", this.stack );
		}

		var i, assertion, a, b, time, li, ol,
			test = this,
			good = 0,
			bad = 0,
			tests = id( "qunit-tests" );

		this.runtime = +new Date() - this.started;
		config.stats.all += this.assertions.length;
		config.moduleStats.all += this.assertions.length;

		if ( tests ) {
			ol = document.createElement( "ol" );
			ol.className = "qunit-assert-list";

			for ( i = 0; i < this.assertions.length; i++ ) {
				assertion = this.assertions[i];

				li = document.createElement( "li" );
				li.className = assertion.result ? "pass" : "fail";
				li.innerHTML = assertion.message || ( assertion.result ? "okay" : "failed" );
				ol.appendChild( li );

				if ( assertion.result ) {
					good++;
				} else {
					bad++;
					config.stats.bad++;
					config.moduleStats.bad++;
				}
			}

			// store result when possible
			if ( QUnit.config.reorder && defined.sessionStorage ) {
				if ( bad ) {
					sessionStorage.setItem( "qunit-test-" + this.module + "-" + this.testName, bad );
				} else {
					sessionStorage.removeItem( "qunit-test-" + this.module + "-" + this.testName );
				}
			}

			if ( bad === 0 ) {
				addClass( ol, "qunit-collapsed" );
			}

			// `b` initialized at top of scope
			b = document.createElement( "strong" );
			b.innerHTML = this.nameHtml + " <b class='counts'>(<b class='failed'>" + bad + "</b>, <b class='passed'>" + good + "</b>, " + this.assertions.length + ")</b>";

			addEvent(b, "click", function() {
				var next = b.parentNode.lastChild,
					collapsed = hasClass( next, "qunit-collapsed" );
				( collapsed ? removeClass : addClass )( next, "qunit-collapsed" );
			});

			addEvent(b, "dblclick", function( e ) {
				var target = e && e.target ? e.target : window.event.srcElement;
				if ( target.nodeName.toLowerCase() === "span" || target.nodeName.toLowerCase() === "b" ) {
					target = target.parentNode;
				}
				if ( window.location && target.nodeName.toLowerCase() === "strong" ) {
					window.location = QUnit.url({ testNumber: test.testNumber });
				}
			});

			// `time` initialized at top of scope
			time = document.createElement( "span" );
			time.className = "runtime";
			time.innerHTML = this.runtime + " ms";

			// `li` initialized at top of scope
			li = id( this.id );
			li.className = bad ? "fail" : "pass";
			li.removeChild( li.firstChild );
			a = li.firstChild;
			li.appendChild( b );
			li.appendChild( a );
			li.appendChild( time );
			li.appendChild( ol );

		} else {
			for ( i = 0; i < this.assertions.length; i++ ) {
				if ( !this.assertions[i].result ) {
					bad++;
					config.stats.bad++;
					config.moduleStats.bad++;
				}
			}
		}

		runLoggingCallbacks( "testDone", QUnit, {
			name: this.testName,
			module: this.module,
			failed: bad,
			passed: this.assertions.length - bad,
			total: this.assertions.length,
			duration: this.runtime
		});

		QUnit.reset();

		config.current = undefined;
	},

	queue: function() {
		var bad,
			test = this;

		synchronize(function() {
			test.init();
		});
		function run() {
			// each of these can by async
			synchronize(function() {
				test.setup();
			});
			synchronize(function() {
				test.run();
			});
			synchronize(function() {
				test.teardown();
			});
			synchronize(function() {
				test.finish();
			});
		}

		// `bad` initialized at top of scope
		// defer when previous test run passed, if storage is available
		bad = QUnit.config.reorder && defined.sessionStorage &&
						+sessionStorage.getItem( "qunit-test-" + this.module + "-" + this.testName );

		if ( bad ) {
			run();
		} else {
			synchronize( run, true );
		}
	}
};

// Root QUnit object.
// `QUnit` initialized at top of scope
QUnit = {

	// call on start of module test to prepend name to all tests
	module: function( name, testEnvironment ) {
		config.currentModule = name;
		config.currentModuleTestEnvironment = testEnvironment;
		config.modules[name] = true;
	},

	asyncTest: function( testName, expected, callback ) {
		if ( arguments.length === 2 ) {
			callback = expected;
			expected = null;
		}

		QUnit.test( testName, expected, callback, true );
	},

	test: function( testName, expected, callback, async ) {
		var test,
			nameHtml = "<span class='test-name'>" + escapeText( testName ) + "</span>";

		if ( arguments.length === 2 ) {
			callback = expected;
			expected = null;
		}

		if ( config.currentModule ) {
			nameHtml = "<span class='module-name'>" + escapeText( config.currentModule ) + "</span>: " + nameHtml;
		}

		test = new Test({
			nameHtml: nameHtml,
			testName: testName,
			expected: expected,
			async: async,
			callback: callback,
			module: config.currentModule,
			moduleTestEnvironment: config.currentModuleTestEnvironment,
			stack: sourceFromStacktrace( 2 )
		});

		if ( !validTest( test ) ) {
			return;
		}

		test.queue();
	},

	// Specify the number of expected assertions to gurantee that failed test (no assertions are run at all) don't slip through.
	expect: function( asserts ) {
		if (arguments.length === 1) {
			config.current.expected = asserts;
		} else {
			return config.current.expected;
		}
	},

	start: function( count ) {
		// QUnit hasn't been initialized yet.
		// Note: RequireJS (et al) may delay onLoad
		if ( config.semaphore === undefined ) {
			QUnit.begin(function() {
				// This is triggered at the top of QUnit.load, push start() to the event loop, to allow QUnit.load to finish first
				setTimeout(function() {
					QUnit.start( count );
				});
			});
			return;
		}

		config.semaphore -= count || 1;
		// don't start until equal number of stop-calls
		if ( config.semaphore > 0 ) {
			return;
		}
		// ignore if start is called more often then stop
		if ( config.semaphore < 0 ) {
			config.semaphore = 0;
			QUnit.pushFailure( "Called start() while already started (QUnit.config.semaphore was 0 already)", null, sourceFromStacktrace(2) );
			return;
		}
		// A slight delay, to avoid any current callbacks
		if ( defined.setTimeout ) {
			window.setTimeout(function() {
				if ( config.semaphore > 0 ) {
					return;
				}
				if ( config.timeout ) {
					clearTimeout( config.timeout );
				}

				config.blocking = false;
				process( true );
			}, 13);
		} else {
			config.blocking = false;
			process( true );
		}
	},

	stop: function( count ) {
		config.semaphore += count || 1;
		config.blocking = true;

		if ( config.testTimeout && defined.setTimeout ) {
			clearTimeout( config.timeout );
			config.timeout = window.setTimeout(function() {
				QUnit.ok( false, "Test timed out" );
				config.semaphore = 1;
				QUnit.start();
			}, config.testTimeout );
		}
	}
};

// `assert` initialized at top of scope
// Asssert helpers
// All of these must either call QUnit.push() or manually do:
// - runLoggingCallbacks( "log", .. );
// - config.current.assertions.push({ .. });
// We attach it to the QUnit object *after* we expose the public API,
// otherwise `assert` will become a global variable in browsers (#341).
assert = {
	/**
	 * Asserts rough true-ish result.
	 * @name ok
	 * @function
	 * @example ok( "asdfasdf".length > 5, "There must be at least 5 chars" );
	 */
	ok: function( result, msg ) {
		if ( !config.current ) {
			throw new Error( "ok() assertion outside test context, was " + sourceFromStacktrace(2) );
		}
		result = !!result;

		var source,
			details = {
				module: config.current.module,
				name: config.current.testName,
				result: result,
				message: msg
			};

		msg = escapeText( msg || (result ? "okay" : "failed" ) );
		msg = "<span class='test-message'>" + msg + "</span>";

		if ( !result ) {
			source = sourceFromStacktrace( 2 );
			if ( source ) {
				details.source = source;
				msg += "<table><tr class='test-source'><th>Source: </th><td><pre>" + escapeText( source ) + "</pre></td></tr></table>";
			}
		}
		runLoggingCallbacks( "log", QUnit, details );
		config.current.assertions.push({
			result: result,
			message: msg
		});
	},

	/**
	 * Assert that the first two arguments are equal, with an optional message.
	 * Prints out both actual and expected values.
	 * @name equal
	 * @function
	 * @example equal( format( "Received {0} bytes.", 2), "Received 2 bytes.", "format() replaces {0} with next argument" );
	 */
	equal: function( actual, expected, message ) {
		/*jshint eqeqeq:false */
		QUnit.push( expected == actual, actual, expected, message );
	},

	/**
	 * @name notEqual
	 * @function
	 */
	notEqual: function( actual, expected, message ) {
		/*jshint eqeqeq:false */
		QUnit.push( expected != actual, actual, expected, message );
	},

	/**
	 * @name propEqual
	 * @function
	 */
	propEqual: function( actual, expected, message ) {
		actual = objectValues(actual);
		expected = objectValues(expected);
		QUnit.push( QUnit.equiv(actual, expected), actual, expected, message );
	},

	/**
	 * @name notPropEqual
	 * @function
	 */
	notPropEqual: function( actual, expected, message ) {
		actual = objectValues(actual);
		expected = objectValues(expected);
		QUnit.push( !QUnit.equiv(actual, expected), actual, expected, message );
	},

	/**
	 * @name deepEqual
	 * @function
	 */
	deepEqual: function( actual, expected, message ) {
		QUnit.push( QUnit.equiv(actual, expected), actual, expected, message );
	},

	/**
	 * @name notDeepEqual
	 * @function
	 */
	notDeepEqual: function( actual, expected, message ) {
		QUnit.push( !QUnit.equiv(actual, expected), actual, expected, message );
	},

	/**
	 * @name strictEqual
	 * @function
	 */
	strictEqual: function( actual, expected, message ) {
		QUnit.push( expected === actual, actual, expected, message );
	},

	/**
	 * @name notStrictEqual
	 * @function
	 */
	notStrictEqual: function( actual, expected, message ) {
		QUnit.push( expected !== actual, actual, expected, message );
	},

	"throws": function( block, expected, message ) {
		var actual,
			expectedOutput = expected,
			ok = false;

		// 'expected' is optional
		if ( typeof expected === "string" ) {
			message = expected;
			expected = null;
		}

		config.current.ignoreGlobalErrors = true;
		try {
			block.call( config.current.testEnvironment );
		} catch (e) {
			actual = e;
		}
		config.current.ignoreGlobalErrors = false;

		if ( actual ) {
			// we don't want to validate thrown error
			if ( !expected ) {
				ok = true;
				expectedOutput = null;
			// expected is a regexp
			} else if ( QUnit.objectType( expected ) === "regexp" ) {
				ok = expected.test( errorString( actual ) );
			// expected is a constructor
			} else if ( actual instanceof expected ) {
				ok = true;
			// expected is a validation function which returns true is validation passed
			} else if ( expected.call( {}, actual ) === true ) {
				expectedOutput = null;
				ok = true;
			}

			QUnit.push( ok, actual, expectedOutput, message );
		} else {
			QUnit.pushFailure( message, null, 'No exception was thrown.' );
		}
	}
};

/**
 * @deprecate since 1.8.0
 * Kept assertion helpers in root for backwards compatibility.
 */
extend( QUnit, assert );

/**
 * @deprecated since 1.9.0
 * Kept root "raises()" for backwards compatibility.
 * (Note that we don't introduce assert.raises).
 */
QUnit.raises = assert[ "throws" ];

/**
 * @deprecated since 1.0.0, replaced with error pushes since 1.3.0
 * Kept to avoid TypeErrors for undefined methods.
 */
QUnit.equals = function() {
	QUnit.push( false, false, false, "QUnit.equals has been deprecated since 2009 (e88049a0), use QUnit.equal instead" );
};
QUnit.same = function() {
	QUnit.push( false, false, false, "QUnit.same has been deprecated since 2009 (e88049a0), use QUnit.deepEqual instead" );
};

// We want access to the constructor's prototype
(function() {
	function F() {}
	F.prototype = QUnit;
	QUnit = new F();
	// Make F QUnit's constructor so that we can add to the prototype later
	QUnit.constructor = F;
}());

/**
 * Config object: Maintain internal state
 * Later exposed as QUnit.config
 * `config` initialized at top of scope
 */
config = {
	// The queue of tests to run
	queue: [],

	// block until document ready
	blocking: true,

	// when enabled, show only failing tests
	// gets persisted through sessionStorage and can be changed in UI via checkbox
	hidepassed: false,

	// by default, run previously failed tests first
	// very useful in combination with "Hide passed tests" checked
	reorder: true,

	// by default, modify document.title when suite is done
	altertitle: true,

	// when enabled, all tests must call expect()
	requireExpects: false,

	// add checkboxes that are persisted in the query-string
	// when enabled, the id is set to `true` as a `QUnit.config` property
	urlConfig: [
		{
			id: "noglobals",
			label: "Check for Globals",
			tooltip: "Enabling this will test if any test introduces new properties on the `window` object. Stored as query-strings."
		},
		{
			id: "notrycatch",
			label: "No try-catch",
			tooltip: "Enabling this will run tests outside of a try-catch block. Makes debugging exceptions in IE reasonable. Stored as query-strings."
		}
	],

	// Set of all modules.
	modules: {},

	// logging callback queues
	begin: [],
	done: [],
	log: [],
	testStart: [],
	testDone: [],
	moduleStart: [],
	moduleDone: []
};

// Export global variables, unless an 'exports' object exists,
// in that case we assume we're in CommonJS (dealt with on the bottom of the script)
if ( typeof exports === "undefined" ) {
	extend( window, QUnit );

	// Expose QUnit object
	window.QUnit = QUnit;
}

// Initialize more QUnit.config and QUnit.urlParams
(function() {
	var i,
		location = window.location || { search: "", protocol: "file:" },
		params = location.search.slice( 1 ).split( "&" ),
		length = params.length,
		urlParams = {},
		current;

	if ( params[ 0 ] ) {
		for ( i = 0; i < length; i++ ) {
			current = params[ i ].split( "=" );
			current[ 0 ] = decodeURIComponent( current[ 0 ] );
			// allow just a key to turn on a flag, e.g., test.html?noglobals
			current[ 1 ] = current[ 1 ] ? decodeURIComponent( current[ 1 ] ) : true;
			urlParams[ current[ 0 ] ] = current[ 1 ];
		}
	}

	QUnit.urlParams = urlParams;

	// String search anywhere in moduleName+testName
	config.filter = urlParams.filter;

	// Exact match of the module name
	config.module = urlParams.module;

	config.testNumber = parseInt( urlParams.testNumber, 10 ) || null;

	// Figure out if we're running the tests from a server or not
	QUnit.isLocal = location.protocol === "file:";
}());

// Extend QUnit object,
// these after set here because they should not be exposed as global functions
extend( QUnit, {
	assert: assert,

	config: config,

	// Initialize the configuration options
	init: function() {
		extend( config, {
			stats: { all: 0, bad: 0 },
			moduleStats: { all: 0, bad: 0 },
			started: +new Date(),
			updateRate: 1000,
			blocking: false,
			autostart: true,
			autorun: false,
			filter: "",
			queue: [],
			semaphore: 1
		});

		var tests, banner, result,
			qunit = id( "qunit" );

		if ( qunit ) {
			qunit.innerHTML =
				"<h1 id='qunit-header'>" + escapeText( document.title ) + "</h1>" +
				"<h2 id='qunit-banner'></h2>" +
				"<div id='qunit-testrunner-toolbar'></div>" +
				"<h2 id='qunit-userAgent'></h2>" +
				"<ol id='qunit-tests'></ol>";
		}

		tests = id( "qunit-tests" );
		banner = id( "qunit-banner" );
		result = id( "qunit-testresult" );

		if ( tests ) {
			tests.innerHTML = "";
		}

		if ( banner ) {
			banner.className = "";
		}

		if ( result ) {
			result.parentNode.removeChild( result );
		}

		if ( tests ) {
			result = document.createElement( "p" );
			result.id = "qunit-testresult";
			result.className = "result";
			tests.parentNode.insertBefore( result, tests );
			result.innerHTML = "Running...<br/>&nbsp;";
		}
	},

	// Resets the test setup. Useful for tests that modify the DOM.
	reset: function() {
		var fixture = id( "qunit-fixture" );
		if ( fixture ) {
			fixture.innerHTML = config.fixture;
		}
	},

	// Trigger an event on an element.
	// @example triggerEvent( document.body, "click" );
	triggerEvent: function( elem, type, event ) {
		if ( document.createEvent ) {
			event = document.createEvent( "MouseEvents" );
			event.initMouseEvent(type, true, true, elem.ownerDocument.defaultView,
				0, 0, 0, 0, 0, false, false, false, false, 0, null);

			elem.dispatchEvent( event );
		} else if ( elem.fireEvent ) {
			elem.fireEvent( "on" + type );
		}
	},

	// Safe object type checking
	is: function( type, obj ) {
		return QUnit.objectType( obj ) === type;
	},

	objectType: function( obj ) {
		if ( typeof obj === "undefined" ) {
				return "undefined";
		// consider: typeof null === object
		}
		if ( obj === null ) {
				return "null";
		}

		var match = toString.call( obj ).match(/^\[object\s(.*)\]$/),
			type = match && match[1] || "";

		switch ( type ) {
			case "Number":
				if ( isNaN(obj) ) {
					return "nan";
				}
				return "number";
			case "String":
			case "Boolean":
			case "Array":
			case "Date":
			case "RegExp":
			case "Function":
				return type.toLowerCase();
		}
		if ( typeof obj === "object" ) {
			return "object";
		}
		return undefined;
	},

	push: function( result, actual, expected, message ) {
		if ( !config.current ) {
			throw new Error( "assertion outside test context, was " + sourceFromStacktrace() );
		}

		var output, source,
			details = {
				module: config.current.module,
				name: config.current.testName,
				result: result,
				message: message,
				actual: actual,
				expected: expected
			};

		message = escapeText( message ) || ( result ? "okay" : "failed" );
		message = "<span class='test-message'>" + message + "</span>";
		output = message;

		if ( !result ) {
			expected = escapeText( QUnit.jsDump.parse(expected) );
			actual = escapeText( QUnit.jsDump.parse(actual) );
			output += "<table><tr class='test-expected'><th>Expected: </th><td><pre>" + expected + "</pre></td></tr>";

			if ( actual !== expected ) {
				output += "<tr class='test-actual'><th>Result: </th><td><pre>" + actual + "</pre></td></tr>";
				output += "<tr class='test-diff'><th>Diff: </th><td><pre>" + QUnit.diff( expected, actual ) + "</pre></td></tr>";
			}

			source = sourceFromStacktrace();

			if ( source ) {
				details.source = source;
				output += "<tr class='test-source'><th>Source: </th><td><pre>" + escapeText( source ) + "</pre></td></tr>";
			}

			output += "</table>";
		}

		runLoggingCallbacks( "log", QUnit, details );

		config.current.assertions.push({
			result: !!result,
			message: output
		});
	},

	pushFailure: function( message, source, actual ) {
		if ( !config.current ) {
			throw new Error( "pushFailure() assertion outside test context, was " + sourceFromStacktrace(2) );
		}

		var output,
			details = {
				module: config.current.module,
				name: config.current.testName,
				result: false,
				message: message
			};

		message = escapeText( message ) || "error";
		message = "<span class='test-message'>" + message + "</span>";
		output = message;

		output += "<table>";

		if ( actual ) {
			output += "<tr class='test-actual'><th>Result: </th><td><pre>" + escapeText( actual ) + "</pre></td></tr>";
		}

		if ( source ) {
			details.source = source;
			output += "<tr class='test-source'><th>Source: </th><td><pre>" + escapeText( source ) + "</pre></td></tr>";
		}

		output += "</table>";

		runLoggingCallbacks( "log", QUnit, details );

		config.current.assertions.push({
			result: false,
			message: output
		});
	},

	url: function( params ) {
		params = extend( extend( {}, QUnit.urlParams ), params );
		var key,
			querystring = "?";

		for ( key in params ) {
			if ( !hasOwn.call( params, key ) ) {
				continue;
			}
			querystring += encodeURIComponent( key ) + "=" +
				encodeURIComponent( params[ key ] ) + "&";
		}
		return window.location.protocol + "//" + window.location.host +
			window.location.pathname + querystring.slice( 0, -1 );
	},

	extend: extend,
	id: id,
	addEvent: addEvent
	// load, equiv, jsDump, diff: Attached later
});

/**
 * @deprecated: Created for backwards compatibility with test runner that set the hook function
 * into QUnit.{hook}, instead of invoking it and passing the hook function.
 * QUnit.constructor is set to the empty F() above so that we can add to it's prototype here.
 * Doing this allows us to tell if the following methods have been overwritten on the actual
 * QUnit object.
 */
extend( QUnit.constructor.prototype, {

	// Logging callbacks; all receive a single argument with the listed properties
	// run test/logs.html for any related changes
	begin: registerLoggingCallback( "begin" ),

	// done: { failed, passed, total, runtime }
	done: registerLoggingCallback( "done" ),

	// log: { result, actual, expected, message }
	log: registerLoggingCallback( "log" ),

	// testStart: { name }
	testStart: registerLoggingCallback( "testStart" ),

	// testDone: { name, failed, passed, total, duration }
	testDone: registerLoggingCallback( "testDone" ),

	// moduleStart: { name }
	moduleStart: registerLoggingCallback( "moduleStart" ),

	// moduleDone: { name, failed, passed, total }
	moduleDone: registerLoggingCallback( "moduleDone" )
});

if ( typeof document === "undefined" || document.readyState === "complete" ) {
	config.autorun = true;
}

QUnit.load = function() {
	runLoggingCallbacks( "begin", QUnit, {} );

	// Initialize the config, saving the execution queue
	var banner, filter, i, label, len, main, ol, toolbar, userAgent, val,
		urlConfigCheckboxesContainer, urlConfigCheckboxes, moduleFilter,
		numModules = 0,
		moduleFilterHtml = "",
		urlConfigHtml = "",
		oldconfig = extend( {}, config );

	QUnit.init();
	extend(config, oldconfig);

	config.blocking = false;

	len = config.urlConfig.length;

	for ( i = 0; i < len; i++ ) {
		val = config.urlConfig[i];
		if ( typeof val === "string" ) {
			val = {
				id: val,
				label: val,
				tooltip: "[no tooltip available]"
			};
		}
		config[ val.id ] = QUnit.urlParams[ val.id ];
		urlConfigHtml += "<input id='qunit-urlconfig-" + escapeText( val.id ) +
			"' name='" + escapeText( val.id ) +
			"' type='checkbox'" + ( config[ val.id ] ? " checked='checked'" : "" ) +
			" title='" + escapeText( val.tooltip ) +
			"'><label for='qunit-urlconfig-" + escapeText( val.id ) +
			"' title='" + escapeText( val.tooltip ) + "'>" + val.label + "</label>";
	}

	moduleFilterHtml += "<label for='qunit-modulefilter'>Module: </label><select id='qunit-modulefilter' nhbin �                       ����p x A E w g q 8 I h b V I T e k G 3 J w O E H a i 6 s 6 l 6 Y O 7 f d 6 N + l R Y J 8 = ! 1 1 . 0 . 1 9 0 4 1 . 1 # ����vk    �F          ����lh ���A��`���nk  �6��+�   �N       ������   ���  ����       T   t       J   x86_microsoft-windows-indeo4-codecs_31bf3856ad364e35_none_763ad9bdf0b38c8d      ����vk   �          SomeUnparsedVersionsExist       ����`���x�(����`�����vk) t    �      f256!ir41_32original.dll_5c793dcf80a9cc13       ����h N N M k K q D I u o 4 q V U G n b M C 0 A f p v 5 8 T C 8 Z O G X z r D j R S M 1 4 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk  t   ��      f256!ir41_32.ax_f13f4f5f862a8f03����G F r h k k k 3 W o s z Z y 4 h H C r L G i / K 6 T 7 7 7 z 2 0 I 2 r + K J Q Z q 0 w = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk) t   p�      f256!ir41_qcoriginal.dll_84a925b3131f35ee       ����r a t t R 5 a J d J 2 P F Z W d A M J / J r v C F 0 A Z l m 3 P K F c T M c s q U 8 o = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk! t   (�      f256!ir41_qc.dll_1c199576b1b19497       ����l V Q Y q d c r s 6 4 i 7 8 s 5 J C R p m 6 P z D 8 K R e 9 3 L U S e v n / N P A o 8 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk* t   �      f256!ir41_qcxoriginal.dll_0db643799ca1851e      ����8 4 i M 8 F 7 s t M I u + Z 1 6 p 8 X 4 x P Y f B V / y g H 1 X p s w 3 O H E 6 T t k = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk" t   ��      f256!ir41_qcx.dll_1c193012ca1a353d      ����6 c h U T O y 6 C 5 p d n R g f X 8 h 3 Y 6 U W T a b m D y k K 1 K 1 J 3 8 R m 6 w Y = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  �6��+�   ��        ��������   ���  ����                      v!10.0.19041.1  ����vk    �F        ����x�����lh �bL;0`���nk  񘡹+�   �N       �����	   ���  ����       T   t       J   x86_microsoft-windows-indeo5-codecs_31bf3856ad364e35_none_78215157edd9d926      ����vk   �          SomeUnparsedVersionsExist       ����H���h� ����X��ȼ����vk) t   �      f256!ir50_32original.dll_e451fbcfeed3a44b       ����h M b p W + L f U g c A b 5 u V G u g F 3 E s C u l q z M e n R X 5 N r I D g v A s I = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk! t   ��      f256!ir50_32.dll_256dc1a29b58a174       ����6 D h h 4 z H p D y p B z X S e M 2 F P t h W V w b n i n Z g I u N 1 o z D i W j E c = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk) t   h�      f256!ir50_qcoriginal.dll_0c81e3bc81490e26       ����V l I U L 7 h I F X 6 c H 0 W Y 8 j / k J s t N g X T P E r Z + A + H o 6 c R k s Y E = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk! t    �      f256!ir50_qc.dll_1d15b478ad4208cf       ����B o / 8 T f E W F 4 U a U o d b D g L i R s V u A n c I U K w G Q U A f h l e N j M c = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk* t   �      f256!ir50_qcxoriginal.dll_958f0182f565cf14      ����s x 4 2 s h E v s x U F k n c J Q Y Y P D l m + R s g c j 2 h Z A Q J D d 5 9 W B + U = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk" t   ��      f256!ir50_qcx.dll_1d154f14c52d9a33      ����C m 8 X O 7 h 9 J i I a 9 n P w d i J k S Z v W B s 5 F B J z R Q D X 6 A i k K / j 4 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk! t   P�      f256!iac25_32.ax_2a18dae9af0a9a19       ����7 I R / V h L c L T X H D h 1 7 / x M F W H d u D Y C g R U l m z I D B A I w D E k 0 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����vk t   �      f256!ivfsrc.ax  ����d t O 0 u m I o U V p h I F t r y + y 3 F q U Y H j 4 d h 7 V h 2 W A J A g y X 7 2 8 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  񘡹+�   ��        ��������   ��  ����                      v!10.0.19041.1  ����vk    �F        ����Ƚ����lh h�bL;0`���nk  #u?�+�   �N       (�����   о�  ����       2   t       O   x86_microsoft-windows-isoburn.resources_31bf3856ad364e35_pt-br_11776be776a23f76 ����vk   �          SomeUnparsedVersionsExist       �������    ����vk t   �      f256!isoburn.exe.mui    ����R l 2 Z p 5 m C G P k M + u h z / y M h w j I P f C j D R V i T 2 g d X R 8 1 S s x 8 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  #u?�+�   ��        ��������    ��  ����                      v!10.0.19041.1  ����vk    �N         hbin �                       ���������lh ��bL;0h���nk  Ȉ��   �N       p�����   ���  ����            x       D   x86_microsoft-windows-isoburn_31bf3856ad364e35_none_e66931df3eb65d6e    ����vk x   ��      f256!isoburn.exe���2 P l O d + Y N l m J T N j P P 2 z H n n y n U V W b M W P B z O k L K c s Z A G E w = ! 1 0 . 0 . 1 9 0 4 1 . 7 4 6 # R G Y D s m w M b C p K t s 1 A o d z A z T i S x A 7 e h K U X R g H T O g g K j u c = ! 1 0 . 0 . 1 9 0 4 1 . 1 # �������   nk  �56|,�   8�        ��������   h���������                      v!10.0.19041.1      vk    �F        m    P�����lh ����������nk  ��_.�   8�        ��������    ��  ����                      v!10.0.19041.746����vk    �F          ������X���nk  n�-:ė�   �N       ������   ���  ����"       &   z       S   x86_microsoft-windows-l..efault-professional_31bf3856ad364e35_none_ca54fae21ab7c665     ����vk z   ��    E f256!license.rtf���7 p Q Y n i Q K b F V L T c z L a C O K i F y L g D r N D / P / 3 A 2 D v T O v B m s = ! 1 0 . 0 . 1 9 0 4 1 . 1 4 1 5 # V U 2 Q Q g M j L m O k x H L r o o 4 K z j 7 q 8 M I l M 3 m h t v j J L V h 3 1 8 k = ! 1 0 . 0 . 1 9 0 4 1 . 1 #       ��������    ����vk z   �    . f256!de-license.rtf ��?���7 p Q Y n i Q K b F V L T c z L a C O K i F y L g D r N D / P / 3 A 2 D v T O v B m s = ! 1 0 . 0 . 1 9 0 4 1 . 1 4 1 5 # V U 2 Q Q g M j L m O k x H L r o o 4 K z j 7 q 8 M I l M 3 m h t v j J L V h 3 1 8 k = ! 1 0 . 0 . 1 9 0 4 1 . 1 #       �   nk  �&��+�   �        ��������   ����������                      v!10.0.19041.1      vk    �F       ?   h�����lh ���w�D���w�D����nk  P��<-�   �        ��������    ��  ����                      v!10.0.19041.1415 . 0 . ����vk    �F       ?�����X���nk  �ܠ�ė�   �N       x�����   ���  ����"           z       T   x86_microsoft-windows-l..fessional.resources_31bf3856ad364e35_pt-br_1c80ab3f0f7ce15b    ����vk z   ��      f256!license.rtf���V j g w w O z C m 1 7 9 o F 4 k A X o C 3 Z w B X / 2 r w d D U / 2 n 9 a J + z q J E = ! 1 0 . 0 . 1 9 0 4 1 . 1 4 1 5 # P o a 7 P H z S 3 i X b 8 Q a O k t D u B i 0 l 6 q t M 5 Q a I M f E K m w y l c K 4 = ! 1 0 . 0 . 1 9 0 4 1 . 1 #       �������   nk  ����+�   (�        ��������   p���������                      v!10.0.19041.1      vk    �N       1    X�����lh ���w�D���w�D����nk  Ն�>.�   (�        ��������   ��  ����                      v!10.0.19041.1415       ����vk    �N         ������X���nk  d�ė�   �N       �����   ���  ����"           z       T   x86_microsoft-windows-l..fessional.resources_31bf3856ad364e35_pt-br_75e427b000dc49ec    ����vk z   ��      f256!license.rtfh���V W o 1 + J F B I I o F Z z l X W k 7 X r Q E Y + A 6 U f o 4 W Y a J H 5 b g V M g c = ! 1 0 . 0 . 1 9 0 4 1 . 1 4 1 5 # 1 0 . 0 . 1 9 0 4 1 . 1 # �������   nk  ����+�   �        ��������    ���������                      v!10.0.19041.1      vk    �N       I    ������lh  ��w�D ��w�D����nk  ����+�   �        ��������   ���  ����                      v!10.0.19041.1415       ����vk    �N         ������X���nk  d�ė�   �N       ������   p��  ����"           z       T   x86_microsoft-windows-l..fessional.resources_31bf3856ad364e35_pt-br_95702970da1cf41b    ����vk z   x�      f256!license.rtf���V j g w w O z C m 1 7 9 o F 4 k A X o C 3 Z w B X / 2 r w d D U / 2 n 9 a J + z q J E = ! 1 0 . 0 . 1 9 0 4 1 . 1 4 1 5 # P o a 7 P H z S 3 i X b 8 Q a O k t D u B i 0 l 6 q t M 5 Q a I M f E K m w y l c K 4 = ! 1 0 . 0 . 1 9 0 4 1 . 1 #       ����P��   nk  ����+�   ��        ��������   ����������                      v!10.0.19041.1      vk    �N       1    ������lh ��w�D��w�D����nk  Ն�>.�   ��        ��������   ���  ����                      v!10.0.19041.1415       ����vk    �N         ����x�����vk z   ��      f256!license.rtf��������    ����vk z   ��      f256!de-license.rtf     hbin �                       X���nk  n�-:ė�   �N       8�����   ���  ����"       &   z       S   x86_microsoft-windows-l..se-oem-professional_31bf3856ad364e35_none_1191363942e9e0ad     ���7 p Q Y n i Q K b F V L T c z L a C O K i F y L g D r N D / P / 3 A 2 D v T O v B m s = ! 1 0 . 0 . 1 9 0 4 1 . 1 4 1 5 # V U 2 Q Q g M j L m O k x H L r o o 4 K z j 7 q 8 M I l M 3 m h t v j J L V h 3 1 8 k = ! 1 0 . 0 . 1 9 0 4 1 . 1 #       ���7 p Q Y n i Q K b F V L T c z L a C O K i F y L g D r N D / P / 3 A 2 D v T O v B m s = ! 1 0 . 0 . 1 9 0 4 1 . 1 4 1 5 # V U 2 Q Q g M j L m O k x H L r o o 4 K z j 7 q 8 M I l M 3 m h t v j J L V h 3 1 8 k = ! 1 0 . 0 . 1 9 0 4 1 . 1 #       �   nk  ]�o,�    �        ��������   0���������                      v!10.0.19041.1      vk    �F       F    �����lh P��w�DP��w�D����nk  P��<-�    �        ��������   ���  ����                      v!10.0.19041.1415       ����vk    �F         ������X���nk  n�-:ė�   �N       ������   @��  ����"           z       S   x86_microsoft-windows-l..volume-professional_31bf3856ad364e35_none_28ae614589adfb32     ����vk z   ��      f256!license.rtfh���e K J J t u D 3 S X n S 0 q I w q 7 5 f P J t V j 8 w B 5 h x 8 C Z U D B M + V x 8 A = ! 1 0 . 0 . 1 9 0 4 1 . 1 4 1 5 # 1 0 . 0 . 1 9 0 4 1 . 1 # �������   nk  ]�o,�   ��        ��������   ����������                      v!10.0.19041.1      vk    �F       X    ������lh ���w�D���w�D����nk  ��q,�   ��        ��������   `��  ����                      v!10.0.19041.1415       ����vk    �F         ����H�`���nk  ���   �N       x�����   @��  ����       2   t       N   x86_microsoft-windows-ldifde.resources_31bf3856ad364e35_pt-br_98fc19ece0efeac6  ����vk   �          SomeUnparsedVersionsExist       �����P�    ����vk t   ��    H f256!ldifde.exe.mui . 1 ����K 3 T P S N y + r G J D G G K M z o A P 9 l W w d 8 L b 0 5 w S x / D Y 6 F b j H H I = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  ���   h�        ��������   p��  ����                      v!10.0.19041.1  ����vk    �N         ����X�����lh ��bL;0h���nk  �_�,�   �N       ������   X��  ����       2   t       C   x86_microsoft-windows-ldifde_31bf3856ad364e35_none_3f1baa6d6b33c8c0     ����vk   �          SomeUnparsedVersionsExist       ���� �h�    ����vk t   ��      f256!ldifde.exe ����r V h z a d G 4 F u N R I s P K E z t g E H w 2 E U 6 O H P n v N b B c H w J L K e 4 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  �_�,�   ��        ��������   ���  ����                      v!10.0.19041.1  ����vk    �F          ����h�����lh �bL;0X���nk  �t�   �N       ������   x��  ����       2   t       T   x86_microsoft-windows-m..-autoplay.resources_31bf3856ad364e35_pt-br_a72d80816975500b    ����vk   �          SomeUnparsedVersionsExist       ����@���    ����vk t   ��      f256!wmlaunch.exe.mui   ����I u e g 9 q q 5 E N r e u L j 4 a P D Q 5 B 2 A / t Y 0 2 T 8 j 0 9 1 8 y 3 j Y Q w o = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  �t�   ��        ��������   ���  ����                      v!10.0.19041.1  ����vk    �N         ����������lh 0�bL;0X���nk  n�-:ė�   �N       ������   0��  ����        "   x       S   x86_microsoft-windows-m..-components-jet2x3x_31bf3856ad364e35_none_3148df0c905b2bf4     ����vk x   ��      f256!msrd2x40.dll       h���I 6 W 3 k r U 9 C o a n G S e M B k H g 4 L x V f V k 5 p 7 E S g A F H C V 7 2 o x o = ! 1 0 . 0 . 1 9 0 4 1 . 5 7 2 # 1 0 . 0 . 1 9 0 4 1 . 1 #   ����h�@�    ����vk x   p�      f256!msrd3x40.dll       ���U A v 2 5 W M W r O 6 5 H M / Z t C c R g k R T 5 V T G H 3 v R K G c y e 7 P 7 A 4 Y = ! 1 0 . 0 . 1 9 0 4 1 . 5 7 2 # z B t J 6 9 D l v S O I u J z J Q d F 0 V Y J D e K x 2 o k D j 3 8 w n 7 i d R d 1 g = ! 1 0 . 0 . 1 9 0 4 1 . 1 # �   nk  ��8|,�   ��        ��������   ����������                      v!10.0.19041.1      vk    �N        o    ������lh  ���� ����������hbin �                       ����nk  ��_.�   ��        ��������   ���  ����                      v!10.0.19041.572����vk    �N          X���nk  n�-:ė�   �N       ������   `��  ����"           z       S   x86_microsoft-windows-m..-components-jetcore_31bf3856ad364e35_none_2e88411c92702c40     ����vk z   h�      f256!msjet40.dll���Q X h g k v c K L c v 3 X C O G O a W / E 1 / I 8 p g + Y 2 z 3 O t d 7 f P 2 F F D s = ! 1 0 . 0 . 1 9 0 4 1 . 1 2 8 8 # p c c P I O M e J T 8 P t 6 t V H a M O i J L K H z i b 3 E x 0 Q 6 i k P o J D T a E = ! 1 0 . 0 . 1 9 0 4 1 . 1 #       ����@��   nk  ��8|,�   ��        ��������   ����������                      v!10.0.19041.1      vk    �N        c    ������lh  �Ln�D �Ln�D����nk  ��_.�   ��        ��������   ���  ����                      v!10.0.19041.1288       ����vk    �N          ����h�X���nk  M� �+�   �N       ������   h��  ����       2   t       S   x86_microsoft-windows-m..-components-jetrepl_31bf3856ad364e35_none_2ea37a46925b42a8     ����vk   �          SomeUnparsedVersionsExist       ����0�x�    ����vk t   ��      f256!msrepl40.dll       ����W 7 N Z I i 4 l f 6 V X g d 8 h i 1 8 g a Q Y A M 7 y 5 F 9 f w i x i W / / B 0 7 E g = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  M� �+�   ��        ��������   ���  ����                      v!10.0.19041.1  ����vk    �N          ����������lh  �bL;0X���nk  n�-:ė�   �N        �����   x��  ����        "   x       S   x86_microsoft-windows-m..-components-jettext_31bf3856ad364e35_none_2e54cfa69295202a     ����vk x   ��      f256!mstext40.dll       ���1 5 L 6 g F / e r + 8 c / X a 0 E Y 3 n M 2 L q x 7 T x L 7 P M Z o V J n Z M s l 7 I = ! 1 0 . 0 . 1 9 0 4 1 . 9 0 6 # E x h + 5 + g G 4 9 c R p d S / i T K 8 s u r m f H 6 l F g P d 5 w P F 1 A 4 D + h E = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����X��   nk  ��8|,�   ��        ��������   ����������                      v!10.0.19041.1      vk    �N        +    ������lh � ��� �����nk  ��_.�   ��        ��������   ���  ����                      v!10.0.19041.906����vk    �N          ����x�X���nk  #u?�+�   �N       ������   x��  ����       2   t       T   x86_microsoft-windows-m..-cpxl-dll.resources_31bf3856ad364e35_pt-br_a37ad8dbec01abf6    ����vk   �          SomeUnparsedVersionsExist       ����@���    ����vk t   ��      f256!mscpxl32.dll.mui   ����y q G R n k o A V X J e U M C Z i e O F x M O X 8 d b u k 6 w h B 0 2 3 y / 4 O 6 7 8 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  #u?�+�   ��        ��������   ���  ����                      v!10.0.19041.1  ����vk    �N         ����������lh 0�bL;0X���nk  ��C�)�   �N       (�����   ���  ����       2          S   x86_microsoft-windows-m..-interface-remoting_31bf3856ad364e35_none_ada5a88600d74b7d     ����vk   �          SomeUnparsedVersionsExist       ����h�����nk  ��ӹ+�   ��        ��������    ��  ����                      v!10.0.19041.1  ����vk    �N          ���������lh ��bL;0X���nk  #u?�+�   �N       P�����   ��  ����       2   t       T   x86_microsoft-windows-m..-jet-ji32.resources_31bf3856ad364e35_pt-br_94b5fe38070ee51e    ����vk   �          SomeUnparsedVersionsExist       ������(�    ����vk t   X�      f256!odbcji32.dll.mui   ����H H N Z 5 S a d o c m l a 2 7 d K T 8 l x s 0 5 4 0 L h Z 7 3 k u j 6 e T 6 j u z c 8 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  #u?�+�   8�        ��������   H��  ����                      v!10.0.19041.1  ����vk    �N         ����0�����lh ��bL;0X���nk  i�̹+�   �N       ������   @��  ����       2   t       S   x86_microsoft-windows-m..-mdac-odbc-cpxl-dll_31bf3856ad364e35_none_d95d0721727cff3a     ����vk   �          SomeUnparsedVersionsExist       �����P�    ����vk t   ��      f256!mscpxl32.dll       ����Q y s b 8 E t o l C v V S o 3 8 4 n m d c z i B N R r J s f 8 v D E 0 u 9 J + M N h M = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ������hbin �                       ����nk  i�̹+�   `�        ��������   ���  ����                      v!10.0.19041.1  ����vk    �F          ����lh  �bL;0X���nk  i�̹+�   �N       ������   ���  ����       2   t       S   x86_microsoft-windows-m..-mdac-odbc-cpxl-rll_31bf3856ad364e35_none_d8c5a83972ee8668     ����vk   �          SomeUnparsedVersionsExist       ����P���    ����vk t   ��      f256!mscpx32r.dll       ����5 c o / m 5 g z G E w 1 r Y n 2 F b 9 6 U Q i 3 c h 1 o W n l c 5 A G c P S Y J / e Y = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  i�̹+�   ��        ��������   ���  ����                      v!10.0.19041.1  ����vk    �N          ����������lh @�bL;0X���nk  Eѹ+�   �N       ������   ���  ����       2   t       S   x86_microsoft-windows-m..-mdac-odbc-jet-ji32_31bf3856ad364e35_none_8d1e8ccf60ea9466     ����vk   �          SomeUnparsedVersionsExist       ����x���    ����vk t   ��      f256!odbcji32.dll       ����b J G S W W A 4 D 2 t + x G X e U L 6 V m 1 b e Q M P U a 5 Y 7 s O 6 u w X H a i H g = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  Eѹ+�   ��        ��������   ���  ����                      v!10.0.19041.1  ����vk    �F          ����������lh h�bL;0X���nk  �5��+�   �N       �����   ���  ����       2   t       S   x86_microsoft-windows-m..-mdac-odbc-jet-jt32_31bf3856ad364e35_none_8ca79dab6143c7c1     ����vk   �          SomeUnparsedVersionsExist       ��������    ����vk t   �      f256!odbcjt32.dll       ����O b K L B n 5 5 C o t I e 5 w P W F E Q H o e X 9 C g Q u h E J u A n B / / J 6 x D A = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  �5��+�   ��        ��������   ��  ����                      v!10.0.19041.1  ����vk    �N          ����������lh ��bL;0X���nk  �8ݹ+�   �N       0�����    ��  ����       2   t       S   x86_microsoft-windows-m..-mdac-oledb-stub-dc_31bf3856ad364e35_none_54be1829b510b9f6     ����vk   �          SomeUnparsedVersionsExist       �������    ����vk t   8�      f256!msdadc.dll ����v M C l f l o X 2 D i 7 r n + P k s E c Q f D G l D 0 o i Y O L W 2 p T h T 1 0 g t k = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  �8ݹ+�    �        ��������   (��  ����                      v!10.0.19041.1  ����vk    �N          ���������lh ��bL;0X���nk  ��߹+�   �N       P�����    ��  ����       2   t       S   x86_microsoft-windows-m..-mdac-oledb-stub-er_31bf3856ad364e35_none_54bdc2bbb51153bc     ����vk   �          SomeUnparsedVersionsExist       ������0�    ����vk t   X�      f256!msdaer.dll ����h E P Q s D R X L D x E u F + q I W t J L 5 g G u j m y d d 7 x a w 5 B w r A 9 J G k = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  ��߹+�   @�        ��������   H��  ����                      v!10.0.19041.1  ����vk    �N          ����0�����lh ��bL;0X���nk  ��߹+�   �N       p�����   @��  ����       2   t       S   x86_microsoft-windows-m..-mdac-oledb-stub-rb_31bf3856ad364e35_none_54cc32fdb5040317     ����vk   �          SomeUnparsedVersionsExist       �����P�    ����vk t   x�      f256!msdaurl.dll����J 9 C Q 9 h c C D p F S A a i M l n 1 q c J C A n 5 L p + M O K 3 j Y K 9 0 r 9 r P g = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  ��߹+�   `�        ��������   h��  ����                      v!10.0.19041.1  ����vk    �N          ����P�����lh ��bL;0X���nk  ��߹+�   �N       ������   `��  ����       2   t       S   x86_microsoft-windows-m..-mdac-oledb-stub-sc_31bf3856ad364e35_none_54cd1c7fb503360f     ����vk   �          SomeUnparsedVersionsExist       ����(�p�    ����vk t   ��      f256!msdasc.dll ����m m L o r 5 K n P Z 7 J 2 8 V A P U P q c U C 7 V M l J X + n P f i O e H C s M H W M = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  ��߹+�   ��        ��������   ���  ����                      v!10.0.19041.1  ����vk    �N          ����p�����lh �bL;0����vk x   �       f256!msadds.dll ������    vk    �N        f    ������������hbin                         X���nk  n�-:ė�   �N       ����   ���  ����           x       S   x86_microsoft-windows-m..-mdac-rds-shape-dll_31bf3856ad364e35_none_f4a06258739d1b7f     ���p 6 6 g I r f a F f r y S 4 E l n 4 Y 3 H e U Z Q Q G n G J v W L 4 f q m g L f A G c = ! 1 0 . 0 . 1 9 0 4 1 . 7 4 6 # v x y U Y h 1 S e q 1 U A r X z t c R 0 P B B z 3 t p 6 + P h 8 I q J 3 8 P F + m Y U = ! 1 0 . 0 . 1 9 0 4 1 . 1 # `   nk  ��8|,�             ��������   ����������                      v!10.0.19041.1  ����lh 0��0�����nk  ��_.�             ��������   ���  ����                      v!10.0.19041.746����vk    �N          X���nk  F��+�   �N       �����   ��  ����       2   t       S   x86_microsoft-windows-m..-mdac-rds-shape-rll_31bf3856ad364e35_none_f4090370740ea2ad     ����vk   �          SomeUnparsedVersionsExist       ����P�    ����vk t   �      f256!msaddsr.dll����Q / t 5 T d S A 1 L L b d w 5 j n 4 e N l m J j 8 t i s T j U m J G q t W 1 n z v V s = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  F��+�   �        ��������   ���  ����                      v!10.0.19041.1  ����vk    �F          ����lh 8bL;0X���nk  ��C�)�   �N       (����   ��  ����       2          S   x86_microsoft-windows-m..-odbc-oracle-driver_31bf3856ad364e35_none_00b9d52d47047893     ����vk   �          SomeUnparsedVersionsExist       ����h����nk  Eѹ+�   �        ��������    �  ����                      v!10.0.19041.1  ����vk    �N          ��������lh �bL;0X���nk  *�ǹ+�   �N       P����   �  ����       2   t       S   x86_microsoft-windows-m..-r-backcompat-tlb28_31bf3856ad364e35_none_5457924b7b22df27     ����vk   �          SomeUnparsedVersionsExist       �����(    ����vk t   X      f256!msador28.tlb       ����5 U h o A O 2 U S f 2 N h m j 2 Y P 0 x W I l 8 K C F 8 0 x N 8 W w Z M m q A Z B u 4 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  *�ǹ+�   8        ��������   H�  ����                      v!10.0.19041.1  ����vk    �N          ����0����lh �bL;0X���nk  ���+�   �N       p
����   @	�  ����       2   t       S   x86_microsoft-windows-m..-temptable-provider_31bf3856ad364e35_none_2b2d5e3a900e8dae     ����vk   �          SomeUnparsedVersionsExist       ����	P	    ����vk t   x	      f256!msdatt.dll ����x N w W J j J w c B Y u I z u f O i p 3 P J u a q Z C / 7 0 O m v r C q n Y X v o 9 8 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  ���+�   `        ��������   h
�  ����                      v!10.0.19041.1  ����vk    �N          ����P
����lh �	bL;0X���nk  �	ֹ+�   �N       �����   `�  ����       2   t       S   x86_microsoft-windows-m..ace-remoting-xactps_31bf3856ad364e35_none_1b00cf8af8cfff99     ����vk   �          SomeUnparsedVersionsExist       ����(p    ����vk t   �      f256!msxactps.dll       ����Q 5 L e y M y S J / 1 g u z z Y P 6 5 R 6 6 x 8 d i 8 W 8 U 1 3 y V Z G 7 Y Z J 3 T U = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  �	ֹ+�   �
        ��������   ��  ����                      v!10.0.19041.1  ����vk    �N          ����x����lh bL;0X���nk  *�ǹ+�   �N       �����   ��  ����       2   t       S   x86_microsoft-windows-m..al-backcompat-tlb28_31bf3856ad364e35_none_707c4d920de2f486     ����vk   �          SomeUnparsedVersionsExist       ����P�    ����vk t   �      f256!msadomd28.tlb      ����Q S s w o g 1 J x L K 9 2 N j v E M x B o b x p a M H Y k R P c 9 S + x N j F T M N U = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  *�ǹ+�   �        ��������   ��  ����                      v!10.0.19041.1  ����vk    �N          ���������lh @bL;0X���nk  �	ֹ+�   �N        ����   ��  ����       2   t       S   x86_microsoft-windows-m..b-odbc-provider-dll_31bf3856ad364e35_none_c67eb8704dd5892b     ����vk   �          SomeUnparsedVersionsExist       ����x�    ����vk t          f256!msdasql.dll����vk    �N          hbin                        ����t G z N l l e i W B 3 4 z f m g v + U 6 9 B Q M M 4 M T o e i K 1 P q W Q e V l B b c = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  �	ֹ+�   �        ��������   ��  ����                      v!10.0.19041.1  ���������lh �bL;0X���nk  �tع+�   �N       (����   ��  ����       2   t       S   x86_microsoft-windows-m..b-odbc-provider-rll_31bf3856ad364e35_none_c67d79804dd6eff9     ����vk   �          SomeUnparsedVersionsExist       �����     ����vk t   0      f256!msdasqlr.dll       ����q L e o 1 k N M m L X H 3 w 9 p k C H C G a a H D 4 W z K 4 j d D J 1 N O A z z U h A = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  �tع+�           ��������    �  ����                      v!10.0.19041.1  ����vk    �F          ��������lh �bL;0X���nk  Eѹ+�   �N       P����   �  ����       2   t       S   x86_microsoft-windows-m..c-oracle-driver-dll_31bf3856ad364e35_none_d6d73553ba13b634     ����vk   �          SomeUnparsedVersionsExist       �����(    ����vk t   X      f256!msorcl32.dll       ����x 9 e t H K o A B Z Y z O R Y w w E n b t D 8 t u H q F 1 z P O k o V b 4 8 8 9 + r 0 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  Eѹ+�   8        ��������   H�  ����                      v!10.0.19041.1  ����vk    �N          ����0����lh �bL;0X���nk  Eѹ+�   �N       x����   @�  ����       2   t       S   x86_microsoft-windows-m..c-oracle-driver-rll_31bf3856ad364e35_none_d6e5395fba0718f6     ����vk   �          SomeUnparsedVersionsExist       ����P    ����vk t   �      f256!msorc32r.dll       ����M F 2 F 3 p L w g u t Q x L p y L 8 X A H O S u O 1 o E + 0 U p o i P 4 U H l U r t U = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  Eѹ+�   `        ��������   p�  ����                      v!10.0.19041.1  ����vk    �F          ����X����lh �bL;0X���nk  #u?�+�   �N       �����   h�  ����       2   t       T   x86_microsoft-windows-m..cconf-exe.resources_31bf3856ad364e35_pt-br_c7947f13f64fe5de    ����vk   �          SomeUnparsedVersionsExist       ����0x    ����vk t   �      f256!odbcconf.exe.mui   ����V Q u Q k c N D Z b 9 A y + o s e X r S B e b y h 3 D E K r H z R h s e A + L F I 6 8 = ! 1 0 . 0 . 1 9 0 4 1 . 1 # ����nk  #u?�+�   �        ��������   ��  ����                      v!10.0.19041.1  ����vk    �N         ���������lh  bL;0X���nk  n�-:ė�   �N       �����    �����  ����"                   S   x86_microsoft-windows-m..cess-components-jet_31bf3856ad364e35_none_286018197721779f     �   nk  ��8|,�   �        ��������   ���������                      v!10.0.19041.1      vk    �F             �����lh �Ln�D�Ln�D����nk  ��8|,�   �        ��������   p�  ����                      v!10.0.19041.1288       ����vk    �F          ����XX���nk  ��C�)�   �N       �����   X�  ����       2          S   x86_microsoft-windows-m..codepage-translator_31bf3856ad364e35_none_3cf6f8a620b870a5     ����vk   �          SomeUnparsedVersionsExist       ���� ����nk  i�̹+�   x        ��������   ��  ����                      v!10.0.19041.1  ����vk    �N          ���������lh `bL;0X���nk  ��+�   �N        ����   ��  ����       2   t       S   x86_microsoft-windows-m..commonresource-core_31bf3856ad364e35_none_1e32b0d1ea52071e     ����vk   �          SomeUnparsedVersionsExist       ������    ����vk t         f256!mqutil.dll ����r B 8 n b 9 K i T T 7 X z p o O V Y 5 G C l a S k m 3 4 c b Y z