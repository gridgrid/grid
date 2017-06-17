/* core-js */
/**
 * core-js 2.4.1
 * https://github.com/zloirock/core-js
 * License: http://rock.mit-license.org
 * © 2017 Denis Pushkarev
 */
!function(__e, __g, undefined){
'use strict';
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var LIBRARY            = __webpack_require__(2)
	  , global             = __webpack_require__(3)
	  , ctx                = __webpack_require__(4)
	  , classof            = __webpack_require__(6)
	  , $export            = __webpack_require__(11)
	  , isObject           = __webpack_require__(16)
	  , aFunction          = __webpack_require__(5)
	  , anInstance         = __webpack_require__(25)
	  , forOf              = __webpack_require__(26)
	  , speciesConstructor = __webpack_require__(33)
	  , task               = __webpack_require__(34).set
	  , microtask          = __webpack_require__(37)()
	  , PROMISE            = 'Promise'
	  , TypeError          = global.TypeError
	  , process            = global.process
	  , $Promise           = global[PROMISE]
	  , process            = global.process
	  , isNode             = classof(process) == 'process'
	  , empty              = function(){ /* empty */ }
	  , Internal, GenericPromiseCapability, Wrapper;

	var USE_NATIVE = !!function(){
	  try {
	    // correct subclassing with @@species support
	    var promise     = $Promise.resolve(1)
	      , FakePromise = (promise.constructor = {})[__webpack_require__(8)('species')] = function(exec){ exec(empty, empty); };
	    // unhandled rejections tracking support, NodeJS Promise without it fails @@species test
	    return (isNode || typeof PromiseRejectionEvent == 'function') && promise.then(empty) instanceof FakePromise;
	  } catch(e){ /* empty */ }
	}();

	// helpers
	var sameConstructor = function(a, b){
	  // with library wrapper special case
	  return a === b || a === $Promise && b === Wrapper;
	};
	var isThenable = function(it){
	  var then;
	  return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
	};
	var newPromiseCapability = function(C){
	  return sameConstructor($Promise, C)
	    ? new PromiseCapability(C)
	    : new GenericPromiseCapability(C);
	};
	var PromiseCapability = GenericPromiseCapability = function(C){
	  var resolve, reject;
	  this.promise = new C(function($$resolve, $$reject){
	    if(resolve !== undefined || reject !== undefined)throw TypeError('Bad Promise constructor');
	    resolve = $$resolve;
	    reject  = $$reject;
	  });
	  this.resolve = aFunction(resolve);
	  this.reject  = aFunction(reject);
	};
	var perform = function(exec){
	  try {
	    exec();
	  } catch(e){
	    return {error: e};
	  }
	};
	var notify = function(promise, isReject){
	  if(promise._n)return;
	  promise._n = true;
	  var chain = promise._c;
	  microtask(function(){
	    var value = promise._v
	      , ok    = promise._s == 1
	      , i     = 0;
	    var run = function(reaction){
	      var handler = ok ? reaction.ok : reaction.fail
	        , resolve = reaction.resolve
	        , reject  = reaction.reject
	        , domain  = reaction.domain
	        , result, then;
	      try {
	        if(handler){
	          if(!ok){
	            if(promise._h == 2)onHandleUnhandled(promise);
	            promise._h = 1;
	          }
	          if(handler === true)result = value;
	          else {
	            if(domain)domain.enter();
	            result = handler(value);
	            if(domain)domain.exit();
	          }
	          if(result === reaction.promise){
	            reject(TypeError('Promise-chain cycle'));
	          } else if(then = isThenable(result)){
	            then.call(result, resolve, reject);
	          } else resolve(result);
	        } else reject(value);
	      } catch(e){
	        reject(e);
	      }
	    };
	    while(chain.length > i)run(chain[i++]); // variable length - can't use forEach
	    promise._c = [];
	    promise._n = false;
	    if(isReject && !promise._h)onUnhandled(promise);
	  });
	};
	var onUnhandled = function(promise){
	  task.call(global, function(){
	    var value = promise._v
	      , abrupt, handler, console;
	    if(isUnhandled(promise)){
	      abrupt = perform(function(){
	        if(isNode){
	          process.emit('unhandledRejection', value, promise);
	        } else if(handler = global.onunhandledrejection){
	          handler({promise: promise, reason: value});
	        } else if((console = global.console) && console.error){
	          console.error('Unhandled promise rejection', value);
	        }
	      });
	      // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
	      promise._h = isNode || isUnhandled(promise) ? 2 : 1;
	    } promise._a = undefined;
	    if(abrupt)throw abrupt.error;
	  });
	};
	var isUnhandled = function(promise){
	  if(promise._h == 1)return false;
	  var chain = promise._a || promise._c
	    , i     = 0
	    , reaction;
	  while(chain.length > i){
	    reaction = chain[i++];
	    if(reaction.fail || !isUnhandled(reaction.promise))return false;
	  } return true;
	};
	var onHandleUnhandled = function(promise){
	  task.call(global, function(){
	    var handler;
	    if(isNode){
	      process.emit('rejectionHandled', promise);
	    } else if(handler = global.onrejectionhandled){
	      handler({promise: promise, reason: promise._v});
	    }
	  });
	};
	var $reject = function(value){
	  var promise = this;
	  if(promise._d)return;
	  promise._d = true;
	  promise = promise._w || promise; // unwrap
	  promise._v = value;
	  promise._s = 2;
	  if(!promise._a)promise._a = promise._c.slice();
	  notify(promise, true);
	};
	var $resolve = function(value){
	  var promise = this
	    , then;
	  if(promise._d)return;
	  promise._d = true;
	  promise = promise._w || promise; // unwrap
	  try {
	    if(promise === value)throw TypeError("Promise can't be resolved itself");
	    if(then = isThenable(value)){
	      microtask(function(){
	        var wrapper = {_w: promise, _d: false}; // wrap
	        try {
	          then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
	        } catch(e){
	          $reject.call(wrapper, e);
	        }
	      });
	    } else {
	      promise._v = value;
	      promise._s = 1;
	      notify(promise, false);
	    }
	  } catch(e){
	    $reject.call({_w: promise, _d: false}, e); // wrap
	  }
	};

	// constructor polyfill
	if(!USE_NATIVE){
	  // 25.4.3.1 Promise(executor)
	  $Promise = function Promise(executor){
	    anInstance(this, $Promise, PROMISE, '_h');
	    aFunction(executor);
	    Internal.call(this);
	    try {
	      executor(ctx($resolve, this, 1), ctx($reject, this, 1));
	    } catch(err){
	      $reject.call(this, err);
	    }
	  };
	  Internal = function Promise(executor){
	    this._c = [];             // <- awaiting reactions
	    this._a = undefined;      // <- checked in isUnhandled reactions
	    this._s = 0;              // <- state
	    this._d = false;          // <- done
	    this._v = undefined;      // <- value
	    this._h = 0;              // <- rejection state, 0 - default, 1 - handled, 2 - unhandled
	    this._n = false;          // <- notify
	  };
	  Internal.prototype = __webpack_require__(38)($Promise.prototype, {
	    // 25.4.5.3 Promise.prototype.then(onFulfilled, onRejected)
	    then: function then(onFulfilled, onRejected){
	      var reaction    = newPromiseCapability(speciesConstructor(this, $Promise));
	      reaction.ok     = typeof onFulfilled == 'function' ? onFulfilled : true;
	      reaction.fail   = typeof onRejected == 'function' && onRejected;
	      reaction.domain = isNode ? process.domain : undefined;
	      this._c.push(reaction);
	      if(this._a)this._a.push(reaction);
	      if(this._s)notify(this, false);
	      return reaction.promise;
	    },
	    // 25.4.5.1 Promise.prototype.catch(onRejected)
	    'catch': function(onRejected){
	      return this.then(undefined, onRejected);
	    }
	  });
	  PromiseCapability = function(){
	    var promise  = new Internal;
	    this.promise = promise;
	    this.resolve = ctx($resolve, promise, 1);
	    this.reject  = ctx($reject, promise, 1);
	  };
	}

	$export($export.G + $export.W + $export.F * !USE_NATIVE, {Promise: $Promise});
	__webpack_require__(39)($Promise, PROMISE);
	__webpack_require__(40)(PROMISE);
	Wrapper = __webpack_require__(12)[PROMISE];

	// statics
	$export($export.S + $export.F * !USE_NATIVE, PROMISE, {
	  // 25.4.4.5 Promise.reject(r)
	  reject: function reject(r){
	    var capability = newPromiseCapability(this)
	      , $$reject   = capability.reject;
	    $$reject(r);
	    return capability.promise;
	  }
	});
	$export($export.S + $export.F * (LIBRARY || !USE_NATIVE), PROMISE, {
	  // 25.4.4.6 Promise.resolve(x)
	  resolve: function resolve(x){
	    // instanceof instead of internal slot check because we should fix it without replacement native Promise core
	    if(x instanceof $Promise && sameConstructor(x.constructor, this))return x;
	    var capability = newPromiseCapability(this)
	      , $$resolve  = capability.resolve;
	    $$resolve(x);
	    return capability.promise;
	  }
	});
	$export($export.S + $export.F * !(USE_NATIVE && __webpack_require__(41)(function(iter){
	  $Promise.all(iter)['catch'](empty);
	})), PROMISE, {
	  // 25.4.4.1 Promise.all(iterable)
	  all: function all(iterable){
	    var C          = this
	      , capability = newPromiseCapability(C)
	      , resolve    = capability.resolve
	      , reject     = capability.reject;
	    var abrupt = perform(function(){
	      var values    = []
	        , index     = 0
	        , remaining = 1;
	      forOf(iterable, false, function(promise){
	        var $index        = index++
	          , alreadyCalled = false;
	        values.push(undefined);
	        remaining++;
	        C.resolve(promise).then(function(value){
	          if(alreadyCalled)return;
	          alreadyCalled  = true;
	          values[$index] = value;
	          --remaining || resolve(values);
	        }, reject);
	      });
	      --remaining || resolve(values);
	    });
	    if(abrupt)reject(abrupt.error);
	    return capability.promise;
	  },
	  // 25.4.4.4 Promise.race(iterable)
	  race: function race(iterable){
	    var C          = this
	      , capability = newPromiseCapability(C)
	      , reject     = capability.reject;
	    var abrupt = perform(function(){
	      forOf(iterable, false, function(promise){
	        C.resolve(promise).then(capability.resolve, reject);
	      });
	    });
	    if(abrupt)reject(abrupt.error);
	    return capability.promise;
	  }
	});

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = false;

/***/ },
/* 3 */
/***/ function(module, exports) {

	// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
	var global = module.exports = typeof window != 'undefined' && window.Math == Math
	  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
	if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	// optional / simple context binding
	var aFunction = __webpack_require__(5);
	module.exports = function(fn, that, length){
	  aFunction(fn);
	  if(that === undefined)return fn;
	  switch(length){
	    case 1: return function(a){
	      return fn.call(that, a);
	    };
	    case 2: return function(a, b){
	      return fn.call(that, a, b);
	    };
	    case 3: return function(a, b, c){
	      return fn.call(that, a, b, c);
	    };
	  }
	  return function(/* ...args */){
	    return fn.apply(that, arguments);
	  };
	};

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = function(it){
	  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
	  return it;
	};

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	// getting tag from 19.1.3.6 Object.prototype.toString()
	var cof = __webpack_require__(7)
	  , TAG = __webpack_require__(8)('toStringTag')
	  // ES3 wrong here
	  , ARG = cof(function(){ return arguments; }()) == 'Arguments';

	// fallback for IE11 Script Access Denied error
	var tryGet = function(it, key){
	  try {
	    return it[key];
	  } catch(e){ /* empty */ }
	};

	module.exports = function(it){
	  var O, T, B;
	  return it === undefined ? 'Undefined' : it === null ? 'Null'
	    // @@toStringTag case
	    : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T
	    // builtinTag case
	    : ARG ? cof(O)
	    // ES3 arguments fallback
	    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
	};

/***/ },
/* 7 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = function(it){
	  return toString.call(it).slice(8, -1);
	};

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var store      = __webpack_require__(9)('wks')
	  , uid        = __webpack_require__(10)
	  , Symbol     = __webpack_require__(3).Symbol
	  , USE_SYMBOL = typeof Symbol == 'function';

	var $exports = module.exports = function(name){
	  return store[name] || (store[name] =
	    USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
	};

	$exports.store = store;

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var global = __webpack_require__(3)
	  , SHARED = '__core-js_shared__'
	  , store  = global[SHARED] || (global[SHARED] = {});
	module.exports = function(key){
	  return store[key] || (store[key] = {});
	};

/***/ },
/* 10 */
/***/ function(module, exports) {

	var id = 0
	  , px = Math.random();
	module.exports = function(key){
	  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
	};

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	var global    = __webpack_require__(3)
	  , core      = __webpack_require__(12)
	  , hide      = __webpack_require__(13)
	  , redefine  = __webpack_require__(23)
	  , ctx       = __webpack_require__(4)
	  , PROTOTYPE = 'prototype';

	var $export = function(type, name, source){
	  var IS_FORCED = type & $export.F
	    , IS_GLOBAL = type & $export.G
	    , IS_STATIC = type & $export.S
	    , IS_PROTO  = type & $export.P
	    , IS_BIND   = type & $export.B
	    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] || (global[name] = {}) : (global[name] || {})[PROTOTYPE]
	    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
	    , expProto  = exports[PROTOTYPE] || (exports[PROTOTYPE] = {})
	    , key, own, out, exp;
	  if(IS_GLOBAL)source = name;
	  for(key in source){
	    // contains in native
	    own = !IS_FORCED && target && target[key] !== undefined;
	    // export native or passed
	    out = (own ? target : source)[key];
	    // bind timers to global for call from export context
	    exp = IS_BIND && own ? ctx(out, global) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
	    // extend global
	    if(target)redefine(target, key, out, type & $export.U);
	    // export
	    if(exports[key] != out)hide(exports, key, exp);
	    if(IS_PROTO && expProto[key] != out)expProto[key] = out;
	  }
	};
	global.core = core;
	// type bitmap
	$export.F = 1;   // forced
	$export.G = 2;   // global
	$export.S = 4;   // static
	$export.P = 8;   // proto
	$export.B = 16;  // bind
	$export.W = 32;  // wrap
	$export.U = 64;  // safe
	$export.R = 128; // real proto method for `library` 
	module.exports = $export;

/***/ },
/* 12 */
/***/ function(module, exports) {

	var core = module.exports = {version: '2.4.0'};
	if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	var dP         = __webpack_require__(14)
	  , createDesc = __webpack_require__(22);
	module.exports = __webpack_require__(18) ? function(object, key, value){
	  return dP.f(object, key, createDesc(1, value));
	} : function(object, key, value){
	  object[key] = value;
	  return object;
	};

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	var anObject       = __webpack_require__(15)
	  , IE8_DOM_DEFINE = __webpack_require__(17)
	  , toPrimitive    = __webpack_require__(21)
	  , dP             = Object.defineProperty;

	exports.f = __webpack_require__(18) ? Object.defineProperty : function defineProperty(O, P, Attributes){
	  anObject(O);
	  P = toPrimitive(P, true);
	  anObject(Attributes);
	  if(IE8_DOM_DEFINE)try {
	    return dP(O, P, Attributes);
	  } catch(e){ /* empty */ }
	  if('get' in Attributes || 'set' in Attributes)throw TypeError('Accessors not supported!');
	  if('value' in Attributes)O[P] = Attributes.value;
	  return O;
	};

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	var isObject = __webpack_require__(16);
	module.exports = function(it){
	  if(!isObject(it))throw TypeError(it + ' is not an object!');
	  return it;
	};

/***/ },
/* 16 */
/***/ function(module, exports) {

	module.exports = function(it){
	  return typeof it === 'object' ? it !== null : typeof it === 'function';
	};

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = !__webpack_require__(18) && !__webpack_require__(19)(function(){
	  return Object.defineProperty(__webpack_require__(20)('div'), 'a', {get: function(){ return 7; }}).a != 7;
	});

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	// Thank's IE8 for his funny defineProperty
	module.exports = !__webpack_require__(19)(function(){
	  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
	});

/***/ },
/* 19 */
/***/ function(module, exports) {

	module.exports = function(exec){
	  try {
	    return !!exec();
	  } catch(e){
	    return true;
	  }
	};

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	var isObject = __webpack_require__(16)
	  , document = __webpack_require__(3).document
	  // in old IE typeof document.createElement is 'object'
	  , is = isObject(document) && isObject(document.createElement);
	module.exports = function(it){
	  return is ? document.createElement(it) : {};
	};

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	// 7.1.1 ToPrimitive(input [, PreferredType])
	var isObject = __webpack_require__(16);
	// instead of the ES6 spec version, we didn't implement @@toPrimitive case
	// and the second argument - flag - preferred type is a string
	module.exports = function(it, S){
	  if(!isObject(it))return it;
	  var fn, val;
	  if(S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
	  if(typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it)))return val;
	  if(!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it)))return val;
	  throw TypeError("Can't convert object to primitive value");
	};

/***/ },
/* 22 */
/***/ function(module, exports) {

	module.exports = function(bitmap, value){
	  return {
	    enumerable  : !(bitmap & 1),
	    configurable: !(bitmap & 2),
	    writable    : !(bitmap & 4),
	    value       : value
	  };
	};

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	var global    = __webpack_require__(3)
	  , hide      = __webpack_require__(13)
	  , has       = __webpack_require__(24)
	  , SRC       = __webpack_require__(10)('src')
	  , TO_STRING = 'toString'
	  , $toString = Function[TO_STRING]
	  , TPL       = ('' + $toString).split(TO_STRING);

	__webpack_require__(12).inspectSource = function(it){
	  return $toString.call(it);
	};

	(module.exports = function(O, key, val, safe){
	  var isFunction = typeof val == 'function';
	  if(isFunction)has(val, 'name') || hide(val, 'name', key);
	  if(O[key] === val)return;
	  if(isFunction)has(val, SRC) || hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
	  if(O === global){
	    O[key] = val;
	  } else {
	    if(!safe){
	      delete O[key];
	      hide(O, key, val);
	    } else {
	      if(O[key])O[key] = val;
	      else hide(O, key, val);
	    }
	  }
	// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
	})(Function.prototype, TO_STRING, function toString(){
	  return typeof this == 'function' && this[SRC] || $toString.call(this);
	});

/***/ },
/* 24 */
/***/ function(module, exports) {

	var hasOwnProperty = {}.hasOwnProperty;
	module.exports = function(it, key){
	  return hasOwnProperty.call(it, key);
	};

/***/ },
/* 25 */
/***/ function(module, exports) {

	module.exports = function(it, Constructor, name, forbiddenField){
	  if(!(it instanceof Constructor) || (forbiddenField !== undefined && forbiddenField in it)){
	    throw TypeError(name + ': incorrect invocation!');
	  } return it;
	};

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	var ctx         = __webpack_require__(4)
	  , call        = __webpack_require__(27)
	  , isArrayIter = __webpack_require__(28)
	  , anObject    = __webpack_require__(15)
	  , toLength    = __webpack_require__(30)
	  , getIterFn   = __webpack_require__(32)
	  , BREAK       = {}
	  , RETURN      = {};
	var exports = module.exports = function(iterable, entries, fn, that, ITERATOR){
	  var iterFn = ITERATOR ? function(){ return iterable; } : getIterFn(iterable)
	    , f      = ctx(fn, that, entries ? 2 : 1)
	    , index  = 0
	    , length, step, iterator, result;
	  if(typeof iterFn != 'function')throw TypeError(iterable + ' is not iterable!');
	  // fast case for arrays with default iterator
	  if(isArrayIter(iterFn))for(length = toLength(iterable.length); length > index; index++){
	    result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
	    if(result === BREAK || result === RETURN)return result;
	  } else for(iterator = iterFn.call(iterable); !(step = iterator.next()).done; ){
	    result = call(iterator, f, step.value, entries);
	    if(result === BREAK || result === RETURN)return result;
	  }
	};
	exports.BREAK  = BREAK;
	exports.RETURN = RETURN;

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	// call something on iterator step with safe closing on error
	var anObject = __webpack_require__(15);
	module.exports = function(iterator, fn, value, entries){
	  try {
	    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
	  // 7.4.6 IteratorClose(iterator, completion)
	  } catch(e){
	    var ret = iterator['return'];
	    if(ret !== undefined)anObject(ret.call(iterator));
	    throw e;
	  }
	};

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	// check on default Array iterator
	var Iterators  = __webpack_require__(29)
	  , ITERATOR   = __webpack_require__(8)('iterator')
	  , ArrayProto = Array.prototype;

	module.exports = function(it){
	  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
	};

/***/ },
/* 29 */
/***/ function(module, exports) {

	module.exports = {};

/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	// 7.1.15 ToLength
	var toInteger = __webpack_require__(31)
	  , min       = Math.min;
	module.exports = function(it){
	  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
	};

/***/ },
/* 31 */
/***/ function(module, exports) {

	// 7.1.4 ToInteger
	var ceil  = Math.ceil
	  , floor = Math.floor;
	module.exports = function(it){
	  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
	};

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	var classof   = __webpack_require__(6)
	  , ITERATOR  = __webpack_require__(8)('iterator')
	  , Iterators = __webpack_require__(29);
	module.exports = __webpack_require__(12).getIteratorMethod = function(it){
	  if(it != undefined)return it[ITERATOR]
	    || it['@@iterator']
	    || Iterators[classof(it)];
	};

/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	// 7.3.20 SpeciesConstructor(O, defaultConstructor)
	var anObject  = __webpack_require__(15)
	  , aFunction = __webpack_require__(5)
	  , SPECIES   = __webpack_require__(8)('species');
	module.exports = function(O, D){
	  var C = anObject(O).constructor, S;
	  return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
	};

/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	var ctx                = __webpack_require__(4)
	  , invoke             = __webpack_require__(35)
	  , html               = __webpack_require__(36)
	  , cel                = __webpack_require__(20)
	  , global             = __webpack_require__(3)
	  , process            = global.process
	  , setTask            = global.setImmediate
	  , clearTask          = global.clearImmediate
	  , MessageChannel     = global.MessageChannel
	  , counter            = 0
	  , queue              = {}
	  , ONREADYSTATECHANGE = 'onreadystatechange'
	  , defer, channel, port;
	var run = function(){
	  var id = +this;
	  if(queue.hasOwnProperty(id)){
	    var fn = queue[id];
	    delete queue[id];
	    fn();
	  }
	};
	var listener = function(event){
	  run.call(event.data);
	};
	// Node.js 0.9+ & IE10+ has setImmediate, otherwise:
	if(!setTask || !clearTask){
	  setTask = function setImmediate(fn){
	    var args = [], i = 1;
	    while(arguments.length > i)args.push(arguments[i++]);
	    queue[++counter] = function(){
	      invoke(typeof fn == 'function' ? fn : Function(fn), args);
	    };
	    defer(counter);
	    return counter;
	  };
	  clearTask = function clearImmediate(id){
	    delete queue[id];
	  };
	  // Node.js 0.8-
	  if(__webpack_require__(7)(process) == 'process'){
	    defer = function(id){
	      process.nextTick(ctx(run, id, 1));
	    };
	  // Browsers with MessageChannel, includes WebWorkers
	  } else if(MessageChannel){
	    channel = new MessageChannel;
	    port    = channel.port2;
	    channel.port1.onmessage = listener;
	    defer = ctx(port.postMessage, port, 1);
	  // Browsers with postMessage, skip WebWorkers
	  // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
	  } else if(global.addEventListener && typeof postMessage == 'function' && !global.importScripts){
	    defer = function(id){
	      global.postMessage(id + '', '*');
	    };
	    global.addEventListener('message', listener, false);
	  // IE8-
	  } else if(ONREADYSTATECHANGE in cel('script')){
	    defer = function(id){
	      html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function(){
	        html.removeChild(this);
	        run.call(id);
	      };
	    };
	  // Rest old browsers
	  } else {
	    defer = function(id){
	      setTimeout(ctx(run, id, 1), 0);
	    };
	  }
	}
	module.exports = {
	  set:   setTask,
	  clear: clearTask
	};

/***/ },
/* 35 */
/***/ function(module, exports) {

	// fast apply, http://jsperf.lnkit.com/fast-apply/5
	module.exports = function(fn, args, that){
	  var un = that === undefined;
	  switch(args.length){
	    case 0: return un ? fn()
	                      : fn.call(that);
	    case 1: return un ? fn(args[0])
	                      : fn.call(that, args[0]);
	    case 2: return un ? fn(args[0], args[1])
	                      : fn.call(that, args[0], args[1]);
	    case 3: return un ? fn(args[0], args[1], args[2])
	                      : fn.call(that, args[0], args[1], args[2]);
	    case 4: return un ? fn(args[0], args[1], args[2], args[3])
	                      : fn.call(that, args[0], args[1], args[2], args[3]);
	  } return              fn.apply(that, args);
	};

/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(3).document && document.documentElement;

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	var global    = __webpack_require__(3)
	  , macrotask = __webpack_require__(34).set
	  , Observer  = global.MutationObserver || global.WebKitMutationObserver
	  , process   = global.process
	  , Promise   = global.Promise
	  , isNode    = __webpack_require__(7)(process) == 'process';

	module.exports = function(){
	  var head, last, notify;

	  var flush = function(){
	    var parent, fn;
	    if(isNode && (parent = process.domain))parent.exit();
	    while(head){
	      fn   = head.fn;
	      head = head.next;
	      try {
	        fn();
	      } catch(e){
	        if(head)notify();
	        else last = undefined;
	        throw e;
	      }
	    } last = undefined;
	    if(parent)parent.enter();
	  };

	  // Node.js
	  if(isNode){
	    notify = function(){
	      process.nextTick(flush);
	    };
	  // browsers with MutationObserver
	  } else if(Observer){
	    var toggle = true
	      , node   = document.createTextNode('');
	    new Observer(flush).observe(node, {characterData: true}); // eslint-disable-line no-new
	    notify = function(){
	      node.data = toggle = !toggle;
	    };
	  // environments with maybe non-completely correct, but existent Promise
	  } else if(Promise && Promise.resolve){
	    var promise = Promise.resolve();
	    notify = function(){
	      promise.then(flush);
	    };
	  // for other environments - macrotask based on:
	  // - setImmediate
	  // - MessageChannel
	  // - window.postMessag
	  // - onreadystatechange
	  // - setTimeout
	  } else {
	    notify = function(){
	      // strange IE + webpack dev server bug - use .call(global)
	      macrotask.call(global, flush);
	    };
	  }

	  return function(fn){
	    var task = {fn: fn, next: undefined};
	    if(last)last.next = task;
	    if(!head){
	      head = task;
	      notify();
	    } last = task;
	  };
	};

/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	var redefine = __webpack_require__(23);
	module.exports = function(target, src, safe){
	  for(var key in src)redefine(target, key, src[key], safe);
	  return target;
	};

/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	var def = __webpack_require__(14).f
	  , has = __webpack_require__(24)
	  , TAG = __webpack_require__(8)('toStringTag');

	module.exports = function(it, tag, stat){
	  if(it && !has(it = stat ? it : it.prototype, TAG))def(it, TAG, {configurable: true, value: tag});
	};

/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var global      = __webpack_require__(3)
	  , dP          = __webpack_require__(14)
	  , DESCRIPTORS = __webpack_require__(18)
	  , SPECIES     = __webpack_require__(8)('species');

	module.exports = function(KEY){
	  var C = global[KEY];
	  if(DESCRIPTORS && C && !C[SPECIES])dP.f(C, SPECIES, {
	    configurable: true,
	    get: function(){ return this; }
	  });
	};

/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	var ITERATOR     = __webpack_require__(8)('iterator')
	  , SAFE_CLOSING = false;

	try {
	  var riter = [7][ITERATOR]();
	  riter['return'] = function(){ SAFE_CLOSING = true; };
	  Array.from(riter, function(){ throw 2; });
	} catch(e){ /* empty */ }

	module.exports = function(exec, skipClosing){
	  if(!skipClosing && !SAFE_CLOSING)return false;
	  var safe = false;
	  try {
	    var arr  = [7]
	      , iter = arr[ITERATOR]();
	    iter.next = function(){ return {done: safe = true}; };
	    arr[ITERATOR] = function(){ return iter; };
	    exec(arr);
	  } catch(e){ /* empty */ }
	  return safe;
	};

/***/ }
/******/ ]);
// CommonJS export
if(typeof module != 'undefined' && module.exports)module.exports = __e;
// RequireJS export
else if(typeof define == 'function' && define.amd)define(function(){return __e});
// Export to global object
else __g.core = __e;
}(1, 1);/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "/";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var makeSimpleGrid = __webpack_require__(2);
	var debounce = __webpack_require__(13);
	// require('../scss/grid.scss');
	
	
	var elem = document.getElementsByClassName('grid-app-container')[0];
	
	var numRows = 1000;
	var numCols = 100;
	
	var grid = makeSimpleGrid(numRows, numCols, [30], [50, 100, 400, 90], 1, 3, undefined, 1, 1, {
	  allowEdit: true,
	  snapToCell: false
	});
	grid.colModel.get(0).width = 60;
	grid.colModel.get(2).width = 60;
	grid.build(elem);
	grid.navigationModel.minRow = 1;
	grid.pixelScrollModel.maxIsAllTheWayFor.height = true;
	grid.fps.logging = true;
	
	//hide columsn for testing
	for (var c = 0; c < grid.colModel.length(); c++) {
	  if (c > 4 && c % 5 === 0) {
	    grid.colModel.get(c).hidden = true;
	  }
	}
	
	for (var r = 0; r < grid.rowModel.length(); r++) {
	  var row = grid.rowModel.get(r);
	  row.children = [];
	  for (var s = 0; s < Math.floor(Math.random() * 5) + 1; s++) {
	    var subRow = grid.rowModel.create();
	    subRow.dataRow = s;
	    subRow.dataLayer = 1;
	    row.children.push(subRow);
	  }
	}
	
	var builder = grid.colModel.createBuilder(function () {
	  return document.createElement('a');
	}, function (elem, ctx) {
	  grid.viewLayer.setTextContent(elem, ctx.data.formatted);
	  return elem;
	});
	
	var expansionColDescriptor = grid.colModel.get(0);
	expansionColDescriptor.builder = grid.colModel.createBuilder(function (ctx) {
	  var a = document.createElement('a');
	  a.style.cursor = "pointer";
	  a.style.color = "#aaa";
	  grid.eventLoop.bind('click', a, function () {
	    var row = grid.rowModel.get(grid.view.row.toVirtual(ctx.viewRow));
	    row.expanded = !row.expanded;
	  });
	  return a;
	}, function update(elem, ctx) {
	  var row = grid.rowModel.get(ctx.virtualRow);
	  if (!row.children) {
	    elem.textContent = '';
	  } else {
	    elem.textContent = ">";
	  }
	  return elem;
	});
	grid.colModel.get(0).width = 30;
	// grid.colModel.get(1).builder = builder;
	grid.colModel.get(2).builder = builder;
	
	var headerRow = grid.rowModel.get(0);
	headerRow.isBuiltActionable = false;
	headerRow.builder = grid.rowModel.createBuilder(function () {
	  var div = document.createElement('div');
	  div.innerHTML = '<div><div></div><div style="color:#777;text-transform: capitalize;"></div></div>';
	  return div.firstChild;
	}, function (elem, ctx) {
	  if (ctx.virtualCol === 0) {
	    return elem;
	  }
	  elem.children[0].textContent = ctx.data.formatted;
	  elem.children[1].textContent = 'header' + ctx.virtualCol;
	  return elem;
	});
	
	headerRow.height = 40;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var util = __webpack_require__(3);
	
	module.exports = function (numRows, numCols, varyHeights, varyWidths, fixedRows, fixedCols, preSetupFn, headerRows, headerCols, opts) {
	
	    var grid = __webpack_require__(4)(opts);
	
	    if (preSetupFn) {
	        preSetupFn(grid);
	    }
	
	    headerRows = headerRows || 0;
	    headerCols = headerCols || 0;
	
	    if (numRows) {
	        var rows = [];
	        var cols = [];
	        for (var r = 0; r < numRows + headerRows; r++) {
	            var row = grid.rowModel.create();
	            var dataRow = r - headerRows;
	            row.dataRow = dataRow;
	            if (r < headerRows) {
	                row.dataRow = r;
	                row.header = true;
	            } else if (r < fixedRows + headerRows) {
	                // returns false for undefined luckily
	                row.fixed = true;
	            }
	            if (util.isArray(varyHeights)) {
	                row.height = varyHeights[r % varyHeights.length];
	            }
	            rows.push(row);
	            if (numCols) {
	                for (var c = 0; c < numCols + headerCols || 0; c++) {
	                    var dataCol = c - headerCols;
	                    if (r === 0) {
	                        var col = grid.colModel.create();
	                        col.dataCol = dataCol;
	                        if (c < headerCols) {
	                            col.dataCol = c;
	                            col.header = true;
	                        } else if (c < fixedCols + headerCols) {
	                            col.fixed = true;
	                        }
	                        if (varyWidths) {
	                            if (util.isArray(varyWidths)) {
	                                col.width = varyWidths[c % varyWidths.length];
	                            } else {
	                                col.width = Math.random() * 10 + 101;
	                            }
	                        }
	                        cols.push(col);
	                    }
	                    if (c < headerCols || r < headerRows) {
	                        grid.dataModel.setHeader(r, c, [r, c]);
	                    } else {
	                        grid.dataModel.set(dataRow, dataCol, [dataRow, dataCol]);
	                    }
	                }
	            }
	        }
	        grid.rowModel.add(rows);
	        grid.colModel.add(cols);
	    }
	
	    return grid;
	};

/***/ },
/* 3 */
/***/ function(module, exports) {

	'use strict';
	
	var util = {
	    clamp: function clamp(num, min, max, returnNaN) {
	        if (num > max) {
	            return returnNaN ? NaN : max;
	        }
	        if (num < min) {
	            return returnNaN ? NaN : min;
	        }
	        return num;
	    },
	    isNumber: function isNumber(number) {
	        return typeof number === 'number' && !isNaN(number);
	    },
	    isElement: function isElement(node) {
	        return !!(node && (node.nodeName || // we are a direct element
	        node.prop && node.attr && node.find)); // we have an on and find method part of jquery API
	    },
	    isArray: function isArray(value) {
	        return Object.prototype.toString.call(value) === '[object Array]';
	    },
	    position: function position(elem, t, l, b, r, h, w) {
	        if (t != null) {
	            elem.style.top = t + 'px';
	        }
	        if (l != null) {
	            elem.style.left = l + 'px';
	        }
	        if (b != null) {
	            elem.style.bottom = b + 'px';
	        }
	        if (r != null) {
	            elem.style.right = r + 'px';
	        }
	        if (h != null) {
	            elem.style.height = h + 'px';
	        }
	        if (w != null) {
	            elem.style.width = w + 'px';
	        }
	        elem.style.position = 'absolute';
	    },
	    position3D: function position3D(elem, t, l) {
	        var x = '0';
	        var y = '0';
	        if (l != null) {
	            x = l + 'px';
	        }
	        if (t != null) {
	            y = t + 'px';
	        }
	        elem.style.transform = 'translate3d(' + x + ',' + y + ',0)';
	    }
	};
	module.exports = util;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var elementClass = __webpack_require__(5);
	var dirtyClean = __webpack_require__(6);
	var util = __webpack_require__(3);
	var rangeUtil = __webpack_require__(7);
	var passThrough = __webpack_require__(8);
	var capitalize = __webpack_require__(9);
	var escapeStack = __webpack_require__(10);
	
	module.exports = function (opts) {
	    function GridMarker() {}
	    var grid = new GridMarker();
	    grid.opts = opts || {};
	    var userSuppliedEscapeStack;
	    Object.defineProperty(grid, 'escapeStack', {
	        get: function get() {
	            return userSuppliedEscapeStack || escapeStack(true);
	        },
	        set: function set(v) {
	            userSuppliedEscapeStack = {
	                // support old method for now
	                add: v.addEscapeHandler || v.add
	            };
	        }
	    });
	
	    // the order here matters because some of these depend on each other
	    grid.eventLoop = __webpack_require__(11)(grid);
	    grid.decorators = __webpack_require__(15)(grid);
	    grid.cellClasses = __webpack_require__(18)(grid);
	    grid.rowModel = __webpack_require__(19)(grid);
	    grid.colModel = __webpack_require__(22)(grid);
	    grid.dataModel = __webpack_require__(23)(grid);
	    grid.virtualPixelCellModel = __webpack_require__(24)(grid);
	    grid.cellScrollModel = __webpack_require__(25)(grid);
	    grid.cellMouseModel = __webpack_require__(26)(grid);
	    grid.cellKeyboardModel = __webpack_require__(28)(grid);
	    grid.fps = __webpack_require__(29)(grid);
	
	    grid.viewPort = __webpack_require__(31)(grid);
	
	    addUtilsToCore(); // this has to happen here for things not to break, view layer will add cell classes and that cache requires the utils
	
	
	    grid.viewLayer = __webpack_require__(32)(grid);
	
	    // things with logic that also register decorators (slightly less core than the other models)
	    if (!(opts && opts.col && opts.col.disableReorder)) {
	        grid.colReorder = __webpack_require__(33)(grid);
	    }
	    if (opts && opts.allowEdit) {
	        grid.editModel = __webpack_require__(42)(grid);
	    }
	    grid.navigationModel = __webpack_require__(44)(grid);
	    grid.pixelScrollModel = __webpack_require__(45)(grid);
	    grid.showHiddenCols = __webpack_require__(46)(grid);
	    grid.colResize = __webpack_require__(47)(grid);
	    grid.copyPaste = __webpack_require__(49)(grid);
	
	    var drawRequested = false;
	    grid.requestDraw = function () {
	        if (!grid.eventLoop.isRunning) {
	            grid.viewLayer.draw();
	        } else {
	            drawRequested = true;
	        }
	    };
	
	    grid.eventLoop.bind('grid-draw', function () {
	        drawRequested = false;
	    });
	
	    grid.eventLoop.addExitListener(function () {
	        if (drawRequested) {
	            grid.viewLayer.draw();
	        }
	    });
	
	    function setupTextareaForContainer(textarea, container) {
	        textarea.addEventListener('focus', function () {
	            if (container) {
	                elementClass(container).add('focus');
	            }
	            textarea.select();
	            grid.focused = true;
	            grid.eventLoop.fire('grid-focus');
	        });
	
	        textarea.addEventListener('blur', function () {
	            if (container) {
	                elementClass(container).remove('focus');
	            }
	            grid.focused = false;
	            grid.eventLoop.fire('grid-blur');
	        });
	
	        var widthResetTimeout;
	        grid.eventLoop.addInterceptor(function (e) {
	            if (e.type !== 'mousedown' || e.button !== 2) {
	                return;
	            }
	            textarea.style.width = '100%';
	            textarea.style.height = '100%';
	            textarea.style.zIndex = 1;
	            clearTimeout(widthResetTimeout);
	            widthResetTimeout = setTimeout(function () {
	                textarea.style.zIndex = 0;
	                textarea.style.width = '0px';
	                textarea.style.height = '1px';
	            }, 1);
	        });
	
	        container.appendChild(textarea);
	        if (!container.getAttribute('tabIndex')) {
	            container.tabIndex = -1;
	        }
	        container.addEventListener('focus', function () {
	            if (textarea) {
	                textarea.focus();
	            }
	        });
	    }
	
	    function createFocusTextArea() {
	        var textarea = document.createElement('textarea');
	        textarea.setAttribute('dts', 'grid-textarea');
	        util.position(textarea, 0, 0);
	        textarea.style.width = '0px';
	        textarea.style.height = '1px';
	        textarea.style.maxWidth = '100%';
	        textarea.style.maxHeight = '100%';
	        textarea.style.zIndex = 0;
	        textarea.style.overflow = 'hidden';
	
	        textarea.style.background = 'transparent';
	        textarea.style.color = 'transparent';
	        textarea.style.border = 'none';
	        textarea.style.boxShadow = 'none';
	        textarea.style.cursor = 'default';
	        textarea.classList.add('grid-textarea');
	        textarea.setAttribute('ondragstart', 'return false;');
	
	        return textarea;
	    }
	
	    function addUtilsToCore() {
	        function iterateRange() {
	            // expects to be called with the space as its this
	            var args = rangeUtil.getArgs(arguments);
	            var range = args.range;
	            var rowFn = args.rowFn;
	            var cellFn = args.cellFn;
	            var rowResult;
	            rowloop: for (var r = range.top; r < range.top + range.height; r = this.row.next(r)) {
	                rowResult = undefined;
	                if (rowFn) {
	                    rowResult = rowFn(r);
	                }
	                colloop: for (var c = range.left; c < range.left + range.width; c = this.col.next(c)) {
	                    if (cellFn) {
	                        var result = cellFn(r, c, rowResult);
	                        if (result === false) {
	                            break rowloop;
	                        } else if (result === true) {
	                            break colloop;
	                        }
	                    }
	                }
	            }
	        }
	
	        function iterateWhileHidden(step, start) {
	            step = step || 1;
	            for (var i = start + step; i < this.count() && i >= 0; i += step) {
	                if (!this.get(i).hidden) {
	                    return i;
	                }
	            }
	        }
	
	        function addToDimension(dim, spaceName, getter) {
	            //convert whatever space to virtual and use the row or col virtual getter
	            dim.get = function (idx) {
	                return getter(this.toVirtual(idx));
	            }.bind(dim);
	            dim.next = iterateWhileHidden.bind(dim, 1);
	            dim.prev = iterateWhileHidden.bind(dim, -1);
	            dim.clamp = function (idx) {
	                return util.clamp(idx, 0, this.count() - 1);
	            }.bind(dim);
	            dim.indexes = function () {
	                var opts;
	                opts = arguments[0];
	                opts = opts || {};
	                opts.from = opts.from || 0;
	                var count = this.count();
	                opts.to = opts.to + 1 || opts.length && opts.length + opts.from || count;
	                var indexes = [];
	                for (var idx = Math.max(opts.from, 0); idx < Math.min(opts.to, count); idx = opts.reverse ? this.prev(idx) : this.next(idx)) {
	                    indexes.push(idx);
	                }
	                return indexes;
	            };
	
	            dim.iterate = function () {
	                var opts;
	                var fn;
	                if (arguments.length === 2) {
	                    opts = arguments[0];
	                    fn = arguments[1];
	                } else {
	                    fn = arguments[0];
	                }
	                dim.indexes(opts).some(function (idx) {
	                    return fn(idx);
	                });
	            };
	
	            // have data to data be passthrough for example
	            dim['to' + capitalize(spaceName)] = passThrough;
	
	            return dim;
	        }
	
	        function addToSpace(spaceName) {
	            var space = grid[spaceName];
	            space.iterate = iterateRange.bind(space);
	            addToDimension(space.col, spaceName, function (idx) {
	                return grid.colModel.get(idx);
	            });
	            addToDimension(space.row, spaceName, function (idx) {
	                return grid.rowModel.get(idx);
	            });
	            space.up = space.row.prev;
	            space.down = space.row.next;
	            space.left = space.col.prev;
	            space.right = space.col.next;
	        }
	
	        grid.data = {
	            col: {
	                toVirtual: function toVirtual(dataCol) {
	                    return grid.colModel.toVirtual(dataCol);
	                },
	                toView: function toView(dataCol) {
	                    return grid.virtual.col.toView(this.toVirtual(dataCol));
	                },
	                count: function count() {
	                    return grid.colModel.length();
	                }
	            },
	            row: {
	                toVirtual: function toVirtual(dataRow) {
	                    return grid.rowModel.toVirtual(dataRow);
	                },
	                toView: function toView(dataRow) {
	                    return grid.virtual.row.toView(this.toVirtual(dataRow));
	                },
	                count: function count() {
	                    return grid.rowModel.length();
	                }
	            }
	        };
	        addToSpace('data');
	
	        grid.virtual = {
	            col: {
	                toData: function toData(virtualCol) {
	                    return grid.colModel.toData(virtualCol);
	                },
	                toView: function toView(virtualCol) {
	                    return grid.viewPort.toRealCol(virtualCol);
	                },
	                count: function count() {
	                    return grid.colModel.length(true);
	                }
	            },
	            row: {
	                toData: function toData(virtualRow) {
	                    return grid.rowModel.toData(virtualRow);
	                },
	                toView: function toView(virtualRow) {
	                    return grid.viewPort.toRealRow(virtualRow);
	                },
	                count: function count() {
	                    return grid.rowModel.length(true);
	                }
	            }
	        };
	        addToSpace('virtual');
	
	        grid.view = {
	            col: {
	                toData: function toData(viewCol) {
	                    return grid.virtual.col.toData(this.toVirtual(viewCol));
	                },
	                toVirtual: function toVirtual(viewCol) {
	                    return grid.viewPort.toVirtualCol(viewCol);
	                },
	                count: function count() {
	                    return grid.viewPort.cols;
	                }
	            },
	            row: {
	                toData: function toData(viewRow) {
	                    return grid.virtual.row.toData(this.toVirtual(viewRow));
	                },
	                toVirtual: function toVirtual(viewRow) {
	                    return grid.viewPort.toVirtualRow(viewRow);
	                },
	                count: function count() {
	                    return grid.viewPort.rows;
	                }
	            }
	        };
	        addToSpace('view');
	
	        timeouts = [];
	        grid.timeout = function () {
	            if (grid.destroyed) {
	                return;
	            }
	            var id = setTimeout.apply(window, arguments);
	            timeouts.push(id);
	            return id;
	        };
	        intervals = [];
	        grid.interval = function () {
	            if (grid.destroyed) {
	                return;
	            }
	            var id = setInterval.apply(window, arguments);
	            intervals.push(id);
	            return id;
	        };
	    }
	
	    var intervals;
	    var timeouts;
	    grid.eventLoop.bind('grid-destroy', function () {
	        intervals.forEach(function (id) {
	            clearInterval(id);
	        });
	
	        timeouts.forEach(function (id) {
	            clearTimeout(id);
	        });
	    });
	
	    grid.build = function (container) {
	        grid.container = container;
	        setupTextareaForContainer(grid.textarea, container);
	        grid.viewPort.sizeToContainer(container);
	        grid.viewLayer.build(container);
	        grid.eventLoop.setContainer(container);
	        container.style.overflow = 'hidden';
	        // the container should never actually scroll, but the browser does automatically sometimes so let's reset it when that happens
	        container.addEventListener('scroll', function () {
	            container.scrollTop = 0;
	            container.scrollLeft = 0;
	        });
	    };
	
	    grid.makeDirtyClean = function () {
	        return dirtyClean(grid);
	    };
	
	    grid.eventIsOnCells = grid.viewLayer.eventIsOnCells;
	
	    grid.textarea = createFocusTextArea();
	
	    grid.destroy = function () {
	        grid.eventLoop.fire('grid-destroy');
	    };
	
	    return grid;
	};

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = function(opts) {
	  return new ElementClass(opts)
	}
	
	function ElementClass(opts) {
	  if (!(this instanceof ElementClass)) return new ElementClass(opts)
	  var self = this
	  if (!opts) opts = {}
	
	  // similar doing instanceof HTMLElement but works in IE8
	  if (opts.nodeType) opts = {el: opts}
	
	  this.opts = opts
	  this.el = opts.el || document.body
	  if (typeof this.el !== 'object') this.el = document.querySelector(this.el)
	}
	
	ElementClass.prototype.add = function(className) {
	  var el = this.el
	  if (!el) return
	  if (el.className === "") return el.className = className
	  var classes = el.className.split(' ')
	  if (classes.indexOf(className) > -1) return classes
	  classes.push(className)
	  el.className = classes.join(' ')
	  return classes
	}
	
	ElementClass.prototype.remove = function(className) {
	  var el = this.el
	  if (!el) return
	  if (el.className === "") return
	  var classes = el.className.split(' ')
	  var idx = classes.indexOf(className)
	  if (idx > -1) classes.splice(idx, 1)
	  el.className = classes.join(' ')
	  return classes
	}
	
	ElementClass.prototype.has = function(className) {
	  var el = this.el
	  if (!el) return
	  var classes = el.className.split(' ')
	  return classes.indexOf(className) > -1
	}


/***/ },
/* 6 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports = function (_grid) {
	    var grid = _grid;
	    var dirty = true;
	
	    var unbindDrawHandler;
	
	    function listenForDraw() {
	        if (!unbindDrawHandler) {
	            unbindDrawHandler = grid.eventLoop.bind('grid-draw', function () {
	                api.setClean();
	            });
	        }
	    }
	
	    var api = {
	        isDirty: function isDirty() {
	            return dirty;
	        },
	        isClean: function isClean() {
	            return !dirty;
	        },
	        setDirty: function setDirty() {
	            dirty = true;
	            // when things are initalizing sometimes this doesn't exist yet
	            // we have to hope that at the end of initialization the grid will call request draw itself
	            if (grid.requestDraw) {
	                grid.requestDraw();
	            }
	        },
	        setClean: function setClean() {
	            dirty = false;
	        },
	        disable: function disable() {
	            if (unbindDrawHandler) {
	                unbindDrawHandler();
	                unbindDrawHandler = null;
	            }
	        },
	        enable: function enable() {
	            listenForDraw();
	        }
	    };
	
	    api.enable();
	
	    return api;
	};

/***/ },
/* 7 */
/***/ function(module, exports) {

	"use strict";
	
	module.exports = {
	    //takes a point and a length as the ranges in array form
	    intersect: function intersect(range1, range2) {
	        var range2Start = range2[0];
	        var range1Start = range1[0];
	        var range1End = range1Start + range1[1] - 1;
	        var range2End = range2Start + range2[1] - 1;
	        if (range2Start > range1End || range2End < range1Start) {
	            return null;
	        }
	        var resultStart = range1Start > range2Start ? range1Start : range2Start;
	        var resultEnd = range1End < range2End ? range1End : range2End;
	        return [resultStart, resultEnd - resultStart + 1];
	    },
	    //takes a point and a length as the ranges in array form
	    union: function union(range1, range2) {
	        if (!range1) {
	            return range2;
	        }
	        if (!range2) {
	            return range1;
	        }
	        var range2Start = range2[0];
	        var range2End = range2Start + range2[1] - 1;
	        var range1Start = range1[0];
	        var range1End = range1Start + range1[1] - 1;
	        var resultStart = range1Start < range2Start ? range1Start : range2Start;
	        return [resultStart, (range1End > range2End ? range1End : range2End) - resultStart + 1];
	    },
	
	    //takes two row, col points and creates a normal position range
	    createFromPoints: function createFromPoints(r1, c1, r2, c2) {
	        var range = {};
	        if (r1 < r2) {
	            range.top = r1;
	            range.height = r2 - r1 + 1;
	        } else {
	            range.top = r2;
	            range.height = r1 - r2 + 1;
	        }
	
	        if (c1 < c2) {
	            range.left = c1;
	            range.width = c2 - c1 + 1;
	        } else {
	            range.left = c2;
	            range.width = c1 - c2 + 1;
	        }
	        return range;
	    },
	    iterate: function iterate() {
	        var args = this.getArgs(arguments);
	        var range = args.range;
	        var cellFn = args.cellFn;
	        var rowFn = args.rowFn;
	        for (var r = range.top; r < range.top + range.height; r++) {
	            var rowResult;
	            if (rowFn) {
	                rowResult = rowFn(r);
	            }
	            for (var c = range.left; c < range.left + range.width; c++) {
	                if (cellFn) {
	                    cellFn(r, c, rowResult);
	                }
	            }
	        }
	    },
	    getArgs: function getArgs(args) {
	        var range = args[0];
	        var cellFn;
	        var rowFn;
	        if (args.length === 2) {
	            cellFn = args[1];
	        } else if (args.length === 3) {
	            cellFn = args[2];
	            rowFn = args[1];
	        }
	        return {
	            range: range,
	            cellFn: cellFn,
	            rowFn: rowFn
	        };
	    },
	    equal: function equal(r1, r2) {
	        return r1.top === r2.top && r1.left === r2.left && r1.width === r2.width && r1.height === r2.height;
	    }
	};

/***/ },
/* 8 */
/***/ function(module, exports) {

	"use strict";
	
	module.exports = function () {
	    return arguments[0];
	};

/***/ },
/* 9 */
/***/ function(module, exports) {

	module.exports = function (string) {
	  return string.charAt(0).toUpperCase() + string.substring(1);
	}
	
	module.exports.words = function (string) {
	  return string.replace(/(^|\W)(\w)/g, function (m) {
	    return m.toUpperCase()
	  })
	}


/***/ },
/* 10 */
/***/ function(module, exports) {

	var globalStack;
	
	function makeStack() {
	    var stack = [];
	
	    // in order to capture escape event first
	    document.body.addEventListener('keydown', function(e) {
	
	        var key = e.keyCode ? e.keyCode : e.which;
	        // yup i hard coded 27 sorry suckas
	        if (key === 27) {
	            while (!!stack.length && !(stack.pop())(e)) {}
	        }
	    }, true);
	
	    function addEscapeHandler(handler) {
	        stack.push(handler);
	        return function() {
	            removeEscapeHandler(handler);
	        };
	    }
	
	    function removeEscapeHandler(handler) {
	        var index = stack.indexOf(handler);
	        if (index !== -1) {
	            stack.splice(index, 1);
	        }
	    }
	    return {
	        add: addEscapeHandler
	    };
	}
	
	module.exports = function(global) {
	    if (!global) {
	        return makeStack();
	    }
	
	    if (!globalStack) {
	        globalStack = makeStack();
	    }
	    return globalStack;
	};


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var mousewheel = __webpack_require__(12);
	var debounce = __webpack_require__(13);
	var util = __webpack_require__(3);
	var listeners = __webpack_require__(14);
	
	var EVENTS = ['click', 'mousedown', 'mouseup', 'mousemove', 'dblclick', 'keydown', 'keypress', 'keyup', 'copy', 'paste'];
	
	var GRID_EVENTS = ['grid-drag-start', 'grid-drag', 'grid-cell-drag', 'grid-drag-end', 'grid-cell-mouse-move'];
	
	var eventLoop = function eventLoop() {
	    var eloop = {
	        isRunning: false
	    };
	
	    var handlersByName = {};
	    var domUnbindFns = [];
	
	    var unbindAll;
	
	    eloop.setContainer = function (container) {
	        var unbindMouseWheelFn = mousewheel.bind(container, mainLoop);
	
	        EVENTS.forEach(function (name) {
	            bindToDomElement(container, name, mainLoop);
	        });
	
	        GRID_EVENTS.forEach(function (name) {
	            bindToDomElement(window, name, mainLoop);
	        });
	
	        unbindAll = function unbindAll() {
	            unbindMouseWheelFn();
	
	            // have to copy the array since the unbind will actually remove itself from the array which modifies it mid iteration
	            domUnbindFns.slice(0).forEach(function (unbind) {
	                unbind();
	            });
	
	            Object.keys(handlersByName).forEach(function (key) {
	                handlersByName[key] = [];
	            });
	        };
	    };
	
	    function getHandlers(name) {
	        var handlers = handlersByName[name];
	        if (!handlers) {
	            handlers = handlersByName[name] = [];
	        }
	        return handlers;
	    }
	
	    function bindToDomElement(elem, name, listener) {
	        elem.addEventListener(name, listener);
	        var unbindFn = function unbindFn() {
	            elem.removeEventListener(name, listener);
	            domUnbindFns.splice(domUnbindFns.indexOf(unbindFn), 1);
	        };
	        domUnbindFns.push(unbindFn);
	        return unbindFn;
	    }
	
	    function getHandlerFromArgs(args) {
	        var handler = args.filter(function (arg) {
	            return typeof arg === 'function';
	        })[0];
	        return handler;
	    }
	
	    eloop.bind = function () {
	        var args = Array.prototype.slice.call(arguments, 0);
	        var name = args.filter(function (arg) {
	            return typeof arg === 'string';
	        })[0];
	        var handler = getHandlerFromArgs(args);
	        if (!handler || !name) {
	            throw 'cannot bind without at least name and function';
	        }
	
	        var elem = args.filter(function (arg) {
	            return util.isElement(arg) || arg === window || arg === document;
	        })[0];
	
	        if (!elem) {
	
	            handler._eventLoopIdx = getHandlers(name).push(handler) - 1;
	            handler._eventLoopUnbound = false;
	            return function () {
	                if (handler._eventLoopUnbound) {
	                    return;
	                }
	                handler._eventLoopUnbound = true;
	                var handlers = getHandlers(name);
	                handlers[handler._eventLoopIdx] = null;
	                // release the memory but do the expensive work later all at once
	                scheduleHandlerCleanUp();
	            };
	        } else {
	            var listener = loopWith(handler);
	            // make sure the elem can receive events
	            if (elem.style) {
	                elem.style.pointerEvents = 'auto';
	            }
	            return bindToDomElement(elem, name, listener);
	        }
	    };
	
	    eloop.bindOnce = function () {
	        var args = Array.prototype.slice.call(arguments, 0);
	        var handler = getHandlerFromArgs(args);
	        args.splice(args.indexOf(handler), 1, function bindOnceHandler(e) {
	            unbind();
	            handler(e);
	        });
	        var unbind = eloop.bind.apply(this, args);
	        return unbind;
	    };
	
	    eloop.fire = function (event) {
	        event = typeof event === 'string' ? {
	            type: event
	        } : event;
	        mainLoop(event);
	    };
	
	    var interceptors = listeners();
	    var exitListeners = listeners();
	
	    eloop.addInterceptor = interceptors.addListener;
	    eloop.addExitListener = exitListeners.addListener;
	
	    function loopWith(fn) {
	        return function (e) {
	            loop(e, fn);
	        };
	    }
	
	    var scheduleHandlerCleanUp = debounce(function () {
	        Object.keys(handlersByName).forEach(function (type) {
	            var i = 0;
	            handlersByName[type] = handlersByName[type].filter(function (handler) {
	                if (!!handler) {
	                    handler._eventLoopIdx = i;
	                    i++;
	                }
	                return !!handler;
	            });
	        });
	    }, 1);
	
	    var mainLoop = loopWith(function (e) {
	        // have to copy the array because handlers can unbind themselves which modifies the array
	        // we use some so that we can break out of the loop if need be
	        getHandlers(e.type).slice(0).some(function (handler) {
	            if (!handler) {
	                return;
	            }
	            handler(e);
	            if (e.gridStopBubbling) {
	                return true;
	            }
	        });
	    });
	
	    function loop(e, bodyFn) {
	        if (eloop.logTargets) {
	            console.log('target', e.target, 'currentTarget', e.currentTarget);
	        }
	        var isOuterLoopRunning = eloop.isRunning;
	        eloop.isRunning = true;
	        interceptors.notify(e);
	        if (!e.gridStopBubbling) {
	            bodyFn(e);
	        }
	
	        if (!isOuterLoopRunning) {
	            eloop.isRunning = false;
	            exitListeners.notify(e);
	        }
	    }
	
	    eloop.bind('grid-destroy', function () {
	        unbindAll();
	        eloop.destroyed = true;
	    });
	
	    eloop.stopBubbling = function (e) {
	        e.gridStopBubbling = true;
	        return e;
	    };
	
	    return eloop;
	};
	
	eventLoop.EVENTS = EVENTS;
	eventLoop.GRID_EVENTS = GRID_EVENTS;
	module.exports = eventLoop;

/***/ },
/* 12 */
/***/ function(module, exports) {

	'use strict';
	
	var EVENT_NAMES = ['mousewheel', 'wheel', 'DOMMouseScroll'];
	
	var api = {
	    getDelta: function getDelta(event, xaxis) {
	        if (event.wheelDelta) {
	            //for everything but firefox
	            var delta = event.wheelDeltaY;
	            if (xaxis) {
	                delta = event.wheelDeltaX;
	            }
	            return delta;
	        } else if (event.detail) {
	            //for firefox pre version 17
	            if (event.axis && (event.axis === 1 && xaxis || event.axis === 2 && !xaxis)) {
	                return -1 * event.detail * 12;
	            }
	        } else if (event.deltaX || event.deltaY) {
	            if (xaxis) {
	                return -1 * event.deltaX;
	            } else {
	                return -1 * event.deltaY;
	            }
	        }
	        return 0;
	    },
	
	    //binds a cross browser normalized mousewheel event, and returns a function that will unbind the listener;
	    bind: function bind(elem, listener) {
	        var normalizedListener = function normalizedListener(e) {
	            listener(normalizeWheelEvent(e));
	        };
	
	        EVENT_NAMES.forEach(function (name) {
	            elem.addEventListener(name, normalizedListener);
	        });
	
	        return function () {
	            EVENT_NAMES.forEach(function (name) {
	                elem.removeEventListener(name, normalizedListener);
	            });
	        };
	    },
	    normalize: normalizeWheelEvent
	};
	
	function normalizeWheelEvent(e) {
	    var deltaX = api.getDelta(e, true);
	    var deltaY = api.getDelta(e);
	    var newEvent = Object.create(e, {
	        deltaY: {
	            value: deltaY
	        },
	        deltaX: {
	            value: deltaX
	        },
	        type: {
	            value: 'mousewheel'
	        },
	        target: {
	            value: e.target
	        },
	        currentTarget: {
	            value: e.currentTarget
	        }
	    });
	
	    newEvent.preventDefault = function () {
	        newEvent.defaultPrevented = true;
	        if (e && e.preventDefault) {
	            e.preventDefault();
	        }
	    };
	    return newEvent;
	}
	
	module.exports = api;

/***/ },
/* 13 */
/***/ function(module, exports) {

	"use strict";
	
	module.exports = function (fn, delay) {
	    var f = function debounced() {
	        if (f.timeout) {
	            clearTimeout(f.timeout);
	            f.timeout = undefined;
	        }
	        if (!f.canceled) {
	            f.timeout = setTimeout(fn, delay);
	        }
	        f.cancel = function () {
	            clearTimeout(f.timeout);
	            f.timeout = undefined;
	            f.canceled = true;
	        };
	    };
	    return f;
	};

/***/ },
/* 14 */
/***/ function(module, exports) {

	"use strict";
	
	/*
	 A simple package for creating a list of listeners that can be added to and notified
	 */
	
	module.exports = function () {
	    var listeners = [];
	    return {
	        //returns a removal function to unbind the listener
	        addListener: function addListener(fn) {
	            listeners.push(fn);
	            return function () {
	                listeners.splice(listeners.indexOf(fn), 1);
	            };
	        },
	        notify: function notify(e) {
	            listeners.forEach(function (listener) {
	                listener(e);
	            });
	        }
	    };
	};

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var util = __webpack_require__(3);
	var makeDirtyClean = __webpack_require__(6);
	var positionRange = __webpack_require__(16);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	
	    var dirtyClean = makeDirtyClean(grid);
	
	    var aliveDecorators = [];
	    var deadDecorators = [];
	
	    var decorators = {
	        add: function add(decorators) {
	            if (!util.isArray(decorators)) {
	                decorators = [decorators];
	            }
	            decorators.forEach(function (decorator) {
	                aliveDecorators.push(decorator);
	                if (decorator._decoratorDirtyClean) {
	                    decorator._decoratorDirtyClean.enable();
	                }
	            });
	            dirtyClean.setDirty();
	        },
	        remove: function remove(decorators) {
	            if (!util.isArray(decorators)) {
	                decorators = [decorators];
	            }
	            decorators.forEach(function (decorator) {
	                var index = aliveDecorators.indexOf(decorator);
	                if (index !== -1) {
	                    aliveDecorators.splice(index, 1);
	                    deadDecorators.push(decorator);
	                    if (decorator._decoratorDirtyClean) {
	                        decorator._decoratorDirtyClean.disable();
	                    }
	                    dirtyClean.setDirty();
	                }
	            });
	        },
	        getAlive: function getAlive() {
	            return aliveDecorators.slice(0);
	        },
	        popAllDead: function popAllDead() {
	            var oldDead = deadDecorators;
	            deadDecorators = [];
	            return oldDead;
	        },
	        isDirty: dirtyClean.isDirty,
	        create: function create(t, l, h, w, u, s) {
	            var thisDirtyClean = makeDirtyClean(grid);
	            var decorator = {
	                _decoratorDirtyClean: thisDirtyClean
	            };
	
	            //mixin the position range functionality
	            positionRange(decorator, thisDirtyClean, dirtyClean);
	            decorator.top = t;
	            decorator.left = l;
	            decorator.height = h;
	            decorator.width = w;
	            decorator.units = u || decorator.units;
	            decorator.space = s || decorator.space;
	
	            //they can override but we should have an empty default to prevent npes
	            decorator.render = function () {
	                var div = document.createElement('div');
	                div.style.position = 'absolute';
	                div.style.top = '0px';
	                div.style.left = '0px';
	                div.style.bottom = '0px';
	                div.style.right = '0px';
	                if (decorator.postRender) {
	                    decorator.postRender(div);
	                }
	                return div;
	            };
	            return decorator;
	        }
	
	    };
	
	    return decorators;
	};

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var addDirtyProps = __webpack_require__(17);
	module.exports = function (range, dirtyClean, parentDirtyClean, propOpts) {
	    range = range || {}; // allow mixin functionality
	    range.isDirty = dirtyClean.isDirty;
	    range._positionRangeDirtyClean = dirtyClean;
	
	    var watchedProperties = ['top', 'left', 'height', 'width', 'units', 'space'];
	    if (propOpts) {
	        watchedProperties = watchedProperties.map(function (propName) {
	            return {
	                name: propName,
	                onDirty: propOpts.onDirty,
	                preDirty: propOpts.preDirty
	            };
	        });
	    }
	    var dirtyCleans = [dirtyClean];
	    if (parentDirtyClean) {
	        dirtyCleans.push(parentDirtyClean);
	    }
	
	    addDirtyProps(range, watchedProperties, dirtyCleans);
	    // defaults
	    range.units = 'cell';
	    range.space = 'data';
	
	    return range;
	};

/***/ },
/* 17 */
/***/ function(module, exports) {

	"use strict";
	
	module.exports = function (obj, props, dirtyCleans) {
	    props.forEach(function (prop) {
	        var val;
	        var name = prop.name || prop;
	        Object.defineProperty(obj, name, {
	            enumerable: true,
	            get: function get() {
	                return val;
	            },
	            set: function set(_val) {
	                var oldVal = val;
	                var isChanged = _val !== oldVal;
	                if (isChanged && prop.preDirty) {
	                    prop.preDirty();
	                }
	                val = _val;
	
	                if (isChanged) {
	                    dirtyCleans.forEach(function (dirtyClean) {
	                        dirtyClean.setDirty();
	                    });
	                    if (prop.onDirty) {
	                        prop.onDirty(_val, oldVal);
	                    }
	                }
	            }
	        });
	    });
	    return obj;
	};

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var positionRange = __webpack_require__(16);
	var makeDirtyClean = __webpack_require__(6);
	var addDirtyProps = __webpack_require__(17);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	
	    var dirtyClean = makeDirtyClean(grid);
	    var descriptors = [];
	    var cachedClassMatrix = [];
	
	    var api = {
	        add: function add(descriptor) {
	            descriptors.push(descriptor);
	            addOrRemoveCachedClass(descriptor);
	            if (descriptor._cellClassDirtyClean) {
	                descriptor._cellClassDirtyClean.enable();
	            }
	            dirtyClean.setDirty();
	        },
	        remove: function remove(descriptor) {
	            var index = descriptors.indexOf(descriptor);
	            if (index !== -1) {
	                descriptors.splice(index, 1);
	                addOrRemoveCachedClass(descriptor, true);
	                if (descriptor._cellClassDirtyClean) {
	                    descriptor._cellClassDirtyClean.disable();
	                }
	                dirtyClean.setDirty();
	            }
	        },
	        getAll: function getAll() {
	            return descriptors.slice(0);
	        },
	        getCachedClasses: function getCachedClasses(vRow, vCol) {
	            return cachedClassMatrix[vRow] && cachedClassMatrix[vRow][vCol] || [];
	        },
	        create: function create(top, left, className, height, width, space) {
	            var thisDirtyClean = makeDirtyClean(grid);
	            var descriptor = {
	                _cellClassDirtyClean: thisDirtyClean
	            };
	            // mixins
	
	            function classPreDirty() {
	                addOrRemoveCachedClass(descriptor, true);
	            }
	
	            function classOnDirty() {
	                addOrRemoveCachedClass(descriptor);
	            }
	
	            positionRange(descriptor, thisDirtyClean, dirtyClean, {
	                preDirty: classPreDirty,
	                onDirty: classOnDirty
	            });
	            addDirtyProps(descriptor, [{
	                name: 'class',
	                preDirty: classPreDirty,
	                onDirty: classOnDirty
	            }], [thisDirtyClean, dirtyClean]);
	
	            // all of these are optional
	            descriptor.top = top;
	            descriptor.left = left;
	            // default to single cell ranges
	            descriptor.height = height || 1;
	            descriptor.width = width || 1;
	            descriptor.class = className;
	            descriptor.space = space || descriptor.space;
	            return descriptor;
	        },
	        isDirty: dirtyClean.isDirty
	    };
	
	    function regnerateCache() {
	        cachedClassMatrix = [];
	        api.getAll().forEach(function (descriptor) {
	            addOrRemoveCachedClass(descriptor);
	        });
	    }
	
	    grid.eventLoop.bind('grid-row-change', regnerateCache);
	    grid.eventLoop.bind('grid-col-change', regnerateCache);
	
	    function addOrRemoveCachedClass(descriptor, isRemove) {
	        for (var r = descriptor.top; r < Math.min(descriptor.top + descriptor.height, grid.rowModel.length(true)); r++) {
	            for (var c = descriptor.left; c < Math.min(descriptor.left + descriptor.width, grid.colModel.length(true)); c++) {
	                var vRow = grid[descriptor.space].row.toVirtual(r);
	                var vCol = grid[descriptor.space].col.toVirtual(c);
	                var cols = cachedClassMatrix[vRow];
	                if (!cols) {
	                    cols = cachedClassMatrix[vRow] = [];
	                }
	                var cellClasses = cols[vCol];
	                if (!cellClasses) {
	                    if (!isRemove) {
	                        cols[vCol] = [descriptor.class];
	                    }
	                    continue;
	                }
	
	                if (!isRemove) {
	                    if (cellClasses.indexOf(descriptor.class) === -1) {
	                        cellClasses.push(descriptor.class);
	                    }
	                } else {
	                    var index = cellClasses.indexOf(descriptor.class);
	                    if (index !== -1) {
	                        cellClasses.splice(index, 1);
	                    }
	                }
	            }
	        }
	    }
	
	    return api;
	};

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	module.exports = function (_grid) {
	    var grid = _grid;
	
	    var api = __webpack_require__(20)(grid, 'row', 'height', 30);
	
	    return api;
	};

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var addDirtyProps = __webpack_require__(17);
	var util = __webpack_require__(3);
	var noop = __webpack_require__(21);
	var passThrough = __webpack_require__(8);
	var debounce = __webpack_require__(13);
	
	module.exports = function (_grid, name, lengthName, defaultSize) {
	    var grid = _grid;
	
	    var descriptors = [];
	    var _numFixed = 0;
	    var _numHeaders = 0;
	    var makeDirtyClean = __webpack_require__(6);
	    var dirtyClean = makeDirtyClean(grid);
	    var builderDirtyClean = makeDirtyClean(grid);
	    var selected = [];
	
	    function setDescriptorsDirty(eventOptional) {
	        var event = eventOptional || {};
	        event.type = 'grid-' + name + '-change';
	        grid.eventLoop.fire(event);
	        dirtyClean.setDirty();
	        builderDirtyClean.setDirty();
	    }
	
	    var fireSelectionChange = debounce(function () {
	        grid.eventLoop.fire('grid-' + name + '-selection-change');
	    }, 1);
	
	    function updateDescriptorIndices() {
	        var oldSelected = selected;
	        selected = [];
	        descriptors.forEach(function (descriptor, i) {
	            descriptor.index = i;
	            if (descriptor.selected) {
	                selected.push(i);
	            }
	        });
	        if (selected.length !== oldSelected.length) {
	            fireSelectionChange();
	            return;
	        }
	        selected.sort();
	        oldSelected.sort();
	        var change = oldSelected.some(function (idx, i) {
	            return idx !== selected[i];
	        });
	        if (change) {
	            fireSelectionChange();
	        }
	    }
	
	    function addDragReadyClass(descriptor, index) {
	        if (!descriptor || !(index >= 0)) {
	            return;
	        }
	        var top = name === 'row' ? index : -1;
	        var left = name === 'row' ? -1 : index;
	        var dragReadyClass = grid.cellClasses.create(top, left, 'grid-col-drag-ready');
	        grid.cellClasses.add(dragReadyClass);
	        descriptor.dragReadyClass = dragReadyClass;
	    }
	
	    function removeDragReadyClass(descriptor) {
	        if (!descriptor || !descriptor.dragReadyClass) {
	            return;
	        }
	        grid.cellClasses.remove(descriptor.dragReadyClass);
	        descriptor.dragReadyClass = undefined;
	    }
	
	    var api = {
	        areBuildersDirty: builderDirtyClean.isDirty,
	        isDirty: dirtyClean.isDirty,
	        defaultSize: defaultSize,
	        add: function add(toAdd) {
	            if (!toAdd) {
	                return;
	            }
	
	            if (!util.isArray(toAdd)) {
	                toAdd = [toAdd];
	            }
	            toAdd.forEach(function (descriptor) {
	                if (descriptor.header) {
	                    descriptors.splice(_numHeaders, 0, descriptor);
	                    _numFixed++;
	                    _numHeaders++;
	                } else {
	                    // if the column is fixed and the last one added is fixed (we only allow fixed at the beginning for now)
	                    if (descriptor.fixed) {
	                        if (!descriptors.length || descriptors[descriptors.length - 1].fixed) {
	                            _numFixed++;
	                        } else {
	                            throw 'Cannot add a fixed column after an unfixed one';
	                        }
	                    }
	                    descriptors.push(descriptor);
	                }
	            });
	            updateDescriptorIndices();
	            setDescriptorsDirty({
	                action: 'add',
	                descriptors: toAdd
	            });
	        },
	        addHeaders: function addHeaders(toAdd) {
	            if (!toAdd) {
	                return;
	            }
	
	            if (!util.isArray(toAdd)) {
	                toAdd = [toAdd];
	            }
	            toAdd.forEach(function (header) {
	                header.header = true;
	            });
	            api.add(toAdd);
	        },
	        header: function header(index) {
	            return descriptors[index];
	        },
	        get: function get(index) {
	            return descriptors[index];
	        },
	        length: function length(includeHeaders) {
	            var subtract = includeHeaders ? 0 : _numHeaders;
	            return descriptors.length - subtract;
	        },
	        remove: function remove(descriptor, dontUpdateIndex) {
	            var index = descriptors.indexOf(descriptor);
	            if (index !== -1) {
	                descriptors.splice(index, 1);
	                if (descriptor.header) {
	                    _numFixed--;
	                    _numHeaders--;
	                } else if (descriptor.fixed) {
	                    _numFixed--;
	                }
	            }
	            if (!dontUpdateIndex) {
	                updateDescriptorIndices();
	                setDescriptorsDirty({
	                    action: 'remove',
	                    descriptors: [descriptor]
	                });
	            }
	        },
	        clear: function clear(includeHeaders) {
	            var removed;
	            if (includeHeaders) {
	                removed = descriptors;
	                descriptors = [];
	                _numFixed = 0;
	                _numHeaders = 0;
	            } else {
	                removed = descriptors.slice(_numHeaders);
	                descriptors = descriptors.slice(0, _numHeaders);
	                _numFixed = _numHeaders;
	            }
	            updateDescriptorIndices();
	            if (removed && removed.length) {
	                setDescriptorsDirty({
	                    action: 'remove',
	                    descriptors: removed
	                });
	            }
	        },
	        move: function move(fromIndexes, target, after) {
	            if (!util.isArray(fromIndexes)) {
	                fromIndexes = [fromIndexes];
	            }
	
	            if (fromIndexes.length === 1) {
	                // the single move case is easier and doesn't require the after hint
	                var from = fromIndexes[0];
	                descriptors.splice(target, 0, descriptors.splice(from, 1)[0]);
	                setDescriptorsDirty({
	                    action: 'move',
	                    descriptors: [api.get(from), api.get(target)]
	                });
	            } else {
	                while (fromIndexes.indexOf(target) !== -1 && target !== -1) {
	                    target--;
	                    after = true;
	                }
	
	                var toValue = descriptors[target];
	                var removed = fromIndexes.sort(function compareNumbers(a, b) {
	                    return b - a;
	                }).map(function (fromIndex) {
	                    var removedDescriptors = descriptors.splice(fromIndex, 1);
	                    return removedDescriptors[0];
	                });
	                removed.reverse();
	                var spliceArgs = [descriptors.indexOf(toValue) + (after ? 1 : 0), 0].concat(removed);
	                descriptors.splice.apply(descriptors, spliceArgs);
	                updateDescriptorIndices();
	                setDescriptorsDirty({
	                    action: 'move',
	                    descriptors: removed.concat(toValue)
	                });
	            }
	        },
	        numHeaders: function numHeaders() {
	            return _numHeaders;
	        },
	        numFixed: function numFixed(excludeHeaders) {
	            return _numFixed - (excludeHeaders ? _numHeaders : 0);
	        },
	        toVirtual: function toVirtual(dataIndex) {
	            return dataIndex + api.numHeaders();
	        },
	        toData: function toData(virtualIndex) {
	            return virtualIndex - api.numHeaders();
	        },
	
	        select: function select(indexes, dontFire) {
	            if (!util.isArray(indexes)) {
	                indexes = [indexes];
	            }
	            var changes = indexes.filter(function (idx) {
	                var hasDescriptor = !!api[name](idx);
	                if (!hasDescriptor) {
	                    console.warn('Tried to select index that had no descriptor', idx);
	                }
	                return hasDescriptor;
	            }).map(function (idx) {
	                var descriptor = api[name](idx);
	                if (!descriptor.selected && descriptor.selectable !== false) {
	                    addDragReadyClass(descriptor, idx);
	                    descriptor.selected = true;
	                    selected.push(idx);
	                    return idx;
	                }
	            });
	            if (changes.length && !dontFire) {
	                fireSelectionChange();
	            }
	        },
	        deselect: function deselect(indexes, dontFire) {
	            if (!util.isArray(indexes)) {
	                indexes = [indexes];
	            }
	            var selectedMap = selected.reduce(function (map, selectedIndex) {
	                map[selectedIndex] = selectedIndex;
	                return map;
	            }, {});
	            var changes = indexes.filter(function (idx) {
	                var hasDescriptor = !!api[name](idx);
	                if (!hasDescriptor) {
	                    console.warn('Tried to deselect index that had no descriptor', idx);
	                }
	                return hasDescriptor;
	            }).map(function (idx) {
	                var descriptor = api[name](idx);
	                removeDragReadyClass(descriptor);
	                if (descriptor.selected) {
	                    descriptor.selected = false;
	                    selectedMap[idx] = false;
	                    return idx;
	                }
	            });
	            selected = Object.keys(selectedMap).reduce(function (array, selectedKey) {
	                var idx = selectedMap[selectedKey];
	                if (idx !== false) {
	                    array.push(idx);
	                }
	                return array;
	            }, []);
	
	            if (changes.length && !dontFire) {
	                fireSelectionChange();
	            }
	        },
	        toggleSelect: function toggleSelect(index) {
	            var descriptor = api[name](index);
	            if (descriptor.selected) {
	                api.deselect(index);
	            } else {
	                api.select(index);
	            }
	        },
	        clearSelected: function clearSelected() {
	            // have to make a copy or we are iterating the same array we're removing from yikes.
	            return api.deselect(api.getSelected().slice(0));
	        },
	        getSelected: function getSelected() {
	            return selected;
	        },
	        allSelected: function allSelected() {
	            return api.getSelected().length === api.length();
	        },
	        create: function create(builder) {
	            var descriptor = {};
	            var fixed = false;
	            Object.defineProperty(descriptor, 'fixed', {
	                enumerable: true,
	                get: function get() {
	                    return descriptor.header || fixed;
	                },
	                set: function set(_fixed) {
	                    fixed = _fixed;
	                }
	            });
	            var expanded = false;
	            var expandedClass;
	
	            Object.defineProperty(descriptor, 'expanded', {
	                get: function get() {
	                    return expanded;
	                },
	                set: function set(exp) {
	                    if (!descriptor.children) {
	                        return;
	                    }
	                    expanded = exp;
	                    // we never look for changes to the children, if you need to change it, remove and add the row again
	                    if (expanded) {
	                        var spliceArgs = [descriptor.index + 1, 0].concat(descriptor.children);
	                        descriptors.splice.apply(descriptors, spliceArgs);
	                        updateDescriptorIndices();
	                        setDescriptorsDirty({
	                            action: 'add',
	                            descriptors: descriptor.children
	                        });
	                        var top = name === 'row' ? descriptor.index : 0;
	                        var left = name === 'col' ? descriptor.index : 0;
	                        var height = name === 'row' ? 1 : Infinity;
	                        var width = name === 'col' ? 1 : Infinity;
	                        expandedClass = grid.cellClasses.create(top, left, 'grid-expanded', height, width, 'virtual');
	                        grid.cellClasses.add(expandedClass);
	                    } else {
	                        descriptors.splice(descriptor.index + 1, descriptor.children.length);
	                        updateDescriptorIndices();
	                        setDescriptorsDirty({
	                            action: 'remove',
	                            descriptors: [descriptor.children]
	                        });
	                        if (expandedClass) {
	                            grid.cellClasses.remove(expandedClass);
	                        }
	                    }
	                }
	            });
	
	            descriptor.isBuiltActionable = true;
	
	            addDirtyProps(descriptor, ['builder'], [builderDirtyClean]);
	            descriptor.builder = builder;
	
	            return addDirtyProps(descriptor, [{
	                name: lengthName,
	                onDirty: function onDirty() {
	                    setDescriptorsDirty({
	                        action: 'size',
	                        descriptors: [descriptor]
	                    });
	                }
	            }, {
	                name: 'hidden',
	                onDirty: function onDirty() {
	                    setDescriptorsDirty({
	                        action: 'hide',
	                        descriptors: [descriptor]
	                    });
	                }
	            }], [dirtyClean]);
	        },
	        createBuilder: function createBuilder(render, update) {
	            return {
	                render: render || noop,
	                update: update || passThrough
	            };
	        }
	
	    };
	
	    // basically height or width
	    api[lengthName] = function (index) {
	        var descriptor = descriptors[index];
	        if (!descriptor) {
	            return NaN;
	        }
	
	        if (descriptor.hidden) {
	            return 0;
	        }
	
	        return descriptor[lengthName] || api.defaultSize;
	    };
	
	    // row or col get
	    api[name] = function (index) {
	        return descriptors[index + _numHeaders];
	    };
	
	    return api;
	};

/***/ },
/* 21 */
/***/ function(module, exports) {

	"use strict";
	
	module.exports = function () {};

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	module.exports = function (_grid) {
	    var grid = _grid;
	
	    var api = __webpack_require__(20)(grid, 'col', 'width', 100);
	
	    return api;
	};

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var util = __webpack_require__(3);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	
	    var cellData = [];
	    var headerData = [];
	    var sortedCol;
	    var ascending;
	    var dirtyClean = __webpack_require__(6)(grid);
	    var internalSet = function internalSet(data, r, c, datum) {
	        if (!data[r]) {
	            data[r] = [];
	        }
	        data[r][c] = {
	            value: datum
	        };
	        dirtyClean.setDirty();
	    };
	
	    var api = {
	        isDirty: dirtyClean.isDirty,
	        set: function set(r, c, datum) {
	            var data = arguments[0];
	            if (!util.isArray(data)) {
	                if (typeof datum === 'string') {
	                    datum = datum.replace('[rR]', '').replace('[cC]', '').split(' ');
	                }
	                data = [{
	                    row: r,
	                    col: c,
	                    value: datum
	
	                }];
	            }
	            data.forEach(function (change) {
	                internalSet(cellData, change.row, change.col, change.value);
	            });
	        },
	        setHeader: function setHeader(r, c, datum) {
	            internalSet(headerData, r, c, datum);
	        },
	        get: function get(r, c) {
	            var rowDescriptor = grid.rowModel.row(r);
	            if (!rowDescriptor) {
	                return {
	                    formatted: ''
	                };
	            }
	            var dataRow = cellData[rowDescriptor.dataRow];
	            var datum = dataRow && dataRow[grid.colModel.col(c).dataCol];
	            var value = datum && datum.value;
	            var formatted = value;
	            if (Array.isArray(value)) {
	                formatted = (rowDescriptor.dataLayer ? ' s' + rowDescriptor.dataLayer + ' ' : '') + 'r' + value[0] + ' c' + value[1];
	            }
	            return {
	                value: value,
	                formatted: formatted || ''
	            };
	        },
	        getCopyData: function getCopyData(r, c) {
	            return api.get(r, c).formatted;
	        },
	        getHeader: function getHeader(r, c) {
	            var dataRow = headerData[grid.rowModel.get(r).dataRow];
	
	            var datum = dataRow && dataRow[grid.colModel.get(c).dataCol];
	            var value = datum && datum.value;
	            return {
	                value: value,
	                formatted: value && 'hr' + value[0] + ' hc' + value[1] || ''
	            };
	        },
	
	        toggleSort: function toggleSort(c) {
	            var retVal = -1;
	            var compareMethod = function compareMethod(val1, val2) {
	                return val1 < val2 ? retVal : -1 * retVal;
	            };
	            if (c === sortedCol) {
	                if (ascending) {
	                    retVal = 1;
	                }
	                ascending = !ascending;
	            } else {
	                sortedCol = c;
	                ascending = true;
	            }
	            cellData.sort(function (dataRow1, dataRow2) {
	                if (!dataRow1 || !dataRow1[c]) {
	                    return retVal;
	                }
	                if (!dataRow2 || !dataRow2[c]) {
	                    return retVal * -1;
	                }
	                return compareMethod(dataRow1[c].value, dataRow2[c].value);
	            });
	            dirtyClean.setDirty();
	        }
	    };
	
	    return api;
	};

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var util = __webpack_require__(3);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	    var model = {};
	
	    //all pixels are assumed to be in the virtual world, no real world pixels are dealt with here :)
	    model.getRow = function (topPx) {
	        if (topPx < 0) {
	            return NaN;
	        }
	        var sumLength = 0;
	        for (var r = 0; r < grid.rowModel.length(true); r++) {
	            sumLength += grid.rowModel.height(r);
	            if (topPx < sumLength) {
	                return r;
	            }
	        }
	        return NaN;
	    };
	
	    //yes these are very similar but there will be differences
	    model.getCol = function (leftPx) {
	        if (leftPx < 0) {
	            return NaN;
	        }
	        var sumLength = 0;
	        for (var c = 0; c < grid.colModel.length(true); c++) {
	            sumLength += grid.colModel.width(c);
	            if (leftPx < sumLength) {
	                return c;
	            }
	        }
	        return NaN;
	    };
	
	    function clampRowOrCol(virtualRowCol, rowOrCol) {
	        var maxRowCol = grid[rowOrCol + 'Model'].length(true) - 1;
	        return util.clamp(virtualRowCol, 0, maxRowCol);
	    }
	
	    model.clampRow = function (virtualRow) {
	        return clampRowOrCol(virtualRow, 'row');
	    };
	
	    model.clampCol = function (virtualCol) {
	        return clampRowOrCol(virtualCol, 'col');
	    };
	
	    //for now these just call through to the row and column model, but very likely it will need to include some other calculations
	    model.height = function (virtualRowStart, virtualRowEnd) {
	        return heightOrWidth(virtualRowStart, virtualRowEnd, 'row');
	    };
	
	    model.width = function (virtualColStart, virtualColEnd) {
	        return heightOrWidth(virtualColStart, virtualColEnd, 'col');
	    };
	
	    function heightOrWidth(start, end, rowOrCol) {
	        var length = 0;
	        if (end < start) {
	            return 0;
	        }
	        end = util.isNumber(end) ? end : start;
	        end = clampRowOrCol(end, rowOrCol);
	        start = clampRowOrCol(start, rowOrCol);
	        var lengthModel = grid[rowOrCol + 'Model'];
	        var lengthFn = lengthModel.width || lengthModel.height;
	        for (var i = start; i <= end; i++) {
	            length += lengthFn(i);
	        }
	        return length;
	    }
	
	    model.totalHeight = function () {
	        return model.height(0, grid.rowModel.length(true) - 1);
	    };
	
	    model.totalWidth = function () {
	        return model.width(0, grid.colModel.length(true) - 1);
	    };
	
	    model.fixedHeight = function () {
	        return model.height(0, grid.rowModel.numFixed() - 1);
	    };
	
	    model.fixedWidth = function () {
	        return model.width(0, grid.colModel.numFixed() - 1);
	    };
	
	    function sizeChangeListener() {
	        //for now we don't cache anything about this so we just notify
	        grid.eventLoop.fire('grid-virtual-pixel-cell-change');
	    }
	
	    grid.eventLoop.bind('grid-col-change', sizeChangeListener);
	    grid.eventLoop.bind('grid-row-change', sizeChangeListener);
	
	    return model;
	};

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var util = __webpack_require__(3);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	    var dirtyClean = __webpack_require__(6)(grid);
	
	    var row;
	    var model = {
	        col: 0
	    };
	    Object.defineProperty(model, 'row', {
	        enumerable: true,
	        get: function get() {
	            return row;
	        },
	        set: function set(r) {
	            row = r;
	        }
	    });
	    model.row = 0;
	
	    model.isDirty = dirtyClean.isDirty;
	
	    grid.eventLoop.bind('grid-row-change', function (e) {
	        switch (e.action) {
	            case 'remove':
	                model.scrollTo(0, model.col);
	                break;
	        }
	    });
	
	    model.scrollTo = function (r, c, dontFire, fromPixelModel) {
	        if (isNaN(r) || isNaN(c)) {
	            return;
	        }
	        var maxRow = (grid.rowModel.length() || 1) - 1;
	        var maxCol = (grid.colModel.length() || 1) - 1;
	        var lastRow = model.row;
	        var lastCol = model.col;
	        model.row = util.clamp(r, 0, maxRow);
	        model.col = util.clamp(c, 0, maxCol);
	        if (lastRow !== model.row || lastCol !== model.col) {
	            dirtyClean.setDirty();
	
	            if (!dontFire) {
	                grid.eventLoop.fire('grid-cell-scroll');
	            }
	
	            if (!fromPixelModel) {
	                var top = grid.virtualPixelCellModel.height(grid.rowModel.numFixed(), model.row + grid.rowModel.numFixed() - 1);
	                var left = grid.virtualPixelCellModel.width(grid.colModel.numFixed(), model.col + grid.colModel.numFixed() - 1);
	                grid.pixelScrollModel.scrollTo(top, left, true);
	            }
	        }
	    };
	
	    function convertVirtualToScroll(virtualCoord, rowOrCol) {
	        return virtualCoord - grid[rowOrCol + 'Model'].numFixed();
	    }
	
	    function getScrollToRowOrCol(virtualCoord, rowOrCol, heightWidth) {
	        var currentScroll = model[rowOrCol];
	        var scrollTo = currentScroll;
	        if (grid.viewPort[rowOrCol + 'IsInView'](virtualCoord)) {
	            return scrollTo;
	        }
	
	        var targetScroll = convertVirtualToScroll(virtualCoord, rowOrCol);
	        if (targetScroll < currentScroll) {
	            scrollTo = targetScroll;
	        } else if (targetScroll > currentScroll) {
	            var lengthToCell = grid.virtualPixelCellModel[heightWidth](0, virtualCoord);
	            var numFixed = grid[rowOrCol + 'Model'].numFixed();
	            scrollTo = 0;
	            for (var i = numFixed; i < virtualCoord && lengthToCell > grid.viewPort[heightWidth]; i++) {
	                lengthToCell -= grid.virtualPixelCellModel[heightWidth](i);
	                scrollTo = i - (numFixed - 1);
	            }
	        }
	
	        return scrollTo;
	    }
	
	    //for now assumes data space
	    model.scrollIntoView = function (dataRow, dataCol) {
	        dataRow = grid.virtual.row.clamp(grid.data.row.toVirtual(dataRow));
	        dataCol = grid.virtual.col.clamp(grid.data.col.toVirtual(dataCol));
	        var newRow = getScrollToRowOrCol(dataRow, 'row', 'height');
	        var newCol = getScrollToRowOrCol(dataCol, 'col', 'width');
	        model.scrollTo(newRow, newCol);
	    };
	
	    return model;
	};

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var customEvent = __webpack_require__(27);
	
	var PROPS_TO_COPY_FROM_MOUSE_EVENTS = ['clientX', 'clientY', 'gridX', 'gridY', 'layerX', 'layerY', 'row', 'col', 'realRow', 'realCol', 'virtualRow', 'virtualCol'];
	
	module.exports = function (_grid) {
	    var grid = _grid;
	
	    var model = {};
	
	    var scrollInterval;
	
	    model._annotateEvent = function annotateEvent(e) {
	        /*eslint-disable no-fallthrough*/
	        switch (e.type) {
	            case 'click':
	            case 'dblclick':
	            case 'mousedown':
	            case 'mousemove':
	            case 'mouseup':
	                model._annotateEventInternal(e);
	                break;
	        }
	        /*eslint-enable no-fallthrough*/
	    };
	
	    model._annotateEventFromViewCoords = function (e, viewRow, viewCol) {
	        e.realRow = viewRow;
	        e.realCol = viewCol;
	        e.virtualRow = grid.view.row.toVirtual(e.realRow);
	        e.virtualCol = grid.view.col.toVirtual(e.realCol);
	        e.row = grid.virtual.row.toData(e.virtualRow);
	        e.col = grid.virtual.col.toData(e.virtualCol);
	        return e;
	    };
	
	    model._annotateEventInternal = function (e) {
	        var y = grid.viewPort.toGridY(e.clientY);
	        var x = grid.viewPort.toGridX(e.clientX);
	        var viewRow = grid.viewPort.getRowByTop(y);
	        var viewCol = grid.viewPort.getColByLeft(x);
	        model._annotateEventFromViewCoords(e, viewRow, viewCol);
	        e.gridX = x;
	        e.gridY = y;
	    };
	
	    var lastMoveRow;
	    var lastMoveCol;
	    grid.eventLoop.addInterceptor(function (e) {
	        model._annotateEvent(e);
	        if (e.type === 'mousedown') {
	            if (e.currentTarget === grid.container) {
	                setupDragEventForMouseDown(e);
	            }
	        } else if (e.type === 'mousemove') {
	            if (e.row !== lastMoveRow || e.col !== lastMoveCol) {
	                createAndFireCustomMouseEvent('grid-cell-mouse-move', e);
	                lastMoveRow = e.row;
	                lastMoveCol = e.col;
	            }
	        }
	    });
	
	    function calculateColScrollDiff(e) {
	        var colDiff = 0;
	        if (e.clientX > (grid.container && grid.container.getBoundingClientRect().right || window.innerWidth)) {
	            colDiff = 1;
	        } else if (grid.viewPort.toGridX(e.clientX) < grid.virtualPixelCellModel.fixedWidth()) {
	            colDiff = -1;
	        }
	        return colDiff;
	    }
	
	    function calculateRowScrollDiff(e) {
	        var rowDiff = 0;
	        if (e.clientY > (grid.container && grid.container.getBoundingClientRect().bottom || window.innerHeight)) {
	            rowDiff = 1;
	        } else if (grid.viewPort.toGridY(e.clientY) < grid.virtualPixelCellModel.fixedHeight()) {
	            rowDiff = -1;
	        }
	        return rowDiff;
	    }
	
	    function setupDragEventForMouseDown(downEvent) {
	        var lastDragRow = downEvent.row;
	        var lastDragCol = downEvent.col;
	        var dragStarted = false;
	        var unbindAutoScrollDrag;
	        var lastX = downEvent.clientX;
	        var lastY = downEvent.clientY;
	        var unbindMove = grid.eventLoop.bind('mousemove', window, function (e) {
	
	            if (dragStarted && !e.which) {
	                // got a move event without mouse down which means we somehow missed the mouseup
	                console.log('mousemove unbind, how on earth do these happen?');
	                handleMouseUp(e);
	                return;
	            }
	
	            if (!dragStarted) {
	                if (lastX === e.clientX && lastY === e.clientY) {
	                    console.warn('Got a mouse move event with ', e.clientX, ',', e.clientY, ' when the last position was ', lastX, ',', lastY);
	                }
	                createAndFireCustomMouseEvent('grid-drag-start', downEvent, function annotateDragStart(dragStart) {
	                    var onlyFixedRows = !calculateRowScrollDiff(e);
	                    var onlyFixedCols = !calculateColScrollDiff(e);
	                    dragStart.enableAutoScroll = function () {
	                        if (unbindAutoScrollDrag) {
	                            unbindAutoScrollDrag();
	                        }
	                        unbindAutoScrollDrag = grid.eventLoop.bind('grid-drag', function (e) {
	                            // if it gets here then we will try to auto scroll
	                            var newRowDiff = calculateRowScrollDiff(e);
	                            onlyFixedRows = !newRowDiff;
	                            var rowDiff = onlyFixedRows ? 0 : newRowDiff;
	
	                            var newColDiff = calculateColScrollDiff;
	                            onlyFixedCols = !newColDiff;
	                            var colDiff = onlyFixedCols ? 0 : newColDiff(e);
	
	                            clearInterval(scrollInterval);
	                            if (rowDiff || colDiff) {
	                                scrollInterval = grid.interval(function () {
	                                    grid.cellScrollModel.scrollTo(grid.cellScrollModel.row + rowDiff, grid.cellScrollModel.col + colDiff);
	                                }, 100);
	                            }
	                        });
	                    };
	                });
	                dragStarted = true;
	            }
	
	            createAndFireCustomMouseEvent('grid-drag', e);
	
	            if (e.row !== lastDragRow || e.col !== lastDragCol) {
	                createAndFireCustomMouseEvent('grid-cell-drag', e);
	
	                lastDragRow = e.row;
	                lastDragCol = e.col;
	            }
	        });
	
	        var unbindUp = grid.eventLoop.bind('mouseup', window, handleMouseUp);
	
	        function handleMouseUp(e) {
	            clearInterval(scrollInterval);
	            unbindMove();
	            unbindUp();
	            if (unbindAutoScrollDrag) {
	                unbindAutoScrollDrag();
	            }
	
	            var dragEnd = createCustomEventFromMouseEvent('grid-drag-end', e);
	
	            // row, col, x, and y should inherit
	            grid.eventLoop.fire(dragEnd);
	        }
	    }
	
	    function createCustomEventFromMouseEvent(type, e) {
	        var event = customEvent(type, true, true);
	        PROPS_TO_COPY_FROM_MOUSE_EVENTS.forEach(function (prop) {
	            event[prop] = e[prop];
	        });
	        event.originalEvent = e;
	        return event;
	    }
	
	    function createAndFireCustomMouseEvent(type, e, annotateEvent) {
	        var drag = createCustomEventFromMouseEvent(type, e);
	        if (annotateEvent) {
	            drag = annotateEvent(drag) || drag;
	        }
	        if (e.target) {
	            e.target.dispatchEvent(drag);
	        } else {
	            grid.eventLoop.fire(drag);
	        }
	        return drag;
	    }
	
	    return model;
	};

/***/ },
/* 27 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports = function (name, bubbles, cancelable, detail) {
	    var event = document.createEvent('CustomEvent'); // MUST be 'CustomEvent'
	    event.initCustomEvent(name, bubbles, cancelable, detail);
	    return event;
	};

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var customEvent = __webpack_require__(27);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	
	    var model = {};
	
	    model._annotateEvent = function annotateEvent(e) {
	        /*eslint-disable no-fallthrough*/
	        switch (e.type) {
	            case 'keydown':
	            case 'keypress':
	            case 'keyup':
	                model._annotateEventInternal(e);
	                break;
	        }
	        /*eslint-enable no-fallthrough*/
	    };
	
	    model._annotateEventFromDataCoords = function (e, dataRow, dataCol) {
	        e.realRow = grid.data.row.toView(dataRow);
	        e.realCol = grid.data.col.toView(dataCol);
	        e.virtualRow = grid.data.row.toVirtual(dataRow);
	        e.virtualCol = grid.data.col.toVirtual(dataCol);
	        e.row = dataRow;
	        e.col = dataCol;
	        return e;
	    };
	
	    model._annotateEventInternal = function (e) {
	        var dataRow = grid.navigationModel.focus.row;
	        var dataCol = grid.navigationModel.focus.col;
	        model._annotateEventFromDataCoords(e, dataRow, dataCol);
	    };
	
	    grid.eventLoop.addInterceptor(model._annotateEvent);
	
	    return model;
	};

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var timeNow = __webpack_require__(30);
	
	module.exports = function (grid) {
	
	    var frames = [];
	    var totalTime = 0;
	    var totalFrames = 0;
	    var totalWindowTime = 0;
	    var lastLoopTime;
	    var filteredFrameTime = 0;
	    var filterStrength = 20;
	    var belowThresholdCount = 0;
	    var numCalcs = 0;
	    var filteredAverage;
	    var requestId;
	
	    function addFrameToWindow(frameLength) {
	        if (typeof frameLength !== 'number' || isNaN(frameLength)) {
	            console.warn('passed non number to fps.addFrame()');
	            return;
	        }
	        if (frames.length > fps.windowSize) {
	            totalWindowTime -= frames.shift();
	        }
	        totalWindowTime += frameLength;
	        totalTime += frameLength;
	        totalFrames++;
	        frames.push(frameLength);
	    }
	
	    grid.eventLoop.bind('grid-destroy', function () {
	        if (requestId) {
	            cancelAnimationFrame(requestId);
	            requestId = null;
	        }
	    });
	
	    var fps = {
	        threshold: 20,
	        markFrameTime: function markFrameTime() {
	            var nowTime = timeNow();
	            if (lastLoopTime) {
	                var frameLength = nowTime - lastLoopTime;
	                filteredFrameTime += (frameLength - filteredFrameTime) / filterStrength;
	                filteredAverage = 1000 / filteredFrameTime;
	                if (filteredAverage < fps.threshold) {
	                    belowThresholdCount++;
	                }
	                if (fps.allAverages) {
	                    addFrameToWindow(1000 / frameLength);
	                }
	                numCalcs++;
	            }
	            lastLoopTime = nowTime;
	        },
	        windowSize: 60,
	        getMovingAverage: function getMovingAverage() {
	            return totalWindowTime / frames.length;
	        },
	        getAllTimeAverage: function getAllTimeAverage() {
	            return totalTime / totalFrames;
	        },
	        getLast: function getLast() {
	            return frames[frames.length - 1];
	        },
	        getFilteredAverage: function getFilteredAverage() {
	            return filteredAverage;
	        },
	        isBelowThreshold: function isBelowThreshold() {},
	        logging: false,
	        slowCount: 0
	    };
	
	    fps.intervalId = setInterval(function () {
	        fps.percentBelowThreshold = belowThresholdCount / numCalcs * 100;
	        if (fps.percentBelowThreshold > 50) {
	            fps.slowCount++;
	        }
	        if (fps.logging) {
	            console.log('percent below threshold', fps.percentBelowThreshold.toFixed(1), 'filtered average', fps.getFilteredAverage());
	        }
	        belowThresholdCount = 0;
	        numCalcs = 0;
	    }, 1000);
	
	    function fpsMeasure() {
	        if (grid.destroyed) {
	            return;
	        }
	        requestId = requestAnimationFrame(fpsMeasure);
	        fps.markFrameTime();
	    }
	    fpsMeasure();
	
	    return fps;
	};

/***/ },
/* 30 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports = (function() {
	  var perf = window && window.performance;
	  if (perf && perf.now) {
	    return perf.now.bind(perf);
	  } else {
	    return function() {
	      return new Date().getTime();
	    };
	  }
	}());


/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var util = __webpack_require__(3);
	var rangeUtil = __webpack_require__(7);
	var capitalize = __webpack_require__(9);
	var addDirtyProps = __webpack_require__(17);
	var debounce = __webpack_require__(13);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	    var dirtyClean = __webpack_require__(6)(grid);
	    var container;
	
	    var viewPort = addDirtyProps({}, ['rows', 'cols', 'width', 'height'], [dirtyClean]);
	    viewPort.rows = 0;
	    viewPort.cols = 0;
	    viewPort.isDirty = dirtyClean.isDirty;
	
	    // these probably trigger reflow so we may need to think about caching the value and updating it at on draws or something
	    function getFirstClientRect() {
	        return container && container.getClientRects && container.getClientRects() && container.getClientRects()[0] || {};
	    }
	
	    Object.defineProperty(viewPort, 'top', {
	        enumerable: true,
	        get: function get() {
	            return getFirstClientRect().top || 0;
	        }
	    });
	
	    Object.defineProperty(viewPort, 'left', {
	        enumerable: true,
	        get: function get() {
	            return getFirstClientRect().left || 0;
	        }
	    });
	
	    viewPort.toGridX = function (clientX) {
	        return clientX - viewPort.left;
	    };
	
	    viewPort.toGridY = function (clientY) {
	        return clientY - viewPort.top;
	    };
	
	    var fixed = {
	        rows: 0,
	        cols: 0
	    };
	
	    function getFixed(rowOrCol) {
	        return fixed[rowOrCol + 's'];
	    }
	
	    viewPort.sizeToContainer = function (elem) {
	        container = elem;
	        var oldWidth = viewPort.width;
	        var oldHeight = viewPort.height;
	        viewPort.width = elem.offsetWidth;
	        viewPort.height = elem.offsetHeight;
	        viewPort.rows = calculateMaxLengths(viewPort.height, grid.rowModel);
	        viewPort.cols = calculateMaxLengths(viewPort.width, grid.colModel);
	        var event = {};
	        event.type = 'grid-viewport-change';
	        event.isWidthChange = oldWidth !== viewPort.width;
	        event.isHeightChange = oldHeight !== viewPort.height;
	        event.isSizeChange = event.isWidthChange || event.isHeightChange;
	        grid.eventLoop.fire(event);
	    };
	
	    viewPort._onResize = debounce(function () {
	        viewPort._resize();
	    }, 200);
	
	    grid.eventLoop.bind('grid-destroy', function () {
	        clearTimeout(viewPort._onResize.timeout);
	        clearTimeout(shortDebouncedResize.timeout);
	    });
	
	    viewPort._resize = function () {
	        if (container) {
	            viewPort.sizeToContainer(container);
	        }
	    };
	
	    var shortDebouncedResize = debounce(function () {
	        viewPort._resize();
	    }, 1);
	
	    viewPort.shortDebouncedResize = shortDebouncedResize;
	
	    grid.eventLoop.bind('resize', window, function () {
	        //we don't bind the handler directly so that tests can mock it out
	        viewPort._onResize();
	    });
	
	    grid.eventLoop.bind('grid-row-change', function () {
	        fixed.rows = grid.rowModel.numFixed();
	        shortDebouncedResize();
	    });
	
	    grid.eventLoop.bind('grid-col-change', function () {
	        fixed.cols = grid.colModel.numFixed();
	        shortDebouncedResize();
	    });
	
	    function convertRealToVirtual(coord, rowOrCol, coordIsVirtual) {
	        // could cache this on changes i.e. row-change or col-change events
	        var numFixed = getFixed(rowOrCol);
	        if (coord < numFixed) {
	            return coord;
	        }
	        return coord + (coordIsVirtual ? -1 : 1) * grid.cellScrollModel[rowOrCol];
	    }
	
	    // converts a viewport row or column to a real row or column
	    // clamps it if the column would be outside the range
	    function getVirtualRowColUnsafe(realCoord, rowOrCol) {
	        return convertRealToVirtual(realCoord, rowOrCol);
	    }
	
	    function getVirtualRowColClamped(viewCoord, rowOrCol) {
	        var virtualRowCol = getVirtualRowColUnsafe(viewCoord, rowOrCol);
	        return grid.virtualPixelCellModel['clamp' + capitalize(rowOrCol)](virtualRowCol);
	    }
	
	    viewPort.toVirtualRow = function (r) {
	        return getVirtualRowColClamped(r, 'row');
	    };
	
	    viewPort.toVirtualCol = function (c) {
	        return getVirtualRowColClamped(c, 'col');
	    };
	
	    function getRealRowColClamped(virtualCoord, rowOrCol) {
	        var numFixed = getFixed(rowOrCol);
	        if (virtualCoord < numFixed) {
	            return virtualCoord;
	        }
	        var maxViewPortIndex = viewPort[rowOrCol + 's'] - 1;
	        return util.clamp(virtualCoord - grid.cellScrollModel[rowOrCol], numFixed, maxViewPortIndex, true);
	    }
	
	    viewPort.rowIsInView = function (virtualRow) {
	        var realRow = viewPort.toRealRow(virtualRow);
	        return !isNaN(realRow) && getLengthBetweenViewCoords(0, realRow, 'row', 'height', true) < viewPort.height;
	    };
	
	    viewPort.colIsInView = function (virtualCol) {
	        var realCol = viewPort.toRealCol(virtualCol);
	        return !isNaN(realCol) && getLengthBetweenViewCoords(0, realCol, 'col', 'width', true) < viewPort.width;
	    };
	
	    // default unclamped cause that seems to be the more likely use case converting this direction
	    viewPort.toRealRow = function (virtualRow) {
	        return getRealRowColClamped(virtualRow, 'row');
	    };
	
	    viewPort.toRealCol = function (virtualCol) {
	        return getRealRowColClamped(virtualCol, 'col');
	    };
	
	    viewPort.clampRow = function (r) {
	        return util.clamp(r, 0, viewPort.rows - 1);
	    };
	
	    viewPort.clampCol = function (c) {
	        return util.clamp(c, 0, viewPort.cols - 1);
	    };
	
	    viewPort.clampY = function (y) {
	        return util.clamp(y, 0, viewPort.height);
	    };
	
	    viewPort.clampX = function (x) {
	        return util.clamp(x, 0, viewPort.width);
	    };
	
	    function getLengthBetweenViewCoords(startCoord, endCoord, rowOrCol, heightOrWidth, inclusive) {
	        var rowOrColCap = capitalize(rowOrCol);
	        var toVirtual = viewPort['toVirtual' + rowOrColCap];
	        var lengthFn = grid.virtualPixelCellModel[heightOrWidth];
	        var clampFn = viewPort['clamp' + rowOrColCap];
	        var pos = 0;
	        var numFixed = getFixed(rowOrCol);
	        var isInNonfixedArea = endCoord >= numFixed;
	        var isInFixedArea = startCoord < numFixed;
	        var exclusiveOffset = inclusive ? 0 : 1;
	        if (isInFixedArea) {
	            var fixedEndCoord = isInNonfixedArea ? numFixed - 1 : endCoord - exclusiveOffset;
	            pos += lengthFn(startCoord, fixedEndCoord);
	        }
	        if (isInNonfixedArea) {
	            pos += lengthFn(isInFixedArea ? toVirtual(numFixed) : toVirtual(startCoord), toVirtual(clampFn(endCoord)) - exclusiveOffset);
	        }
	        return pos;
	    }
	
	    function getTopOrLeft(endCoord, rowOrCol, heightOrWidth) {
	        return getLengthBetweenViewCoords(0, endCoord, rowOrCol, heightOrWidth);
	    }
	
	    viewPort.getRowTop = function (viewPortCoord) {
	        return getTopOrLeft(viewPortCoord, 'row', 'height');
	    };
	
	    viewPort.getColLeft = function (viewPortCol) {
	        return getTopOrLeft(viewPortCol, 'col', 'width');
	    };
	
	    viewPort.toPx = function (realCellRange) {
	        return {
	            top: viewPort.getRowTop(realCellRange.top),
	            left: viewPort.getColLeft(realCellRange.left),
	            height: getLengthBetweenViewCoords(realCellRange.top, realCellRange.top + realCellRange.height - 1, 'row', 'height', true),
	            width: getLengthBetweenViewCoords(realCellRange.left, realCellRange.left + realCellRange.width - 1, 'col', 'width', true)
	        };
	    };
	
	    function getRowOrColFromPosition(pos, rowOrCol, heightOrWidth, topOrLeft, returnVirtual) {
	        // we could do this slighly faster with binary search to get log(n) instead of n, but will only do it if we actually need to optimize this
	        var rowOrColCap = capitalize(rowOrCol);
	        var viewMax = viewPort[rowOrCol + 's'];
	        var toVirtual = viewPort['toVirtual' + rowOrColCap];
	        var lengthFn = grid.virtualPixelCellModel[heightOrWidth];
	        var fixed = grid.virtualPixelCellModel['fixed' + capitalize(heightOrWidth)]();
	        var summedLength = grid.viewLayer.getBorderWidth() + (pos <= fixed ? 0 : grid.pixelScrollModel['offset' + capitalize(topOrLeft)]);
	        for (var i = 0; i < viewMax; i++) {
	            var virtual = toVirtual(i);
	            var length = lengthFn(virtual);
	            var newSum = summedLength + length;
	            if (newSum >= pos) {
	                return returnVirtual ? virtual : i;
	            }
	            summedLength = newSum;
	        }
	        return NaN;
	    }
	
	    viewPort.getVirtualRowByTop = function (top) {
	        return getRowOrColFromPosition(top, 'row', 'height', 'top', true);
	    };
	
	    viewPort.getVirtualColByLeft = function (left) {
	        return getRowOrColFromPosition(left, 'col', 'width', 'left', true);
	    };
	
	    viewPort.getRowByTop = function (top) {
	        return getRowOrColFromPosition(top, 'row', 'height', 'top');
	    };
	
	    viewPort.getColByLeft = function (left) {
	        return getRowOrColFromPosition(left, 'col', 'width', 'left');
	    };
	
	    viewPort.getRowHeight = function (viewPortRow) {
	        return grid.virtualPixelCellModel.height(viewPort.toVirtualRow(viewPort.clampRow(viewPortRow)));
	    };
	
	    viewPort.getColWidth = function (viewPortCol) {
	        return grid.virtualPixelCellModel.width(viewPort.toVirtualCol(viewPort.clampCol(viewPortCol)));
	    };
	
	    function intersectRowsOrCols(intersection, range, topOrLeft, rowOrCol, heightOrWidth) {
	        var numFixed = fixed[rowOrCol + 's'];
	        var fixedRange = [0, numFixed];
	
	        var virtualRange = [range[topOrLeft], range[heightOrWidth]];
	        var fixedIntersection = rangeUtil.intersect(fixedRange, virtualRange);
	        var scrollRange = [numFixed, viewPort[rowOrCol + 's'] - numFixed];
	        virtualRange[0] -= grid.cellScrollModel[rowOrCol];
	        var scrollIntersection = rangeUtil.intersect(scrollRange, virtualRange);
	        var resultRange = rangeUtil.union(fixedIntersection, scrollIntersection);
	        if (!resultRange) {
	            return null;
	        }
	
	        intersection[topOrLeft] = resultRange[0];
	        intersection[heightOrWidth] = resultRange[1];
	        return intersection;
	    }
	
	    viewPort.intersect = function (range) {
	        // assume virtual cells for now
	        var intersection = intersectRowsOrCols({}, range, 'top', 'row', 'height');
	        if (!intersection) {
	            return null;
	        }
	        return intersectRowsOrCols(intersection, range, 'left', 'col', 'width');
	    };
	
	    function calculateMaxLengths(totalLength, lengthModel) {
	        var lengthMethod = lengthModel.width && grid.virtualPixelCellModel.width || grid.virtualPixelCellModel.height;
	        var numFixed = lengthModel.numFixed();
	        var windowLength = 0;
	        var maxSize = 0;
	        var fixedLength = 0;
	        var windowStartIndex = numFixed;
	
	        for (var fixed = 0; fixed < numFixed; fixed++) {
	            fixedLength += lengthMethod(fixed);
	        }
	
	        var maxLength = 0;
	        for (var index = numFixed; index < lengthModel.length(true); index++) {
	            var lengthOfIindex = lengthMethod(index);
	            if (lengthOfIindex > maxLength) {
	                maxLength = lengthOfIindex;
	            }
	        }
	        totalLength += maxLength;
	
	        // it might be safer to actually sum the lengths in the virtualPixelCellModel but for now here is ok
	        for (var index = numFixed; index < lengthModel.length(true); index++) {
	            var lengthOfIindex = lengthMethod(index);
	            windowLength += lengthOfIindex;
	            while (windowLength + fixedLength > totalLength && windowStartIndex < index) {
	                windowLength -= lengthMethod(windowStartIndex);
	                windowStartIndex++;
	            }
	            var windowSize = index - windowStartIndex + 1; // add the one because we want the last index that didn't fit
	            if (windowSize > maxSize) {
	                maxSize = windowSize;
	            }
	        }
	        return Math.min(maxSize + numFixed + 1, grid.virtual[lengthModel.width ? 'col' : 'row'].count());
	    }
	
	    viewPort.iterateCells = function (cellFn, optionalRowFn, optionalMaxRow, optionalMaxCol) {
	        optionalMaxRow = optionalMaxRow || Infinity;
	        optionalMaxCol = optionalMaxCol || Infinity;
	        for (var r = 0; r < Math.min(viewPort.rows, optionalMaxRow); r++) {
	            if (optionalRowFn) {
	                optionalRowFn(r);
	            }
	            if (cellFn) {
	                for (var c = 0; c < Math.min(viewPort.cols, optionalMaxCol); c++) {
	                    cellFn(r, c);
	                }
	            }
	        }
	    };
	
	    return viewPort;
	};

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var customEvent = __webpack_require__(27);
	var util = __webpack_require__(3);
	
	module.exports = function (_grid) {
	    var viewLayer = {};
	
	    var grid = _grid;
	    var container;
	    var root;
	    var cellContainerTL;
	    var cellContainerTR;
	    var cellContainerBL;
	    var cellContainerBR;
	    var decoratorContainer;
	    var decoratorContainerTL;
	    var decoratorContainerTR;
	    var decoratorContainerBL;
	    var decoratorContainerBR;
	    var borderWidth;
	    var hoveredFixedRow;
	    var hoveredRow;
	
	    var GRID_CELL_CONTAINER_BASE_CLASS = 'grid-cells';
	    var GRID_VIEW_ROOT_CLASS = 'js-grid-view-root';
	    var CELL_CLASS = 'grid-cell';
	
	    var cells; // matrix of rendered cell elements;
	    var rows = {
	        fixed: [],
	        nonFixed: []
	    }; // array of all rendered rows
	    var builtCols; // map from col index to an array of built elements for the column to update on scroll
	    var builtRows; // map from row index to an array of built elements for the row to update on scroll
	
	    // add the cell classes through the standard method
	    grid.cellClasses.add(grid.cellClasses.create(0, 0, CELL_CLASS, Infinity, Infinity, 'virtual'));
	
	    var rowHeaderClasses = grid.cellClasses.create(0, 0, 'grid-header grid-row-header', Infinity, 0, 'virtual');
	    var colHeaderClasses = grid.cellClasses.create(0, 0, 'grid-header grid-col-header', 0, Infinity, 'virtual');
	    var fixedColClasses = grid.cellClasses.create(0, -1, 'grid-last-fixed-col', Infinity, 1, 'virtual');
	    var fixedRowClasses = grid.cellClasses.create(-1, 0, 'grid-last-fixed-row', 1, Infinity, 'virtual');
	
	    grid.cellClasses.add(rowHeaderClasses);
	    grid.cellClasses.add(colHeaderClasses);
	    grid.cellClasses.add(fixedRowClasses);
	    grid.cellClasses.add(fixedColClasses);
	
	    grid.eventLoop.bind('grid-col-change', function () {
	        fixedColClasses.left = grid.colModel.numFixed() - 1;
	        rowHeaderClasses.width = grid.colModel.numHeaders();
	    });
	
	    grid.eventLoop.bind('grid-row-change', function () {
	        fixedRowClasses.top = grid.rowModel.numFixed() - 1;
	        colHeaderClasses.height = grid.rowModel.numHeaders();
	    });
	
	    grid.eventLoop.bind('grid-cell-mouse-move', function (e) {
	        var row = rows.fixed[e.realRow];
	        if (!row || !viewLayer.eventIsOnCells(e)) {
	            return;
	        }
	        row.classList.add('hover');
	        if (hoveredFixedRow && hoveredFixedRow !== row) {
	            hoveredFixedRow.classList.remove('hover');
	        }
	        hoveredFixedRow = row;
	        row = rows.nonFixed[e.realRow];
	        if (row) {
	            row.classList.add('hover');
	        }
	        if (hoveredRow && hoveredRow !== row) {
	            hoveredRow.classList.remove('hover');
	        }
	        hoveredRow = row;
	    });
	
	    function makeCellContainer() {
	        var cellContainer = document.createElement('div');
	        cellContainer.setAttribute('dts', 'grid-cells');
	        cellContainer.setAttribute('class', GRID_CELL_CONTAINER_BASE_CLASS);
	        cellContainer.style.zIndex = '';
	        // cellContainer.style.pointerEvents = 'none';
	        return cellContainer;
	    }
	
	    function makeDecoratorContainer() {
	        var decoratorContainer = document.createElement('div');
	        decoratorContainer.setAttribute('dts', 'grid-decorators');
	        util.position(decoratorContainer, 0, 0, 0, 0);
	        decoratorContainer.style.zIndex = '';
	        decoratorContainer.style.pointerEvents = 'none';
	        return decoratorContainer;
	    }
	
	    viewLayer.build = function (elem) {
	        cleanup();
	
	        container = elem;
	
	        cellContainerTL = makeCellContainer();
	        cellContainerTL.style.zIndex = 4;
	        cellContainerTR = makeCellContainer();
	        cellContainerTR.style.zIndex = 3;
	        cellContainerBL = makeCellContainer();
	        cellContainerBL.style.zIndex = 3;
	        cellContainerBR = makeCellContainer();
	        cellContainerBR.style.zIndex = 2;
	
	        decoratorContainerTL = makeDecoratorContainer();
	        decoratorContainerTL.style.zIndex = 4;
	        decoratorContainerTR = makeDecoratorContainer();
	        decoratorContainerTR.style.zIndex = 3;
	        decoratorContainerTR.style.overflow = 'hidden';
	        decoratorContainerBL = makeDecoratorContainer();
	        decoratorContainerBL.style.zIndex = 3;
	        decoratorContainerBL.style.overflow = 'hidden';
	        decoratorContainerBR = makeDecoratorContainer();
	        decoratorContainerBR.style.zIndex = 2;
	
	        root = document.createElement('div');
	        root.setAttribute('class', GRID_VIEW_ROOT_CLASS);
	
	        root.appendChild(cellContainerTL);
	        root.appendChild(cellContainerTR);
	        root.appendChild(cellContainerBL);
	        root.appendChild(cellContainerBR);
	
	        root.appendChild(decoratorContainerTL);
	        root.appendChild(decoratorContainerTR);
	        root.appendChild(decoratorContainerBL);
	        root.appendChild(decoratorContainerBR);
	
	        container.appendChild(root);
	    };
	
	    function offsetContainerForPixelScroll() {
	        var modTopPixels = grid.pixelScrollModel.offsetTop;
	        var modLeftPixels = grid.pixelScrollModel.offsetLeft;
	
	        var fixedHeight = grid.virtualPixelCellModel.fixedHeight();
	        var fixedWidth = grid.virtualPixelCellModel.fixedWidth();
	        util.position(cellContainerTL, 0, 0, null, null, fixedHeight, fixedWidth);
	        util.position(cellContainerBR, 0, 0, 0, 0);
	        util.position3D(cellContainerBR, modTopPixels, modLeftPixels);
	        util.position(cellContainerTR, 0, 0, null, 0, fixedHeight);
	        util.position3D(cellContainerTR, 0, modLeftPixels);
	        util.position(cellContainerBL, 0, 0, 0, null, null, fixedWidth);
	        util.position3D(cellContainerBL, modTopPixels, 0);
	
	        util.position(decoratorContainerTL, 0, 0, null, null, fixedHeight, fixedWidth);
	        util.position(decoratorContainerBR, 0, 0, 0, 0);
	        util.position3D(decoratorContainerBR, modTopPixels, modLeftPixels);
	        util.position(decoratorContainerTR, 0, fixedWidth, null, 0, null, null);
	        util.position3D(decoratorContainerTR, 0, 0);
	        util.position(decoratorContainerBL, fixedHeight, 0, 0, null, null, null);
	        util.position3D(decoratorContainerBL, 0, 0);
	        grid.decorators.getAlive().forEach(function (decorator) {
	            var decoratorTopOffset = 0;
	            var decoratorLeftOffset = 0;
	            if (decorator.scrollVert && !decorator.scrollHorz) {
	                decoratorTopOffset = fixedHeight - modTopPixels;
	            } else if (decorator.scrollHorz && !decorator.scrollVert) {
	                decoratorLeftOffset = fixedWidth - modLeftPixels;
	            }
	
	            if (decorator.fixed) {
	                if (decorator.scrollVert) {
	                    decoratorTopOffset += modTopPixels;
	                }
	                if (decorator.scrollHorz) {
	                    decoratorLeftOffset += modLeftPixels;
	                }
	            }
	            if (decorator.boundingBox) {
	                decorator.boundingBox.style.marginTop = -1 * decoratorTopOffset + 'px';
	                decorator.boundingBox.style.marginLeft = -1 * decoratorLeftOffset + 'px';
	            }
	        });
	    }
	
	    function measureBorderWidth() {
	        // read the border width, for the rare case of larger than 1px borders, otherwise the draw will default to 1
	        if (borderWidth) {
	            return;
	        }
	        var jsGridCell = cells[0] && cells[0][0];
	        if (jsGridCell) {
	            var oldClass = jsGridCell.className;
	            jsGridCell.className = CELL_CLASS;
	            var computedStyle = getComputedStyle(jsGridCell);
	            var borderWidthProp = computedStyle.getPropertyValue('border-left-width');
	            borderWidth = parseInt(borderWidthProp);
	            jsGridCell.className = oldClass;
	        }
	        borderWidth = isNaN(borderWidth) || !borderWidth ? undefined : borderWidth;
	        return borderWidth;
	    }
	
	    // only draw once per js turn, may need to create a synchronous version
	    // viewLayer.draw = debounce(function () {
	    //     viewLayer._draw();
	    // }, 1);
	    var drawRequestedId = false;
	    viewLayer.draw = function () {
	        if (!drawRequestedId) {
	            drawRequestedId = requestAnimationFrame(viewLayer._draw);
	        }
	    };
	
	    viewLayer._draw = function () {
	        drawRequestedId = undefined;
	        // return if we haven't built yet
	        if (!container || grid.destroyed) {
	            return;
	        }
	
	        if (!grid.opts.snapToCell && grid.fps.slowCount > 10) {
	            grid.opts.snapToCell = true;
	        }
	
	        var rebuilt = grid.viewPort.isDirty();
	        if (rebuilt) {
	            viewLayer._buildCells();
	        }
	
	        var builtColsDirty = grid.colModel.areBuildersDirty();
	        if (rebuilt || builtColsDirty) {
	            viewLayer._buildCols();
	        }
	
	        var builtRowsDirty = grid.rowModel.areBuildersDirty();
	        if (rebuilt || builtRowsDirty) {
	            viewLayer._buildRows();
	        }
	
	        var cellsPositionOrSizeChanged = grid.colModel.isDirty() || grid.rowModel.isDirty() || grid.cellScrollModel.isDirty();
	
	        if (grid.cellClasses.isDirty() || rebuilt || cellsPositionOrSizeChanged) {
	            viewLayer._drawCellClasses();
	        }
	
	        var drawingCells = rebuilt || cellsPositionOrSizeChanged || builtColsDirty || builtRowsDirty || grid.dataModel.isDirty();
	        if (drawingCells) {
	            viewLayer._drawCells();
	        }
	
	        var drawingDecorators = grid.decorators.isDirty() || rebuilt || cellsPositionOrSizeChanged;
	        if (drawingDecorators) {
	            viewLayer._drawDecorators(cellsPositionOrSizeChanged || rebuilt);
	        }
	
	        if (grid.pixelScrollModel.isOffsetDirty() || drawingDecorators) {
	            offsetContainerForPixelScroll();
	        }
	
	        grid.eventLoop.fire('grid-draw');
	    };
	
	    /* CELL LOGIC */
	    function getBorderWidth() {
	        return borderWidth || 1;
	    }
	
	    viewLayer.getBorderWidth = getBorderWidth;
	
	    viewLayer._drawCells = function () {
	        measureBorderWidth();
	        var bWidth = getBorderWidth();
	        var headerRows = grid.rowModel.numHeaders();
	        var headerCols = grid.colModel.numHeaders();
	        var totalVisibleCellWidth = 0;
	        var lastVirtualCol;
	        var lastVirtualRow;
	        // these get calculated once per col and are then cached to save a factor of numRows calls per column
	        var widths = [];
	        var lefts = [];
	        var virtualCols = [];
	
	        function positionRow(row, height, top, virtualRow) {
	            if (!row) {
	                return;
	            }
	            // seeing the same virtual row twice means we've been clamped and it's time to hide the row
	            if (height === 0 || lastVirtualRow === virtualRow) {
	                row.style.display = 'none';
	                return;
	            }
	            row.style.display = '';
	            row.style.height = height + bWidth + 'px';
	            row.style.top = top + 'px';
	        }
	
	        grid.viewPort.iterateCells(function drawCell(r, c) {
	            var cell = cells[r][c];
	            // only calculate these once per column since they can't change during draw
	            var width = widths[c] || (widths[c] = grid.viewPort.getColWidth(c));
	            var virtualCol = virtualCols[c] || (virtualCols[c] = grid.viewPort.toVirtualCol(c));
	            // if we got the same vCol we've been clamped and its time to hide this cell
	            // also hide the cell if its width is zero cause ya...
	            if (width === 0 || virtualCol === lastVirtualCol) {
	                cell.style.display = 'none';
	                return;
	            }
	            if (r === 0) {
	                // calculate width for rows later but only do it one time (so on the first row)
	                totalVisibleCellWidth += width;
	            }
	
	            lastVirtualCol = virtualCol;
	            cell.style.display = '';
	            cell.style.width = width + bWidth + 'px';
	            // only calculate these once per column since they can't change during draw
	            var left = lefts[c] || (lefts[c] = grid.viewPort.getColLeft(c));
	
	            cell.style.left = left + 'px';
	
	            var virtualRow = grid.viewPort.toVirtualRow(r);
	
	            var data;
	            if (r < headerRows || c < headerCols) {
	                data = grid.dataModel.getHeader(virtualRow, virtualCol);
	            } else {
	                data = grid.dataModel.get(grid.rowModel.toData(virtualRow), grid.colModel.toData(virtualCol));
	            }
	            // artificially only get builders for row headers for now
	            var builder = virtualRow < headerRows && grid.rowModel.get(virtualRow).builder || undefined;
	            var hasRowBuilder = true;
	            if (!builder) {
	                hasRowBuilder = false;
	                builder = grid.colModel.get(virtualCol).builder;
	            }
	
	            var cellChild;
	            if (builder) {
	                var builtElem;
	                if (hasRowBuilder) {
	                    builtElem = builtRows[virtualRow][c];
	                } else {
	                    builtElem = builtCols[virtualCol][r];
	                }
	                cellChild = builder.update(builtElem, {
	                    virtualCol: virtualCol,
	                    virtualRow: virtualRow,
	                    data: data
	                });
	            }
	            // if we didn't get a child from the builder use a regular text node
	            if (!cellChild) {
	                viewLayer.setTextContent(cell, data.formatted);
	            } else {
	                var notSameElem = cell.firstChild !== cellChild;
	                if (cell.firstChild && notSameElem) {
	                    cell.removeChild(cell.firstChild);
	                }
	                if (notSameElem) {
	                    cell.appendChild(cellChild);
	                }
	            }
	        }, function drawRow(r) {
	            var height = grid.viewPort.getRowHeight(r);
	            var virtualRow = grid.view.row.toVirtual(r);
	            var top = grid.viewPort.getRowTop(r);
	            positionRow(rows.fixed[r], height, top, virtualRow);
	            positionRow(rows.nonFixed[r], height, top, virtualRow);
	            lastVirtualRow = virtualRow;
	        });
	
	        rows.nonFixed.forEach(function (row) {
	            row.style.width = totalVisibleCellWidth + 'px';
	        });
	        rows.fixed.forEach(function (row) {
	            row.style.width = grid.virtualPixelCellModel.fixedWidth() + 'px';
	        });
	
	        if (grid.cellScrollModel.row % 2) {
	            cellContainerBR.className = GRID_CELL_CONTAINER_BASE_CLASS + ' odds';
	            cellContainerBL.className = GRID_CELL_CONTAINER_BASE_CLASS + ' odds';
	        } else {
	            doToAllCellContainers(function (cellContainer) {
	                cellContainer.className = GRID_CELL_CONTAINER_BASE_CLASS;
	            });
	        }
	    };
	
	    function clearCellContainer(cellContainer) {
	        while (cellContainer.firstChild) {
	            cellContainer.removeChild(cellContainer.firstChild);
	        }
	    }
	
	    function doToAllCellContainers(fn) {
	        fn(cellContainerTL);
	        fn(cellContainerTR);
	        fn(cellContainerBL);
	        fn(cellContainerBR);
	    }
	
	    function getCellContainer(r, c) {
	        var fixedRow = r < grid.rowModel.numFixed();
	        var fixedCol = c < grid.colModel.numFixed();
	        if (fixedRow && fixedCol) {
	            return cellContainerTL;
	        } else if (fixedRow) {
	            return cellContainerTR;
	        } else if (fixedCol) {
	            return cellContainerBL;
	        }
	        return cellContainerBR;
	    }
	
	    function buildRow(r) {
	        var row = document.createElement('div');
	        row.setAttribute('class', 'grid-row');
	        row.setAttribute('dts', 'grid-row');
	        row.style.position = 'absolute';
	        row.style.left = 0;
	        if (r < grid.rowModel.numHeaders()) {
	            row.classList.add('grid-is-header');
	        }
	        return row;
	    }
	
	    viewLayer._buildCells = function buildCells() {
	
	        doToAllCellContainers(clearCellContainer);
	
	        cells = [];
	        rows.fixed = [];
	        rows.nonFixed = [];
	        var row;
	        grid.viewPort.iterateCells(function (r, c) {
	            if (c === 0) {
	                cells[r] = [];
	            }
	            if (c === grid.colModel.numFixed()) {
	                row = rows.nonFixed[r] = buildRow(r);
	            } else if (c === 0) {
	                row = rows.fixed[r] = buildRow(r);
	            }
	            var cell = buildDivCell();
	            cells[r][c] = cell;
	            row.appendChild(cell);
	            getCellContainer(r, c).appendChild(row);
	        });
	    };
	
	    function buildDivCell() {
	        var cell = document.createElement('div');
	        cell.setAttribute('dts', 'grid-cell');
	        var style = cell.style;
	        style.position = 'absolute';
	        style.boxSizing = 'border-box';
	        style.top = '0px';
	        style.bottom = '0px';
	        return cell;
	    }
	
	    /* END CELL LOGIC */
	
	    /* COL BUILDER LOGIC */
	
	    function destroyRenderedElems(oldElems) {
	        if (!oldElems) {
	            return;
	        }
	        oldElems.forEach(function (oldElem) {
	            if (!oldElem) {
	                return;
	            }
	            var destroyEvent = customEvent('grid-rendered-elem-destroy', true);
	            oldElem.dispatchEvent(destroyEvent);
	        });
	    }
	
	    viewLayer._buildCols = function () {
	        var previouslyBuiltCols = builtCols;
	        builtCols = {};
	        for (var c = 0; c < grid.colModel.length(true); c++) {
	            var builder = grid.colModel.get(c).builder;
	            var oldElems = previouslyBuiltCols && previouslyBuiltCols[c];
	
	            if (builder) {
	                builtCols[c] = [];
	                destroyRenderedElems(oldElems);
	                for (var realRow = 0; realRow < grid.viewPort.rows; realRow++) {
	                    builtCols[c][realRow] = builder.render({
	                        viewRow: realRow,
	                        previousElement: oldElems && oldElems[realRow]
	                    });
	                }
	            }
	        }
	    };
	    /* END COL BUILDER LOGIC */
	
	    /* ROW BUILDER LOGIC
	     *  for now we only build headers
	     * */
	
	    viewLayer._buildRows = function () {
	        var previouslyBuiltRows = builtRows;
	        builtRows = {};
	        for (var r = 0; r < grid.rowModel.numHeaders(); r++) {
	            var builder = grid.rowModel.get(r).builder;
	            var oldElems = previouslyBuiltRows && previouslyBuiltRows[r];
	
	            if (builder) {
	                builtRows[r] = [];
	                destroyRenderedElems(oldElems);
	                for (var realCol = 0; realCol < grid.viewPort.cols; realCol++) {
	                    builtRows[r][realCol] = builder.render({
	                        viewCol: realCol,
	                        previousElement: oldElems && oldElems[realCol]
	                    });
	                }
	            }
	        }
	    };
	    /* END ROW BUILDER LOGIC*/
	
	    /* DECORATOR LOGIC */
	    function setPosition(boundingBox, top, left, height, width) {
	        var style = boundingBox.style;
	        if (height <= 0 || width <= 0) {
	            style.display = 'none';
	            return false;
	        }
	        style.display = '';
	        style.top = top + 'px';
	        style.left = left + 'px';
	        style.height = height + 'px';
	        style.width = width + 'px';
	        style.position = 'absolute';
	    }
	
	    function positionDecorator(bounding, t, l, h, w) {
	        return setPosition(bounding, t, l, util.clamp(h, 0, grid.viewPort.height), util.clamp(w, 0, grid.viewPort.width));
	    }
	
	    function positionCellDecoratorFromViewCellRange(realCellRange, boundingBox) {
	        var realPxRange = grid.viewPort.toPx(realCellRange);
	        return positionDecorator(boundingBox, realPxRange.top, realPxRange.left, realPxRange.height && realPxRange.height + getBorderWidth(), realPxRange.width && realPxRange.width + getBorderWidth());
	    }
	
	    function createRangeForDescriptor(descriptor) {
	        var range = {
	            top: descriptor.top,
	            left: descriptor.left,
	            height: descriptor.height,
	            width: descriptor.width
	        };
	        if (descriptor.space === 'data' && descriptor.units === 'cell') {
	            range.top += grid.rowModel.numHeaders();
	            range.left += grid.colModel.numHeaders();
	        }
	        return range;
	    }
	
	    viewLayer._drawDecorators = function (cellsPositionOrSizeChanged) {
	        var aliveDecorators = grid.decorators.getAlive();
	        aliveDecorators.forEach(function (decorator) {
	
	            var boundingBox = decorator.boundingBox;
	            var hasBeenRendered = !!boundingBox;
	            if (!hasBeenRendered) {
	                boundingBox = document.createElement('div');
	                boundingBox.style.pointerEvents = 'none';
	                decorator.boundingBox = boundingBox;
	                var decElement = decorator.render();
	                if (decElement) {
	                    boundingBox.appendChild(decElement);
	                }
	            }
	
	            if (decorator.isDirty() || cellsPositionOrSizeChanged || !hasBeenRendered) {
	
	                var vCol = decorator.left;
	                var vRow = decorator.top;
	                if (decorator.space === 'real') {
	                    vCol = grid.view.col.toVirtual(vCol);
	                    vRow = grid.view.row.toVirtual(vRow);
	                    switch (decorator.units) {
	                        case 'px':
	                            positionDecorator(boundingBox, decorator.top, decorator.left, decorator.height, decorator.width);
	                            break;
	                        case 'cell':
	                            positionCellDecoratorFromViewCellRange(decorator, boundingBox);
	                            break;
	                    }
	                } else if (decorator.space === 'virtual' || decorator.space === 'data') {
	                    if (decorator.space === 'data') {
	                        vCol = grid.data.col.toVirtual(vCol);
	                        vRow = grid.data.row.toVirtual(vRow);
	                    }
	                    switch (decorator.units) {
	                        case 'px':
	                            break;
	                        case 'cell':
	                        /* jshint -W086 */
	                        default:
	                            var range = createRangeForDescriptor(decorator);
	                            var realCellRange = grid.viewPort.intersect(range);
	                            if (realCellRange) {
	                                positionCellDecoratorFromViewCellRange(realCellRange, boundingBox);
	                            } else {
	                                positionDecorator(boundingBox, -1, -1, -1, -1);
	                            }
	                            break;
	                        /* jshint +W086 */
	                    }
	                }
	
	                var parent = boundingBox.parentElement;
	                if (parent) {
	                    parent.removeChild(boundingBox);
	                }
	                var fixedRow = vRow < grid.rowModel.numFixed();
	                var fixedCol = vCol < grid.colModel.numFixed();
	                if (fixedRow && fixedCol) {
	                    decorator.scrollHorz = false;
	                    decorator.scrollVert = false;
	                    decoratorContainerTL.appendChild(boundingBox);
	                } else if (fixedRow) {
	                    decorator.scrollHorz = true;
	                    decorator.scrollVert = false;
	                    decoratorContainerTR.appendChild(boundingBox);
	                } else if (fixedCol) {
	                    decorator.scrollHorz = false;
	                    decorator.scrollVert = true;
	                    decoratorContainerBL.appendChild(boundingBox);
	                } else {
	                    decorator.scrollHorz = true;
	                    decorator.scrollVert = true;
	                    decoratorContainerBR.appendChild(boundingBox);
	                }
	            }
	        });
	
	        removeDecorators(grid.decorators.popAllDead());
	    };
	
	    function removeDecorators(decorators) {
	        decorators.forEach(function (decorator) {
	            if (!decorator) {
	                return;
	            }
	            var boundingBox = decorator.boundingBox;
	            if (boundingBox) {
	                // if they rendered an element previously we attached it to the bounding box as the only child
	                var renderedElement = boundingBox.firstChild;
	                if (renderedElement) {
	                    // create a destroy dom event that bubbles
	                    var destroyEvent = customEvent('decorator-destroy', true);
	                    renderedElement.dispatchEvent(destroyEvent);
	                }
	                var parent = boundingBox.parentElement;
	                if (parent) {
	                    parent.removeChild(boundingBox);
	                }
	                decorator.boundingBox = undefined;
	            }
	        });
	    }
	
	    /* END DECORATOR LOGIC */
	
	    /* CELL CLASSES LOGIC */
	    viewLayer._drawCellClasses = function () {
	        grid.viewPort.iterateCells(function (r, c) {
	            var classes = grid.cellClasses.getCachedClasses(grid.view.row.toVirtual(r), grid.view.col.toVirtual(c));
	            cells[r][c].className = classes.join(' ');
	        });
	    };
	
	    /* END CELL CLASSES LOGIC*/
	
	    viewLayer.eventIsOnCells = function (e) {
	        var target = e.target;
	
	        if (!target) {
	            return false;
	        }
	        if (target.classList && target.classList.contains('grid-cell') || target === grid.textarea) {
	            // on an actual grid-cell
	            return true;
	        }
	
	        var renderedColElement = builtCols && builtCols[e.realCol];
	        var renderedRowElement = builtRows && builtRows[e.realRow];
	
	        if (renderedColElement && !grid.view.col.get(e.realCol).isBuiltActionable) {
	            var elem = renderedColElement[e.realRow];
	            return isTargetInElem(target, elem);
	        } else if (renderedRowElement && !grid.view.row.get(e.realRow).isBuiltActionable) {
	            var elem = renderedRowElement[e.realCol];
	            return isTargetInElem(target, elem);
	        }
	
	        return false;
	    };
	
	    viewLayer.setTextContent = function (elem, text) {
	        if (elem.firstChild && elem.firstChild.nodeType === 3) {
	            elem.firstChild.nodeValue = text;
	        } else {
	            elem.textContent = text;
	        }
	    };
	
	    function destroyPreviouslyBuilt(built) {
	        if (!built) {
	            return;
	        }
	        Object.keys(built).forEach(function (key) {
	            destroyRenderedElems(built[key]);
	        });
	    }
	
	    function cleanup() {
	        removeDecorators(grid.decorators.getAlive().concat(grid.decorators.popAllDead()));
	        destroyPreviouslyBuilt(builtCols);
	        destroyPreviouslyBuilt(builtRows);
	        if (!container) {
	            return;
	        }
	        var querySelectorAll = container.querySelectorAll('.' + GRID_VIEW_ROOT_CLASS);
	        for (var i = 0; i < querySelectorAll.length; ++i) {
	            var root = querySelectorAll[i];
	            container.removeChild(root);
	        }
	    }
	
	    function isTargetInElem(target, elem) {
	        var t = target;
	        while (t && t.classList && !t.classList.contains('grid-container')) {
	            if (t === elem) {
	                return true;
	            }
	            t = t.parentElement;
	        }
	        return false;
	    }
	
	    grid.eventLoop.bind('grid-destroy', function () {
	        cleanup();
	        if (drawRequestedId) {
	            cancelAnimationFrame(drawRequestedId);
	        }
	        viewLayer.draw = __webpack_require__(21);
	    });
	
	    return viewLayer;
	};

/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var elementClass = __webpack_require__(5);
	var util = __webpack_require__(3);
	var ctrlOrCmd = __webpack_require__(34);
	var key = __webpack_require__(35);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	    var api = {};
	    var wasSelectedAtMousedown;
	
	    function isTargetingColHeader(e) {
	        return e && e.row < 0;
	    }
	
	    api._onMousedown = function (e) {
	        if (!isTargetingColHeader(e)) {
	            return;
	        }
	
	        var colDescriptor = grid.data.col.get(e.col);
	        wasSelectedAtMousedown = colDescriptor && !!colDescriptor.selected;
	        if (wasSelectedAtMousedown && !ctrlOrCmd(e)) {
	            grid.eventLoop.stopBubbling(e);
	        }
	    };
	
	    api._onDragStart = function (e) {
	
	        if (!isTargetingColHeader(e) || e.realCol < grid.colModel.numFixed() || !wasSelectedAtMousedown) {
	            return;
	        }
	
	        var colDescriptor = grid.view.col.get(e.realCol);
	        if (!colDescriptor || colDescriptor.selectable === false) {
	            return;
	        }
	        if (e.enableAutoScroll) {
	            e.enableAutoScroll();
	        }
	        // we want to be the only draggers
	        grid.eventLoop.stopBubbling(e);
	
	        var startCol = e.virtualCol;
	
	        // create the target line
	        api._targetCol = grid.decorators.create(0, undefined, Infinity, 1, 'cell', 'real');
	        api._targetCol.postRender = function (div) {
	            div.setAttribute('class', 'grid-reorder-target');
	            api._targetCol._renderedElem = div;
	        };
	        grid.decorators.add(api._targetCol);
	
	        // create a decorator for each selected col
	        var selected = grid.colModel.getSelected();
	        api._dragRects = selected.map(function (dataCol) {
	            var viewCol = grid.data.col.toView(dataCol);
	            var dragRect = grid.decorators.create(0, undefined, Infinity, undefined, 'px', 'real');
	            dragRect.fixed = true;
	            dragRect.colOffset = e.gridX - grid.viewPort.getColLeft(viewCol);
	            dragRect.postRender = function (div) {
	                div.setAttribute('class', 'grid-drag-rect');
	            };
	            dragRect.width = grid.viewPort.getColWidth(viewCol);
	            return dragRect;
	        });
	
	        grid.decorators.add(api._dragRects);
	
	        api._unbindKeyDown = grid.escapeStack.add(removeDecoratorsAndUnbind);
	
	        api._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
	            api._dragRects.forEach(function (dragRect) {
	                dragRect.left = util.clamp(e.gridX - dragRect.colOffset, grid.viewPort.getColLeft(grid.colModel.numFixed()), Infinity);
	            });
	            api._targetCol.left = util.clamp(e.realCol, grid.colModel.numFixed(), Infinity);
	            api._targetCol.moveAfter = e.realCol > startCol;
	            if (api._targetCol.moveAfter) {
	                elementClass(api._targetCol._renderedElem).add('right');
	            } else {
	                elementClass(api._targetCol._renderedElem).remove('right');
	            }
	        });
	
	        api._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
	            var targetCol = api._targetCol.left;
	
	            grid.colModel.move(selected.map(function (dataCol) {
	                return grid.data.col.toVirtual(dataCol);
	            }), grid.viewPort.toVirtualCol(targetCol), api._targetCol.moveAfter);
	
	            removeDecoratorsAndUnbind();
	        });
	
	        function removeDecoratorsAndUnbind() {
	            var removedDecs = api._dragRects.concat(api._targetCol);
	            grid.decorators.remove(removedDecs);
	            api._unbindDrag();
	            api._unbindDragEnd();
	            api._unbindKeyDown && api._unbindKeyDown();
	            return true; // for the escape stack
	        }
	    };
	
	    grid.eventLoop.bind('grid-drag-start', api._onDragStart);
	    grid.eventLoop.addInterceptor(function (e) {
	        if (e.type === 'mousedown') {
	            api._onMousedown(e);
	        }
	    });
	
	    return api;
	};

/***/ },
/* 34 */
/***/ function(module, exports) {

	"use strict";
	
	module.exports = function (e) {
	    return window.navigator.userAgent.match(/win/i) ? e.ctrlKey : e.metaKey;
	};

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.3.3
	(function() {
	  'use strict';
	
	  var isRef, iterator, key,
	    _this = this,
	    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
	    __hasProp = {}.hasOwnProperty;
	
	  isRef = __webpack_require__(36).isRef;
	
	  key = {};
	
	  key.code = {
	    special: __webpack_require__(37),
	    arrow: __webpack_require__(38),
	    punctuation: __webpack_require__(39),
	    alnum: __webpack_require__(40),
	    brand: __webpack_require__(41)
	  };
	
	  key.get = function(pressed) {
	    return iterator(key.code, pressed);
	  };
	
	  key.is = function(ref, pressed) {
	    if (!isRef(ref)) {
	      ref = iterator(ref, pressed);
	    }
	    if (isRef(ref)) {
	      if (isRef(pressed)) {
	        return pressed === ref;
	      } else {
	        return pressed === ref.code || __indexOf.call(ref.code, pressed) >= 0;
	      }
	    } else {
	      return pressed === ref;
	    }
	  };
	
	  iterator = function(context, pressed) {
	    var i, out, ref;
	    for (i in context) {
	      if (!__hasProp.call(context, i)) continue;
	      ref = context[i];
	      if (isRef(ref)) {
	        if (key.is(ref, pressed)) {
	          return ref;
	        }
	      } else {
	        out = iterator(ref, pressed);
	        if (isRef(out)) {
	          return out;
	        }
	      }
	    }
	  };
	
	  if (typeof window !== 'undefined') {
	    window.key = key;
	  }
	
	  module.exports = key;
	
	}).call(this);


/***/ },
/* 36 */
/***/ function(module, exports) {

	// Generated by CoffeeScript 1.3.3
	(function() {
	  'use strict';
	
	  var Reference, assertRef, isRef, ref;
	
	  Reference = (function() {
	
	    function Reference(name, code) {
	      this.name = name;
	      this.code = code;
	    }
	
	    return Reference;
	
	  })();
	
	  ref = function(name, code) {
	    return new Reference(name, code);
	  };
	
	  isRef = function(ref) {
	    return ref instanceof Reference;
	  };
	
	  assertRef = function(ref) {
	    if (!isRef(ref)) {
	      throw new Error('Invalid reference');
	    }
	    return ref;
	  };
	
	  module.exports = {
	    ref: ref,
	    isRef: isRef,
	    assertRef: assertRef
	  };
	
	}).call(this);


/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.3.3
	(function() {
	  'use strict';
	
	  var ref, special;
	
	  ref = __webpack_require__(36).ref;
	
	  special = {
	    backspace: ref('Backspace', 8),
	    tab: ref('Tab', 9),
	    enter: ref('Enter', 13),
	    shift: ref('Shift', 16),
	    ctrl: ref('Ctrl', 17),
	    alt: ref('Alt', 18),
	    caps: ref('Caps Lock', 20),
	    esc: ref('Escape', 27),
	    space: ref('Space', 32),
	    num: ref('Num Lock', 144)
	  };
	
	  module.exports = special;
	
	}).call(this);


/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.3.3
	(function() {
	  'use strict';
	
	  var arrow, ref;
	
	  ref = __webpack_require__(36).ref;
	
	  arrow = {
	    left: ref('Left', 37),
	    up: ref('Up', 38),
	    right: ref('Right', 39),
	    down: ref('Down', 40)
	  };
	
	  module.exports = arrow;
	
	}).call(this);


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.3.3
	(function() {
	  'use strict';
	
	  var punctuation, ref;
	
	  ref = __webpack_require__(36).ref;
	
	  punctuation = {
	    colon: ref('Colon/Semicolon', [59, 186]),
	    equal: ref('Equal/Plus', [61, 187]),
	    comma: ref('Comma/Less Than', [44, 188]),
	    hyphen: ref('Hyphen/Underscore', [45, 109, 189]),
	    period: ref('Period/Greater Than', [46, 190]),
	    tilde: ref('Tilde/Back Tick', [96, 192]),
	    apostrophe: ref('Apostrophe/Quote', [39, 222]),
	    slash: {
	      forward: ref('Forward Slash/Question Mark', [47, 191]),
	      backward: ref('Backward Slash/Pipe', 220)
	    },
	    brace: {
	      square: {
	        open: ref('Open Square/Curly Brace', 219),
	        close: ref('Close Square/Curly Brace', 221)
	      }
	    }
	  };
	
	  punctuation.semicolon = punctuation.colon;
	
	  punctuation.plus = punctuation.equal;
	
	  punctuation.lessthan = punctuation.comma;
	
	  punctuation.underscore = punctuation.hyphen;
	
	  punctuation.greaterthan = punctuation.period;
	
	  punctuation.question = punctuation.slash.forward;
	
	  punctuation.backtick = punctuation.tilde;
	
	  punctuation.pipe = punctuation.slash.backward;
	
	  punctuation.quote = punctuation.apostrophe;
	
	  punctuation.brace.curly = punctuation.brace.square;
	
	  module.exports = punctuation;
	
	}).call(this);


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.3.3
	(function() {
	  'use strict';
	
	  var alnum, ref;
	
	  ref = __webpack_require__(36).ref;
	
	  alnum = {
	    '0': ref('0', 48),
	    '1': ref('1', 49),
	    '2': ref('2', 50),
	    '3': ref('3', 51),
	    '4': ref('4', 52),
	    '5': ref('5', 53),
	    '6': ref('6', 54),
	    '7': ref('7', 55),
	    '8': ref('8', 56),
	    '9': ref('9', 57),
	    a: ref('A', 65),
	    b: ref('B', 66),
	    c: ref('C', 67),
	    d: ref('D', 68),
	    e: ref('E', 69),
	    f: ref('F', 70),
	    g: ref('G', 71),
	    h: ref('H', 72),
	    i: ref('I', 73),
	    j: ref('J', 74),
	    k: ref('K', 75),
	    l: ref('L', 76),
	    m: ref('M', 77),
	    n: ref('N', 78),
	    o: ref('O', 79),
	    p: ref('P', 80),
	    q: ref('Q', 81),
	    r: ref('R', 82),
	    s: ref('S', 83),
	    t: ref('T', 84),
	    u: ref('U', 85),
	    v: ref('V', 86),
	    w: ref('W', 87),
	    x: ref('X', 88),
	    y: ref('Y', 89),
	    z: ref('Z', 90)
	  };
	
	  module.exports = alnum;
	
	}).call(this);


/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	// Generated by CoffeeScript 1.3.3
	(function() {
	  'use strict';
	
	  var brand, ref;
	
	  ref = __webpack_require__(36).ref;
	
	  brand = {
	    apple: ref('Apple &#8984;', 224),
	    windows: {
	      start: ref('Windows start', [91, 92]),
	      menu: ref('Windows menu', 93)
	    }
	  };
	
	  module.exports = brand;
	
	}).call(this);


/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var key = __webpack_require__(35);
	var clickOff = __webpack_require__(43);
	
	module.exports = function (grid) {
	    var editModel = {
	        editing: false,
	        _defaultDecorator: grid.decorators.create(-1, -1, 1, 1)
	    };
	
	    editModel._defaultDecorator.render = function () {
	        var element = document.createElement('textarea');
	        element.style.pointerEvents = 'all';
	        element.style.zIndex = 1;
	        element.style.position = 'relative';
	        grid.eventLoop.bindOnce('grid-draw', function () {
	            element.value = editModel._defaultDecorator.typedText() || grid.dataModel.get(editModel._defaultDecorator.top, editModel._defaultDecorator.left).formatted;
	            element.focus();
	        });
	        editModel._defaultDecorator.renderedElem = element;
	        return element;
	    };
	    editModel._hydrateOpts = function (opts) {
	        opts = opts || {
	            getEditor: function getEditor() {
	                return {};
	            }
	        };
	        // yesyes i know modifying supplied args. hush.
	        var isActionMode = !!opts.action;
	        if (!opts.editTriggers) {
	            if (isActionMode) {
	                opts.editTriggers = ['click', 'space', 'enter'];
	            } else {
	                opts.editTriggers = ['dblclick', 'enter', 'typing'];
	            }
	        }
	
	        if (!opts.saveTriggers) {
	            if (isActionMode) {
	                opts.saveTriggers = [];
	            } else {
	                opts.saveTriggers = ['tab', 'enter', 'clickoff'];
	            }
	        }
	
	        if (!opts.cancelTriggers) {
	            if (isActionMode) {
	                opts.cancelTriggers = [];
	            } else {
	                opts.cancelTriggers = ['escape'];
	            }
	        }
	
	        if (isActionMode) {
	            opts.getEditor = function () {
	                return {
	                    decorator: false,
	                    save: undefined,
	                    closePromise: opts.action.apply(opts, arguments)
	                };
	            };
	        } else if (!opts.getEditor) {
	            opts.getEditor = function () {
	                return {};
	            };
	        }
	
	        opts.headers = !!opts.headers; // be explicit, and default to false
	        return opts;
	    };
	
	    function optsHasTrigger(opts, trigger, triggerField) {
	        return opts && opts[triggerField] && opts[triggerField].indexOf(trigger) !== -1;
	    }
	
	    function optsHasEditTrigger(opts, trigger) {
	        return optsHasTrigger(opts, trigger, 'editTriggers');
	    }
	
	    function optsHasCancelTrigger(opts, trigger) {
	        return optsHasTrigger(opts, trigger, 'cancelTriggers');
	    }
	
	    function optsHasSaveTrigger(opts, trigger) {
	        return optsHasTrigger(opts, trigger, 'saveTriggers');
	    }
	
	    function getOptsForCol(col) {
	        var colDescriptor = grid.data.col.get(col);
	        if (!colDescriptor) {
	            return;
	        }
	        return editModel._hydrateOpts(colDescriptor.editOptions);
	    }
	
	    editModel._interceptor = function (e) {
	        var col = e.col;
	        var row = e.row;
	        var opts = getOptsForCol(col);
	        if (!opts) {
	            return;
	        }
	        if (!editModel.editing) {
	            // check editTriggers if not editing
	            switch (e.type) {
	                case 'click':
	                    if (optsHasEditTrigger(opts, 'click') && grid.eventIsOnCells(e)) {
	                        editModel.editCell(row, col, false, e);
	                    }
	                    break;
	                case 'dblclick':
	                    if (optsHasEditTrigger(opts, 'dblclick') && grid.eventIsOnCells(e)) {
	                        editModel.editCell(row, col, false, e);
	                    }
	                    break;
	                case 'keydown':
	                    if (optsHasEditTrigger(opts, 'space') && key.is(key.code.special.space, e.which)) {
	                        editModel.editCell(row, col, false, e);
	                    }
	
	                    if (optsHasEditTrigger(opts, 'enter') && key.is(key.code.special.enter, e.which)) {
	                        editModel.editCell(row, col, false, e);
	                    }
	
	                    // delete trigger can also happen only when not editing
	                    // also have to hardcode 46 until key library merges change
	                    if (key.is(key.code.special.backspace, e.which) || e.which === 46) {
	                        editModel.deleteSelection();
	                    }
	                    break;
	                case 'keypress':
	                    if (optsHasEditTrigger(opts, 'typing') && e.which >= 32 && e.which <= 122 && !e.metaKey && !e.ctrlKey && !e.altKey) {
	                        editModel.editCell(row, col, true, e);
	                    }
	                    break;
	            }
	        } else {
	            // check save triggers if editing
	            switch (e.type) {
	                case 'keydown':
	                    if (optsHasSaveTrigger(opts, 'tab') && key.is(key.code.special.tab, e.which)) {
	                        editModel.saveEdit().then(function () {
	                            grid.navigationModel.handleTabEvent(e);
	                        });
	                        e.preventDefault();
	                    }
	
	                    if (optsHasSaveTrigger(opts, 'enter') && key.is(key.code.special.enter, e.which) && !e.shiftKey) {
	                        editModel.saveEdit().then(function () {
	                            grid.navigationModel.setFocus(grid.data.down(grid.navigationModel.focus.row), grid.navigationModel.focus.col);
	                        });
	                    }
	                    break;
	            }
	        }
	    };
	
	    editModel.deleteSelection = function () {
	        var ranges = grid.navigationModel.getAllSelectedRanges();
	        var dataChanges = [];
	        ranges.forEach(function (range) {
	            grid.data.iterate(range, function (r, c) {
	                dataChanges.push({
	                    row: r,
	                    col: c,
	                    value: undefined
	                });
	            });
	        });
	        grid.dataModel.set(dataChanges);
	    };
	
	    function setEditing(editing) {
	        var prevEditing = editModel.editing;
	        editModel.editing = editing;
	        if (prevEditing !== editing) {
	            grid.eventLoop.fire('grid-edit');
	        }
	    }
	
	    editModel.editCell = function (r, c, isTyping, originalEvent) {
	        if (editModel.editing) {
	            editModel.saveEdit();
	        }
	        editModel.savePromise = undefined;
	
	        if (isNaN(r) || isNaN(c)) {
	            return;
	        }
	        var opts = getOptsForCol(c);
	        if (!opts) {
	            return;
	        }
	        if ((r < 0 || c < 0) && !opts.headers) {
	            return;
	        }
	
	        var editor = opts.getEditor(r, originalEvent);
	        // if they have no editor or not closePromise,
	        // it's just a simple action and there's no need to wait on them in edit mode
	        if (!editor || !editor.closePromise && editor.decorator === false) {
	            return;
	        }
	        setEditing(true);
	        if (editor.decorator === undefined) {
	            editor.decorator = editModel._defaultDecorator;
	            if (editor.save === undefined) {
	                editor.save = function () {
	                    var text = editor.decorator.renderedElem && editor.decorator.renderedElem.value;
	                    return Promise.resolve({
	                        value: text,
	                        formatted: text
	                    });
	                };
	            }
	        }
	        editModel.currentEditor = editor;
	        if (editor.decorator) {
	            editor.decorator.typedText = function () {
	                return isTyping ? grid.textarea.value && grid.textarea.value.trim() : '';
	            };
	            editor.decorator.top = r;
	            editor.decorator.left = c;
	            grid.decorators.add(editor.decorator);
	            editor.removeEscapeStackHandler = grid.escapeStack.add(function () {
	                if (optsHasCancelTrigger(opts, 'escape')) {
	                    editModel.cancelEdit();
	                } else if (optsHasSaveTrigger(opts, 'escape')) {
	                    editModel.saveEdit();
	                }
	            });
	
	            editor.removeClickOffHandler = clickOff.listen(function getClickOffElement() {
	                return editor.decorator && editor.decorator.boundingBox;
	            }, function onClick(e) {
	                if (editor.isInMe && editor.isInMe(e)) {
	                    return;
	                }
	                if (optsHasCancelTrigger(opts, 'clickoff')) {
	                    editModel.cancelEdit();
	                } else if (optsHasSaveTrigger(opts, 'clickoff')) {
	                    editModel.saveEdit();
	                }
	            }, {});
	        }
	
	        if (editor.closePromise) {
	            editor.closePromise.then(function resolve() {
	                return editModel.saveEdit();
	            }, function reject() {
	                return editModel.cancelEdit();
	            });
	        }
	    };
	
	    editModel._closeEditor = function () {
	        if (!editModel.editing) {
	            return;
	        }
	        setEditing(false);
	        if (editModel.currentEditor.removeEscapeStackHandler) {
	            editModel.currentEditor.removeEscapeStackHandler();
	        }
	        if (editModel.currentEditor.removeClickOffHandler) {
	            editModel.currentEditor.removeClickOffHandler();
	        }
	        if (editModel.currentEditor.decorator) {
	            grid.decorators.remove(editModel.currentEditor.decorator);
	        }
	
	        grid.viewLayer.draw();
	        grid.eventLoop.bindOnce('grid-draw', function () {
	            grid.container.focus();
	        });
	    };
	
	    editModel.cancelEdit = function () {
	        editModel._closeEditor();
	    };
	
	    editModel.saveEdit = function () {
	        if (!editModel.savePromise) {
	            var savePromise = editModel.currentEditor.save && editModel.currentEditor.save() || Promise.resolve(null);
	
	            editModel.savePromise = savePromise.then(function (dataResult) {
	                if (dataResult) {
	                    dataResult.row = editModel.currentEditor.decorator.top;
	                    dataResult.col = editModel.currentEditor.decorator.left;
	                    grid.dataModel.set([dataResult]);
	                }
	                editModel._closeEditor();
	                return dataResult;
	            });
	        }
	        return editModel.savePromise;
	    };
	
	    grid.eventLoop.bind('grid-destroy', function () {
	        editModel.cancelEdit();
	    });
	
	    grid.eventLoop.addInterceptor(editModel._interceptor);
	
	    return editModel;
	};

/***/ },
/* 43 */
/***/ function(module, exports) {

	module.exports.listen = function listenForClickOff(elem, onClickOff, opts) {
		var parsedOpts = opts || {}
			// we use mousedown to check the target because the click could cause the element to be removed and it'll look like it's not in us
		var lastMouseDownWasOutside = false;
		// check again after timeout
		var eventListenerElement = parsedOpts.eventListenerElement || document;
		var isInMe = parsedOpts.isInMe;
	
		function mousedownHandler(e) {
			if (typeof elem === 'function') {
				elem = elem();
			}
			lastMouseDownWasOutside = !elem || !(elem === e.target || elem.contains(e.target)) && !(isInMe && isInMe(e.target));
		}
	
		function mouseupHandler(e) {
			if (lastMouseDownWasOutside) {
				onClickOff(e);
			}
		}
		eventListenerElement.addEventListener('mousedown', mousedownHandler);
		eventListenerElement.addEventListener('mouseup', mouseupHandler);
	
		return function unbindClickOffListeners() {
			eventListenerElement.removeEventListener('mousedown', mousedownHandler);
			eventListenerElement.removeEventListener('mouseup', mouseupHandler);
		};
	};


/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var key = __webpack_require__(35);
	var arrow = key.code.arrow;
	var util = __webpack_require__(3);
	var rangeUtil = __webpack_require__(7);
	var ctrlOrCmd = __webpack_require__(34);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	
	    var model = {
	        focus: {
	            row: 0,
	            col: 0
	        },
	        checkboxModeFor: {}
	    };
	
	    model.otherSelections = [];
	
	    var focusClass = grid.cellClasses.create(0, 0, 'focus');
	    grid.cellClasses.add(focusClass);
	
	    model.focusDecorator = grid.decorators.create(0, 0, 1, 1);
	    var focusDefaultRender = model.focusDecorator.render;
	    model.focusDecorator.render = function () {
	        var div = focusDefaultRender();
	        div.setAttribute('class', 'grid-focus-decorator');
	        return div;
	    };
	    grid.decorators.add(model.focusDecorator);
	
	    model.setFocus = function setFocus(row, col, dontClearSelection, dontSetSelection) {
	        row = grid.data.row.clamp(row);
	        if (typeof row !== 'number' || isNaN(row)) {
	            row = model.focus.row;
	        }
	        col = grid.data.col.clamp(col);
	        if (typeof col !== 'number' || isNaN(col)) {
	            col = model.focus.col;
	        }
	        var changed = row !== model.focus.row || col !== model.focus.col;
	        model.focus.row = row;
	        model.focus.col = col;
	        focusClass.top = row;
	        focusClass.left = col;
	        model.focusDecorator.top = row;
	        model.focusDecorator.left = col;
	        grid.cellScrollModel.scrollIntoView(row, col);
	        if (!dontClearSelection) {
	            clearOtherSelections();
	        }
	        if (!dontSetSelection) {
	            setSelectionToFocus();
	        }
	        if (changed) {
	            grid.eventLoop.fire('grid-focus-change');
	        }
	    };
	
	    function seekNextEdge(newIndex, startedDefined, isForwardEdge, isBackwardEdge, goForward) {
	
	        var isEdgeToSeek;
	        if (isForwardEdge(newIndex) || !startedDefined) {
	            isEdgeToSeek = isBackwardEdge;
	        } else {
	            isEdgeToSeek = isForwardEdge;
	        }
	
	        while (goForward(newIndex) !== undefined && !isEdgeToSeek(newIndex = goForward(newIndex))) /*eslint-disable no-empty*/{}
	        // empty
	        /*eslint-enable no-empty*/
	
	        return newIndex;
	    }
	
	    function navFrom(row, col, e) {
	        // if nothing changes great we'll stay where we are
	        var newRow = row;
	        var newCol = col;
	        var isSeek = ctrlOrCmd(e);
	        var isLeftwardEdge, isRightwardEdge, isUpwardEdge, isDownwardEdge, cellHasValue, startedDefined;
	        if (isSeek) {
	            cellHasValue = function cellHasValue(r, c) {
	                if (r === undefined || c === undefined) {
	                    return false;
	                }
	
	                return !!grid.dataModel.get(r, c).formatted;
	            };
	            isLeftwardEdge = function isLeftwardEdge(c) {
	                return cellHasValue(newRow, c) && !cellHasValue(newRow, grid.data.left(c));
	            };
	            isRightwardEdge = function isRightwardEdge(c) {
	                return cellHasValue(newRow, c) && !cellHasValue(newRow, grid.data.right(c));
	            };
	            isUpwardEdge = function isUpwardEdge(r) {
	                return cellHasValue(r, newCol) && !cellHasValue(grid.data.up(r), newCol);
	            };
	            isDownwardEdge = function isDownwardEdge(r) {
	                return cellHasValue(r, newCol) && !cellHasValue(grid.data.down(r), newCol);
	            };
	            startedDefined = cellHasValue(newRow, newCol);
	        }
	        switch (e.which) {
	            case arrow.down.code:
	                if (isSeek) {
	                    newRow = seekNextEdge(newRow, startedDefined, isDownwardEdge, isUpwardEdge, grid.data.down);
	                } else {
	                    newRow = grid.data.down(newRow);
	                }
	                break;
	            case arrow.up.code:
	                if (isSeek) {
	                    newRow = seekNextEdge(newRow, startedDefined, isUpwardEdge, isDownwardEdge, grid.data.up);
	                } else {
	                    newRow = grid.data.up(newRow);
	                }
	                break;
	            case arrow.right.code:
	                if (isSeek) {
	                    newCol = seekNextEdge(newCol, startedDefined, isRightwardEdge, isLeftwardEdge, grid.data.right);
	                } else {
	                    newCol = grid.data.right(newCol);
	                }
	                break;
	            case arrow.left.code:
	                if (isSeek) {
	                    newCol = seekNextEdge(newCol, startedDefined, isLeftwardEdge, isRightwardEdge, grid.data.left);
	                } else {
	                    newCol = grid.data.left(newCol);
	                }
	                break;
	        }
	        if (newRow === undefined) {
	            newRow = row;
	        }
	        if (newCol === undefined) {
	            newCol = col;
	        }
	        return {
	            row: newRow,
	            col: newCol
	        };
	    }
	
	    model._navFrom = navFrom;
	
	    model.handleTabEvent = function (e) {
	        var newCol = model.focus.col;
	        var newRow = model.focus.row;
	        if (!e || !e.shiftKey) {
	            if (newCol === grid.data.col.count() - 1) {
	                newRow = grid.data.down(newRow);
	                newCol = 0;
	            } else {
	                newCol = grid.data.right(newCol);
	            }
	        } else {
	            if (newCol === 0) {
	                newRow = grid.data.up(newRow);
	                newCol = grid.data.col.count() - 1;
	            } else {
	                newCol = grid.data.left(newCol);
	            }
	        }
	        model.setFocus(newRow, newCol);
	        e.preventDefault();
	    };
	
	    grid.eventLoop.bind('keydown', function (e) {
	        if (!grid.focused) {
	            return;
	        }
	        // handle tab
	        if (key.is(key.code.special.tab, e.which)) {
	            model.handleTabEvent(e);
	            return;
	        }
	
	        if (!key.is(arrow, e.which)) {
	            return;
	        }
	        // focus logic
	
	        if (!e.shiftKey) {
	            var newFocus = navFrom(model.focus.row, model.focus.col, e);
	            model.setFocus(newFocus.row, newFocus.col, e);
	        } else {
	            // selection logic
	            var newSelection;
	            // stand in for if it's cleared
	            if (model.selection.top === -1) {
	                newSelection = {
	                    top: model.focus.row,
	                    left: model.focus.col,
	                    height: 1,
	                    width: 1
	                };
	            } else {
	                newSelection = {
	                    top: model.selection.top,
	                    left: model.selection.left,
	                    height: model.selection.height,
	                    width: model.selection.width
	                };
	            }
	            var navFromRow;
	            var navFromCol;
	            if (model.focus.row === newSelection.top) {
	                navFromRow = newSelection.top + newSelection.height - 1;
	            } else {
	                navFromRow = newSelection.top;
	            }
	
	            if (model.focus.col === newSelection.left) {
	                navFromCol = newSelection.left + newSelection.width - 1;
	            } else {
	                navFromCol = newSelection.left;
	            }
	            var newRowCol = navFrom(navFromRow, navFromCol, e);
	            setSelectionFromPoints(model.focus.row, model.focus.col, newRowCol.row, newRowCol.col);
	            grid.cellScrollModel.scrollIntoView(newRowCol.row, newRowCol.col);
	        }
	    });
	
	    function isNavableMouseEvent(e) {
	        var target = e.target;
	        // if there's no target let it through because that only happens in unit tests,
	        // or if it happened in real world it wouldn't have a valid row or col and so wouldn't do anything anyway
	        return !target || grid.eventIsOnCells(e) && e.button !== 2;
	    }
	
	    function isCheckboxModeForRowCol(row, col) {
	        return model.checkboxModeFor.rows && col < 0 || row < 0 && colSelectable(col) && model.checkboxModeFor.cols;
	    }
	
	    grid.eventLoop.bind('mousedown', function (e) {
	        if (!isNavableMouseEvent(e)) {
	            return;
	        }
	        // assume the event has been annotated by the cell mouse model interceptor
	        var row = e.row;
	        var col = e.col;
	
	        // if we're in checkbox mode pretend the user held command for header mousedowns only
	        var isCheckboxMode = isCheckboxModeForRowCol(row, col);
	        var ctrlOrCmdPressed = isCheckboxMode || ctrlOrCmd(e);
	
	        if (e.shiftKey) {
	            var fromRow = model.focus.row;
	            var fromCol = model.focus.col;
	            var toRow = row;
	            var toCol = col;
	            var wasSelected;
	            if (toRow < 0) {
	                var colDescriptor = grid.data.col.get(toCol);
	                if (colDescriptor.selectable !== false) {
	                    wasSelected = colDescriptor.selected;
	                    fromRow = 0;
	                    toRow = Infinity;
	                }
	            }
	            if (toCol < 0) {
	                wasSelected = grid.data.row.get(toRow).selected;
	                fromCol = 0;
	                toCol = Infinity;
	            }
	
	            selectFromFocusToCell(fromRow, fromCol, toRow, toCol, ctrlOrCmdPressed, wasSelected);
	        } else {
	
	            var focusRow = row;
	            if (focusRow < 0) {
	                focusRow = grid.view.row.toData(grid.rowModel.numHeaders());
	            }
	            var focusCol = col;
	            if (focusCol < 0) {
	                focusCol = grid.view.col.toData(grid.colModel.numHeaders());
	            }
	
	            var headerSelectionRange = createHeaderSelectionRange(row, col);
	            if (headerSelectionRange) {
	                var prevSelections = findFullRowOrColSelections(headerSelectionRange);
	                if (prevSelections.length && isCheckboxMode) {
	                    var selectAll = headerSelectionRange.width === Infinity && headerSelectionRange.height === Infinity && !(grid.rowModel.allSelected() || grid.colModel.allSelected());
	                    prevSelections.forEach(function (prevSelection) {
	                        removeFullRowOrColFromSelection(prevSelection, headerSelectionRange);
	                    });
	                    if (selectAll) {
	                        model.setSelection(headerSelectionRange);
	                    }
	                    model.setFocus(focusRow, focusCol, true, true);
	                } else {
	                    if (ctrlOrCmdPressed && !selectionIsFocus(model.selection)) {
	                        addSelection(model.selection);
	                    } else {
	                        clearOtherSelections();
	                    }
	                    model.setFocus(focusRow, focusCol, ctrlOrCmdPressed);
	                    model.setSelection(headerSelectionRange);
	                }
	            } else {
	                if (ctrlOrCmdPressed) {
	                    addSelection(model.selection);
	                }
	                model.setFocus(focusRow, focusCol, ctrlOrCmdPressed);
	            }
	        }
	    });
	
	    function selectFromFocusToCell(fromRow, fromCol, toRow, toCol, ctrlOrCmdPressed, wasSelected) {
	        var isCheckboxMode = fromRow === 0 && toRow === Infinity && model.checkboxModeFor.cols || fromCol === 0 && toCol === Infinity && model.checkboxModeFor.rows;
	        if (!wasSelected || !isCheckboxMode) {
	            setSelectionFromPoints(fromRow, fromCol, toRow, toCol, ctrlOrCmdPressed);
	        } else {
	            var range = rangeUtil.createFromPoints(fromRow, fromCol, toRow, toCol);
	            var prevSelections = findFullRowOrColSelections(range);
	            if (prevSelections.length) {
	                prevSelections.forEach(function (prevSelection) {
	                    removeFullRowOrColFromSelection(prevSelection, range);
	                });
	            }
	        }
	    }
	
	    function colSelectable(col) {
	        var colDescriptor = grid.data.col.get(col);
	        return colDescriptor && colDescriptor.selectable !== false;
	    }
	
	    function createHeaderSelectionRange(row, col) {
	        var headerSelectionRange;
	        if (row < 0 && col < 0) {
	            headerSelectionRange = rangeUtil.createFromPoints(0, 0, Infinity, Infinity);
	        } else if (row < 0) {
	            if (colSelectable(col)) {
	                headerSelectionRange = rangeUtil.createFromPoints(0, col, Infinity, col);
	            }
	        } else if (col < 0) {
	            headerSelectionRange = rangeUtil.createFromPoints(row, 0, row, Infinity);
	        }
	        return headerSelectionRange;
	    }
	
	    function findSelectionByRange(range) {
	        return model.getAllSelections().filter(function (selection) {
	            return rangeUtil.equal(selection, range);
	        })[0];
	    }
	
	    function addOrSetSelection(selection) {
	        if (!selectionIsFocus(model.selection)) {
	            addSelection(selection);
	        } else {
	            model.setSelection(selection);
	        }
	    }
	
	    function removeFullRowOrColFromSelection(selection, rowOrCol) {
	
	        if (rowOrCol.width === Infinity) {
	            // row
	            var newSelections = [];
	            if (selection.top < rowOrCol.top) {
	                // we need a selection for the top portion
	                var newSelection = {
	                    top: selection.top,
	                    height: rowOrCol.top - selection.top,
	                    left: selection.left,
	                    width: selection.width
	                };
	                newSelections.push(newSelection);
	            }
	
	            var bottomRow = selection.top + selection.height - 1;
	            if (bottomRow > rowOrCol.top + rowOrCol.height - 1) {
	                // we need a selection for the bottom portion
	                newSelections.push({
	                    top: rowOrCol.top + rowOrCol.height,
	                    height: bottomRow - (rowOrCol.top + rowOrCol.height - 1),
	                    left: selection.left,
	                    width: selection.width
	                });
	            }
	            removeSelection(selection);
	            newSelections.forEach(addOrSetSelection);
	            syncSelectionToHeaders();
	        }
	
	        if (rowOrCol.height === Infinity) {// col
	        }
	    }
	
	    function findFullRowOrColSelections(range) {
	        return model.getAllSelections().filter(function (selection) {
	            return selection.height === Infinity && selection.top === 0 && rangeUtil.intersect([selection.left, selection.width], [range.left, range.width]) || selection.width === Infinity && selection.left === 0 && rangeUtil.intersect([selection.top, selection.height], [range.top, range.height]);
	        });
	    }
	
	    function addSelection(range) {
	        model.otherSelections.push(createAndAddSelectionDecorator(range.top, range.left, range.height, range.width));
	    }
	
	    model._rowSelectionClasses = [];
	    model._colSelectionClasses = [];
	    // row col selection
	    function handleRowColSelectionChange(rowOrCol) {
	        var decoratorsField = '_' + rowOrCol + 'SelectionClasses';
	        model[decoratorsField].forEach(function (selectionDecorator) {
	            grid.cellClasses.remove(selectionDecorator);
	        });
	        model[decoratorsField] = [];
	
	        if (grid[rowOrCol + 'Model'].allSelected()) {
	            var top = rowOrCol === 'row' ? Infinity : 0;
	            var left = rowOrCol === 'col' ? Infinity : 0;
	            var decorator = grid.cellClasses.create(top, left, 'selected', 1, 1, 'virtual');
	            grid.cellClasses.add(decorator);
	            model[decoratorsField].push(decorator);
	        } else {
	            grid[rowOrCol + 'Model'].getSelected().forEach(function (index) {
	                var virtualIndex = grid[rowOrCol + 'Model'].toVirtual(index);
	                var top = rowOrCol === 'row' ? virtualIndex : 0;
	                var left = rowOrCol === 'col' ? virtualIndex : 0;
	                var decorator = grid.cellClasses.create(top, left, 'selected', 1, 1, 'virtual');
	                grid.cellClasses.add(decorator);
	                model[decoratorsField].push(decorator);
	            });
	        }
	    }
	
	    grid.eventLoop.bind('grid-row-selection-change', function () {
	        handleRowColSelectionChange('row');
	    });
	
	    grid.eventLoop.bind('grid-col-selection-change', function () {
	        handleRowColSelectionChange('col');
	    });
	
	    function createAndAddSelectionDecorator() {
	        var selection = grid.decorators.create.apply(this, arguments);
	        var defaultRender = selection.render;
	        selection.render = function () {
	            var div = defaultRender();
	            div.setAttribute('class', 'grid-selection');
	            return div;
	        };
	        grid.decorators.add(selection);
	        return selection;
	    }
	
	    var selection = createAndAddSelectionDecorator();
	
	    function syncSelectionToHeaders() {
	        grid.colModel.clearSelected(true);
	        grid.rowModel.clearSelected(true);
	        model.getAllSelections().forEach(function (selection) {
	            if (selection) {
	                maybeSelectHeaderFromSelection(selection);
	            }
	        });
	    }
	
	    model.getAllSelections = function () {
	        var selections = [];
	        if (model.selection) {
	            selections.push(model.selection);
	        }
	        return selections.concat(model.otherSelections);
	    };
	
	    function maybeSelectHeaderFromSelection(range, deselect) {
	        var indexes;
	        if (range.top === 0 && range.height === Infinity) {
	            indexes = grid.data.col.indexes({
	                from: range.left,
	                length: range.width
	            });
	            if (deselect) {
	                grid.colModel.deselect(indexes);
	            } else {
	                grid.colModel.select(indexes);
	            }
	        }
	        if (range.left === 0 && range.width === Infinity) {
	            indexes = grid.data.row.indexes({
	                from: range.top,
	                length: range.height
	            });
	            if (deselect) {
	                grid.rowModel.deselect(indexes);
	            } else {
	                grid.rowModel.select(indexes);
	            }
	        }
	    }
	
	    function selectionIsFocus(selection) {
	        return selection.height === 1 && selection.width === 1 && !model.otherSelections.length;
	    }
	
	    model.setSelection = function setSelection(newSelection) {
	        var height = newSelection.height;
	        var width = newSelection.width;
	        if (selectionIsFocus(newSelection)) {
	            height = -1;
	            width = -1;
	        }
	        selection.top = newSelection.top;
	        selection.left = newSelection.left;
	        selection.height = height;
	        selection.width = width;
	        // select the columns to match
	        syncSelectionToHeaders();
	    };
	
	    function setSelectionToFocus() {
	        model.setSelection({
	            top: model.focus.row,
	            left: model.focus.col,
	            height: 1,
	            width: 1
	        });
	    }
	
	    function clearOtherSelections() {
	        grid.decorators.remove(model.otherSelections);
	        model.otherSelections = [];
	        syncSelectionToHeaders();
	    }
	
	    function removeSelection(selection) {
	        if (rangeUtil.equal(selection, model.selection)) {
	            if (model.otherSelections.length) {
	                var lastSelection = model.otherSelections.pop();
	                grid.decorators.remove(lastSelection);
	                model.setSelection(lastSelection);
	            } else {
	                setSelectionToFocus();
	            }
	        } else {
	            var index = model.otherSelections.indexOf(selection);
	            if (index !== -1) {
	                model.otherSelections.splice(index, 1);
	                grid.decorators.remove(selection);
	            }
	        }
	        syncSelectionToHeaders();
	    }
	
	    function setSelectionFromPoints(fromRow, fromCol, toRow, toCol, dontClearOthers) {
	        if (!dontClearOthers) {
	            clearOtherSelections();
	        }
	        toRow = util.clamp(toRow, 0, Infinity);
	        toCol = util.clamp(toCol, 0, Infinity);
	        var newSelection = rangeUtil.createFromPoints(fromRow, fromCol, toRow, toCol);
	        model.setSelection(newSelection);
	    }
	
	    selection._onDragStart = function (e) {
	        if (!isNavableMouseEvent(e)) {
	            return;
	        }
	        if (e.enableAutoScroll) {
	            e.enableAutoScroll();
	        }
	        var fromRow = model.focus.row;
	        var fromCol = model.focus.col;
	        var startCol = e.col;
	        var startRow = e.row;
	        var wasSelected;
	        var toRow, toCol;
	        if (startRow < 0) {
	            // these are notted because mousedwon actually inverts the intial selection
	            wasSelected = !grid.data.col.get(startCol).selected;
	            fromRow = 0;
	            toRow = Infinity;
	        }
	        if (startCol < 0) {
	            // these are notted because mousedwon actually inverts the intial selection
	            wasSelected = !grid.data.row.get(startRow).selected;
	            fromCol = 0;
	            toCol = Infinity;
	        }
	        var unbindDrag = grid.eventLoop.bind('grid-cell-drag', function (e) {
	            toRow = toRow !== Infinity ? e.row : toRow;
	            toCol = toCol !== Infinity ? e.col : toCol;
	            if (toCol !== Infinity && !colSelectable(toCol)) {
	                return;
	            }
	
	            var fixedRows = grid.rowModel.numFixed(true);
	            if (startRow < fixedRows && toRow > fixedRows && toRow !== Infinity) {
	                startRow = toRow = grid.rowModel.numFixed();
	                grid.cellScrollModel.scrollTo(0, grid.cellScrollModel.col);
	            }
	            var fixedCols = grid.colModel.numFixed(true);
	            if (startCol < fixedCols && toCol > fixedCols && toCol !== Infinity) {
	                startCol = toCol = grid.colModel.numFixed();
	                grid.cellScrollModel.scrollTo(grid.cellScrollModel.row, 0);
	            }
	            if (isNaN(toRow) || isNaN(toCol)) {
	                return; //don't try to select when NaN
	            }
	            selectFromFocusToCell(fromRow, fromCol, toRow, toCol, true, wasSelected); // always pass true because if it was to be cleared mousedown should have handled that
	        });
	        var unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
	            unbindDrag();
	            unbindDragEnd();
	        });
	    };
	
	    grid.eventLoop.bind('grid-drag-start', selection._onDragStart);
	    setSelectionToFocus();
	    model._selectionDecorator = selection;
	
	    Object.defineProperty(model, 'selection', {
	        get: function get() {
	            if (selection.height === -1) {
	                // cleared selection default to focus
	                return {
	                    top: model.focus.row,
	                    left: model.focus.col,
	                    height: 1,
	                    width: 1
	                };
	            }
	            return selection;
	        }
	    });
	
	    model.getAllSelectedRanges = function () {
	        var selectionRange = grid.navigationModel.selection;
	        // valid selection range cannot go to -1
	        if (selectionRange.top === -1) {
	            selectionRange = {
	                top: grid.navigationModel.focus.row,
	                left: grid.navigationModel.focus.col,
	                width: 1,
	                height: 1
	            };
	        }
	        return [selectionRange].concat(model.otherSelections);
	    };
	
	    model.clearSelection = function () {
	        clearOtherSelections();
	        setSelectionToFocus();
	    };
	
	    function clearSelectionFromModelChange(e) {
	        if (e.action === 'size') {
	            // don't clear for resize but all other changes for now will clear selection
	            return;
	        }
	        model.clearSelection();
	    }
	
	    grid.eventLoop.bind('grid-col-change', clearSelectionFromModelChange);
	    grid.eventLoop.bind('grid-row-change', clearSelectionFromModelChange);
	    return model;
	};

/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var util = __webpack_require__(3);
	var debounce = __webpack_require__(13);
	var capitalize = __webpack_require__(9);
	var dirtyClean = __webpack_require__(6);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	    var pixelDirtyClean = dirtyClean(grid);
	    var offsetDirtyClean = dirtyClean(grid);
	    var model = {
	        top: 0,
	        left: 0,
	        offsetTop: 0,
	        offsetLeft: 0,
	        maxScroll: {},
	        maxIsAllTheWayFor: {
	            height: false,
	            width: false
	        },
	        isDirty: pixelDirtyClean.isDirty,
	        isOffsetDirty: offsetDirtyClean.isDirty
	    };
	    var scrollBarWidth = 10;
	    var intentionAngle = 30;
	
	    grid.eventLoop.bind('grid-virtual-pixel-cell-change', function () {
	        var scrollHeight = grid.virtualPixelCellModel.totalHeight() - grid.virtualPixelCellModel.fixedHeight();
	        var scrollWidth = grid.virtualPixelCellModel.totalWidth() - grid.virtualPixelCellModel.fixedWidth();
	        model.setScrollSize(scrollHeight, scrollWidth);
	        cacheMaxScroll();
	        sizeScrollBars();
	        updatePixelOffsets();
	    });
	
	    grid.eventLoop.bind('grid-viewport-change', function () {
	        cacheMaxScroll();
	        sizeScrollBars();
	        updatePixelOffsets();
	    });
	
	    function cacheMaxScroll() {
	        model.maxScroll.height = getMaxScroll('height');
	        model.maxScroll.width = getMaxScroll('width');
	    }
	
	    function checkAngle(side1, side2) {
	        var angle = Math.abs(Math.atan(side1 / side2) * 57.29);
	        return angle < intentionAngle;
	    }
	
	    // assumes a standardized wheel event that we create through the mousewheel package
	    grid.eventLoop.bind('mousewheel', function handleMouseWheel(e) {
	        if (e.target !== grid.container && getScrollElementFromTarget(e.target, grid.container) !== grid.container) {
	            return;
	        }
	
	        var deltaY = e.deltaY;
	        var deltaX = e.deltaX;
	        if (checkAngle(deltaY, deltaX)) {
	            deltaY = 0;
	        } else if (checkAngle(deltaX, deltaY)) {
	            deltaX = 0;
	        }
	
	        model.scrollTo(model.top - deltaY, model.left - deltaX, false);
	        e.preventDefault();
	    });
	
	    model.setScrollSize = function (h, w) {
	        model.height = h;
	        model.width = w;
	    };
	
	    function notifyListeners() {
	        // TODO: possibly keep track of delta since last update and send it along. for now, no
	        grid.eventLoop.fire('grid-pixel-scroll');
	
	        // update the cell scroll
	        var scrollTop = model.top;
	        var row = grid.virtualPixelCellModel.getRow(scrollTop + grid.virtualPixelCellModel.fixedHeight()) - grid.rowModel.numFixed();
	
	        var scrollLeft = model.left;
	        var col = grid.virtualPixelCellModel.getCol(scrollLeft + grid.virtualPixelCellModel.fixedWidth()) - grid.colModel.numFixed();
	
	        grid.cellScrollModel.scrollTo(row, col, undefined, true);
	        pixelDirtyClean.setDirty();
	    }
	
	    function updatePixelOffsets() {
	        var modTopPixels = 0;
	        var modLeftPixels = 0;
	        if (!grid.opts.snapToCell) {
	            var fixedHeight = grid.virtualPixelCellModel.fixedHeight();
	            var fixedWidth = grid.virtualPixelCellModel.fixedWidth();
	            var row = grid.virtualPixelCellModel.getRow(grid.pixelScrollModel.top + fixedHeight) - grid.rowModel.numFixed();
	            var top = grid.virtualPixelCellModel.height(grid.rowModel.numFixed(), row + grid.rowModel.numFixed() - 1);
	            var otherTop = grid.pixelScrollModel.top;
	            modTopPixels = top - otherTop;
	            var col = grid.virtualPixelCellModel.getCol(grid.pixelScrollModel.left + fixedWidth) - grid.colModel.numFixed();
	            var left = grid.virtualPixelCellModel.width(grid.colModel.numFixed(), col + grid.colModel.numFixed() - 1);
	
	            modLeftPixels = left - grid.pixelScrollModel.left;
	        }
	        if (model.offsetTop !== modTopPixels || model.offsetLeft !== modLeftPixels) {
	            offsetDirtyClean.setDirty();
	        }
	        model.offsetTop = modTopPixels;
	        model.offsetLeft = modLeftPixels;
	    }
	
	    model.scrollTo = function (top, left, dontNotify) {
	        model.top = util.clamp(top, 0, model.maxScroll.height);
	        model.left = util.clamp(left, 0, model.maxScroll.width);
	        positionScrollBars();
	        updatePixelOffsets();
	
	        if (!dontNotify) {
	            notifyListeners();
	        }
	    };
	
	    /* SCROLL BAR LOGIC */
	    function getScrollPositionFromReal(scrollBarRealClickCoord, heightWidth, vertHorz) {
	        var scrollBarTopClick = scrollBarRealClickCoord - grid.virtualPixelCellModel['fixed' + capitalize(heightWidth)]();
	        var scrollRatio = scrollBarTopClick / getMaxScrollBarCoord(heightWidth, vertHorz);
	        var scrollCoord = scrollRatio * model.maxScroll[heightWidth];
	        return scrollCoord;
	    }
	
	    function makeScrollBarDecorator(isHorz) {
	        var decorator = grid.decorators.create();
	        decorator.fixed = true;
	        var xOrY = isHorz ? 'X' : 'Y';
	        var heightWidth = isHorz ? 'width' : 'height';
	        var vertHorz = isHorz ? 'horz' : 'vert';
	        var gridCoordField = 'grid' + xOrY;
	        var layerCoordField = 'layer' + xOrY;
	        var viewPortClampFn = grid.viewPort['clamp' + xOrY];
	
	        decorator.postRender = function (scrollBarElem) {
	            scrollBarElem.setAttribute('class', 'grid-scroll-bar');
	            decorator._onDragStart = function (e) {
	                if (e.target !== scrollBarElem) {
	                    return;
	                }
	                var scrollBarOffset = e[layerCoordField];
	
	                decorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
	                    grid.eventLoop.stopBubbling(e);
	                    var gridCoord = viewPortClampFn(e[gridCoordField]);
	                    var scrollBarRealClickCoord = gridCoord - scrollBarOffset;
	                    var scrollCoord = getScrollPositionFromReal(scrollBarRealClickCoord, heightWidth, vertHorz);
	                    if (isHorz) {
	                        model.scrollTo(model.top, scrollCoord);
	                    } else {
	                        model.scrollTo(scrollCoord, model.left);
	                    }
	                });
	
	                decorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function () {
	                    decorator._unbindDrag();
	                    decorator._unbindDragEnd();
	                });
	
	                e.stopPropagation();
	            };
	
	            grid.eventLoop.bind('grid-drag-start', scrollBarElem, decorator._onDragStart);
	            grid.eventLoop.bind('mousedown', scrollBarElem, function (e) {
	                grid.eventLoop.stopBubbling(e);
	            });
	
	            return scrollBarElem;
	        };
	
	        decorator.units = 'px';
	        decorator.space = 'real';
	
	        return decorator;
	    }
	
	    model.vertScrollBar = makeScrollBarDecorator();
	    model.horzScrollBar = makeScrollBarDecorator(true);
	    model.vertScrollBar.width = scrollBarWidth;
	    model.horzScrollBar.height = scrollBarWidth;
	
	    function getMaxScroll(heightWidth) {
	        var rowOrCol = heightWidth === 'height' ? 'row' : 'col';
	        if (model.maxIsAllTheWayFor[heightWidth]) {
	            return Math.max(0, model[heightWidth] - grid.virtualPixelCellModel[heightWidth](grid[rowOrCol + 'Model'].length(true) - 1));
	        }
	
	        var scrollLength = model[heightWidth];
	        var viewScrollHeightOrWidth = getViewScrollHeightOrWidth(heightWidth);
	
	        if (scrollLength <= viewScrollHeightOrWidth) {
	            return 0;
	        }
	
	        var firstScrollableCell = grid[rowOrCol + 'Model'].numFixed();
	        while (scrollLength > viewScrollHeightOrWidth - 10 && firstScrollableCell < grid.virtual[rowOrCol].count()) {
	            scrollLength -= grid.virtualPixelCellModel[heightWidth](firstScrollableCell);
	            firstScrollableCell++;
	        }
	        return model[heightWidth] - scrollLength;
	    }
	
	    model._getMaxScroll = getMaxScroll;
	
	    function getScrollRatioFromVirtualScrollCoords(scroll, heightWidth) {
	        var maxScroll = model.maxScroll[heightWidth];
	        var scrollRatio = scroll / maxScroll;
	        return scrollRatio;
	    }
	
	    function getMaxScrollBarCoord(heightWidth, vertHorz) {
	        return getViewScrollHeightOrWidth(heightWidth) - model[vertHorz + 'ScrollBar'][heightWidth];
	    }
	
	    function getRealScrollBarPosition(scroll, heightWidth, vertHorz) {
	        var scrollRatio = getScrollRatioFromVirtualScrollCoords(scroll, heightWidth);
	        var maxScrollBarScroll = getMaxScrollBarCoord(heightWidth, vertHorz);
	        //in scroll bar coords
	        var scrollBarCoord = scrollRatio * maxScrollBarScroll;
	        //add the fixed height to translate back into real coords
	        return scrollBarCoord + grid.virtualPixelCellModel['fixed' + capitalize(heightWidth)]();
	    }
	
	    model._getRealScrollBarPosition = getRealScrollBarPosition;
	    model._getScrollPositionFromReal = getScrollPositionFromReal;
	
	    function calcScrollBarRealTop() {
	        return getRealScrollBarPosition(model.top, 'height', 'vert');
	    }
	
	    function calcScrollBarRealLeft() {
	        return getRealScrollBarPosition(model.left, 'width', 'horz');
	    }
	
	    function positionScrollBars() {
	        model.vertScrollBar.top = calcScrollBarRealTop();
	        model.horzScrollBar.left = calcScrollBarRealLeft();
	    }
	
	    function getViewScrollHeightOrWidth(heightWidth) {
	        return grid.viewPort[heightWidth] - grid.virtualPixelCellModel['fixed' + capitalize(heightWidth)]();
	    }
	
	    function getScrollableViewWidth() {
	        return getViewScrollHeightOrWidth('width');
	    }
	
	    function getScrollableViewHeight() {
	        return getViewScrollHeightOrWidth('height');
	    }
	
	    function sizeScrollBars() {
	        model.vertScrollBar.left = grid.viewPort.width - scrollBarWidth;
	        model.horzScrollBar.top = grid.viewPort.height - scrollBarWidth;
	        var scrollableViewHeight = getScrollableViewHeight();
	        var scrollableViewWidth = getScrollableViewWidth();
	        model.vertScrollBar.height = Math.max(scrollableViewHeight / grid.virtualPixelCellModel.totalHeight() * scrollableViewHeight, 20);
	        model.horzScrollBar.width = Math.max(scrollableViewWidth / grid.virtualPixelCellModel.totalWidth() * scrollableViewWidth, 20);
	        if (model.vertScrollBar.height >= scrollableViewHeight) {
	            model.vertScrollBar.height = -1;
	        }
	
	        if (model.horzScrollBar.width >= scrollableViewWidth) {
	            model.horzScrollBar.width = -1;
	        }
	        positionScrollBars();
	    }
	
	    grid.decorators.add(model.vertScrollBar);
	    grid.decorators.add(model.horzScrollBar);
	    /* END SCROLL BAR LOGIC */
	
	    function getScrollElementFromTarget(elem, stopParent) {
	        stopParent = stopParent || document;
	        if (!elem) {
	            return stopParent;
	        }
	
	        var position = elem.style.position,
	            excludeStaticParent = position === 'absolute',
	            overflowRegex = /(auto|scroll)/,
	            scrollParent = elem;
	
	        while (!!scrollParent && scrollParent !== stopParent) {
	            if (!(excludeStaticParent && scrollParent.style.position === 'static')) {
	                var computedStyle = getComputedStyle(scrollParent);
	
	                if (overflowRegex.test(computedStyle.overflow + computedStyle.overflowY + computedStyle.overflowX)) {
	                    break;
	                }
	            }
	
	            scrollParent = scrollParent.parentElement;
	        }
	
	        return position === 'fixed' || !scrollParent || scrollParent === elem ? elem.ownerDocument || stopParent : scrollParent;
	    }
	
	    return model;
	};

/***/ },
/* 46 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports = function (_grid) {
	    var grid = _grid;
	
	    var api = {
	        _decorators: {}
	    };
	
	    function setColShowing(col) {
	        grid.colModel.get(col).hidden = false;
	    }
	
	    function doWhileHidden(col, fn, inc) {
	        var colDescriptor;
	        while ((colDescriptor = grid.colModel.get(col)) !== undefined && colDescriptor.hidden) {
	            if (fn) {
	                fn(col);
	            }
	            col = col + inc;
	        }
	        return col;
	    }
	
	    function createDecorator(col, right) {
	        var headerDecorator = grid.decorators.create(0, col, 1, 1, 'cell', 'virtual');
	
	        headerDecorator.postRender = function (div) {
	
	            if (right) {
	                div.style.transform = 'translate(50%, -50%)';
	                div.style.webkitTransform = 'translate(50%, -50%)';
	                div.style.removeProperty('left');
	            } else {
	                div.style.transform = 'translate(-50%, -50%)';
	                div.style.webkitTransform = 'translate(-50%, -50%)';
	                div.style.removeProperty('right');
	            }
	            div.style.removeProperty('bottom');
	            div.style.top = '50%';
	            div.setAttribute('class', 'show-hidden-cols');
	            div.setAttribute('dts', 'grid_column_unhide_btn');
	
	            grid.eventLoop.bind('click', div, function () {
	                var inc = right ? 1 : -1;
	                doWhileHidden(col + inc, setColShowing, inc);
	            });
	        };
	        return headerDecorator;
	    }
	
	    function maybeRemoveDecorator(col) {
	        if (api._decorators[col]) {
	            var decorator = api._decorators[col];
	            grid.decorators.remove(decorator);
	            api._decorators[col] = undefined;
	        }
	    }
	
	    grid.eventLoop.bind('grid-col-change', function (e) {
	        if (e.action === 'hide' || e.action === 'add') {
	            e.descriptors.forEach(function (descriptor) {
	                var col = descriptor.index;
	                if (!col && col !== 0) {
	                    return;
	                }
	                if (descriptor.hidden) {
	                    var decCol = col;
	                    var showingCol = doWhileHidden(col, undefined, -1);
	                    var rightSide = showingCol !== -1;
	                    if (!rightSide) {
	                        // we actually have to backtrack to the last showing column
	                        showingCol = doWhileHidden(col, undefined, 1);
	                    }
	                    decCol = showingCol;
	                    maybeRemoveDecorator(col);
	                    var decorator = createDecorator(decCol, rightSide);
	                    grid.decorators.add(decorator);
	                    api._decorators[col] = decorator;
	                } else {
	                    maybeRemoveDecorator(col);
	                }
	            });
	        }
	    });
	
	    return api;
	};

/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var key = __webpack_require__(35);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	
	    var api = {
	        annotateDecorator: annotateDecorator
	    };
	
	    function annotateDecorator(headerDecorator) {
	        var col = headerDecorator.left;
	        headerDecorator._dragLine = grid.decorators.create(0, undefined, Infinity, 1, 'px', 'real');
	        headerDecorator._dragLine.fixed = true;
	
	        headerDecorator._dragLine.postRender = function (div) {
	            div.setAttribute('class', 'grid-drag-line');
	        };
	
	        headerDecorator._onMousedown = function (e) {
	            //prevent mousedowns from getting to selection if they hit the dragline
	            grid.eventLoop.stopBubbling(e);
	        };
	
	        headerDecorator._onDragStart = function (e) {
	
	            grid.eventLoop.stopBubbling(e);
	
	            grid.decorators.add(headerDecorator._dragLine);
	
	            headerDecorator._unbindDrag = grid.eventLoop.bind('grid-drag', function (e) {
	                var minX = headerDecorator.getDecoratorLeft() + 22;
	                headerDecorator._dragLine.left = Math.max(e.gridX, minX);
	            });
	
	            headerDecorator._unbindKeyDown = grid.escapeStack.add(removeDecoratorsAndUnbind);
	
	            headerDecorator._unbindDragEnd = grid.eventLoop.bind('grid-drag-end', function (e) {
	                var newWidth = headerDecorator._dragLine.left - headerDecorator.getDecoratorLeft();
	                grid.view.col.get(col).width = newWidth;
	                grid.colModel.getSelected().forEach(function (dataIdx) {
	                    grid.data.col.get(dataIdx).width = newWidth;
	                });
	                removeDecoratorsAndUnbind();
	            });
	
	            function removeDecoratorsAndUnbind() {
	                grid.decorators.remove(headerDecorator._dragLine);
	                headerDecorator._unbindDrag();
	                headerDecorator._unbindDragEnd();
	                headerDecorator._unbindKeyDown && headerDecorator._unbindKeyDown();
	                return true; // for the escape stack
	            }
	        };
	
	        headerDecorator.postRender = function (div) {
	            div.style.transform = 'translateX(50%)';
	            div.style.webkitTransform = 'translateX(50%)';
	
	            div.style.removeProperty('left');
	            div.setAttribute('class', 'col-resize');
	            div.setAttribute('dts', 'grid_header_resize');
	
	            grid.eventLoop.bind('grid-drag-start', div, headerDecorator._onDragStart);
	            grid.eventLoop.bind('mousedown', div, headerDecorator._onMousedown);
	        };
	    }
	
	    __webpack_require__(48)(grid, api);
	
	    return api;
	};

/***/ },
/* 48 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports = function (_grid, model) {
	    var grid = _grid;
	
	    var api = model || {};
	    api._decorators = {};
	
	    function makeDecorator(col) {
	        var decorator = grid.decorators.create(0, col, 1, 1, 'cell', 'real');
	
	        decorator.getDecoratorLeft = function () {
	            var firstRect = decorator.boundingBox && decorator.boundingBox.getClientRects() && decorator.boundingBox.getClientRects()[0] || {};
	            return grid.viewPort.toGridX(firstRect.left) || 0;
	        };
	
	        if (api.annotateDecorator) {
	            api.annotateDecorator(decorator);
	        }
	
	        return decorator;
	    }
	
	    api.makeDecorator = api.makeDecorator || makeDecorator;
	
	    function ensureDecoratorPerCol() {
	        for (var c = 0; c < grid.viewPort.cols; c++) {
	            if (!api._decorators[c]) {
	                if (api.isNeeded && !api.isNeeded(c)) {
	                    continue;
	                }
	                var decorator = api.makeDecorator(c);
	                api._decorators[c] = decorator;
	                grid.decorators.add(decorator);
	            }
	        }
	    }
	
	    grid.eventLoop.bind('grid-viewport-change', function () {
	        ensureDecoratorPerCol();
	    });
	    ensureDecoratorPerCol();
	
	    return api;
	};

/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var tsv = __webpack_require__(50);
	var debounce = __webpack_require__(13);
	var innerText = __webpack_require__(51);
	
	module.exports = function (_grid) {
	    var grid = _grid;
	    var model = {};
	
	    function getCopyPasteRange() {
	        var selectionRange = grid.navigationModel.selection;
	        //valid selection range cannot go to -1
	        if (selectionRange.top === -1) {
	            selectionRange = {
	                top: grid.navigationModel.focus.row,
	                left: grid.navigationModel.focus.col,
	                width: 1,
	                height: 1
	            };
	        }
	        return selectionRange;
	    }
	
	    grid.eventLoop.bind('copy', function (e) {
	        if (!grid.focused) {
	            if (e.target === grid.textarea) {
	                e.preventDefault();
	            }
	            return;
	        }
	        // prepare for copy
	        var copyTable = document.createElement('table');
	        var tableBody = document.createElement('tbody');
	        copyTable.appendChild(tableBody);
	        var tsvData = [];
	        var selectionRange = getCopyPasteRange();
	        var gotNull = false;
	        grid.data.iterate(selectionRange, function () {
	            var row = document.createElement('tr');
	            tableBody.appendChild(row);
	            var array = [];
	            tsvData.push(array);
	            return {
	                row: row,
	                array: array
	            };
	        }, function (r, c, rowResult) {
	            var data = grid.dataModel.get(r, c, true);
	
	            // intentional == checks null or undefined
	            if (data == null) {
	                return gotNull = true; // this breaks the col loop
	            }
	            var td = document.createElement('td');
	            if (data.value) {
	                td.setAttribute('grid-data', JSON.stringify(data.value));
	            }
	            td.textContent = data.formatted || ' ';
	            td.innerHTML = td.innerHTML.replace(/\n/g, '<br>') || ' ';
	            rowResult.row.appendChild(td);
	            rowResult.array.push(data.formatted);
	        });
	        if (!gotNull) {
	            e.clipboardData.setData('text/plain', tsv.stringify(tsvData));
	            e.clipboardData.setData('text/html', copyTable.outerHTML);
	            e.preventDefault();
	            setTimeout(function () {
	                grid.eventLoop.fire('grid-copy');
	            }, 1);
	        }
	    });
	
	    function makePasteDataChange(r, c, data) {
	        var value, formatted;
	        if (typeof data === 'string') {
	            formatted = data;
	        } else {
	            value = data.value;
	            formatted = data.formatted;
	        }
	        return {
	            row: r,
	            col: c,
	            value: value,
	            formatted: formatted,
	            paste: true
	        };
	    }
	
	    grid.eventLoop.bind('paste', function (e) {
	        if (!grid.focused) {
	            return;
	        }
	        var selectionRange = getCopyPasteRange();
	        if (!e.clipboardData || !e.clipboardData.getData) {
	            console.warn('no clipboard data on paste event');
	            return;
	        }
	        var pasteData = tsv.parse(e.clipboardData.getData('text/plain'));
	        var pasteHtml = e.clipboardData.getData('text/html');
	        e.preventDefault();
	
	        setTimeout(function () {
	            var tempDiv = document.createElement('div');
	            if (pasteHtml.match(/<meta name=ProgId content=Excel.Sheet>/)) {
	                pasteHtml = pasteHtml.replace(/[\n\r]+  /g, ' ').replace(/[\n\r]+/g, '');
	            }
	            tempDiv.innerHTML = pasteHtml;
	            var table = tempDiv.querySelector('table');
	            if (table) {
	                table.style.whiteSpace = 'pre';
	                pasteData = [];
	                [].forEach.call(tempDiv.querySelectorAll('tr'), function (tr) {
	                    var row = [];
	                    pasteData.push(row);
	                    [].forEach.call(tr.querySelectorAll('td'), function (td) {
	                        var dataResult = {};
	                        var gridData = td.getAttribute('grid-data');
	                        if (gridData) {
	                            try {
	                                dataResult.value = JSON.parse(gridData);
	                            } catch (error) {
	                                console.warn('somehow couldn\'t parse grid data');
	                            }
	                        }
	                        var text = innerText(td);
	                        dataResult.formatted = text && text.trim();
	                        row.push(dataResult);
	                    });
	                });
	            }
	            var dataChanges = [];
	            var singlePasteValue;
	            if (pasteData.length === 1 && pasteData[0].length === 1) {
	                singlePasteValue = pasteData[0][0];
	            }
	
	            if (singlePasteValue) {
	                // this will do nothing if no other selections as it will be an empty array
	                var ranges = [selectionRange];
	                ranges = ranges.concat(grid.navigationModel.otherSelections);
	                ranges.forEach(function (range) {
	                    grid.data.iterate(range, function (r, c) {
	                        dataChanges.push(makePasteDataChange(r, c, singlePasteValue));
	                    });
	                });
	            } else {
	                var top = selectionRange.top;
	                var left = selectionRange.left;
	
	                pasteData.forEach(function (row, r) {
	                    var dataRow = r + top;
	                    if (dataRow > grid.data.row.count() - 1) {
	                        return;
	                    }
	                    row.forEach(function (pasteValue, c) {
	                        var dataCol = c + left;
	                        // intention == to match null and undefined
	                        if (pasteValue == undefined || dataCol > grid.data.col.count() - 1) {
	                            return;
	                        }
	                        dataChanges.push(makePasteDataChange(dataRow, dataCol, pasteValue));
	                    });
	                });
	                var newSelection = {
	                    top: top,
	                    left: left,
	                    height: pasteData.length,
	                    width: pasteData[0].length
	                };
	
	                grid.navigationModel.clearSelection();
	                grid.navigationModel.setSelection(newSelection);
	            }
	
	            grid.dataModel.set(dataChanges);
	        }, 1);
	    });
	
	    var maybeSelectText = debounce(function maybeSelectTextInner() {
	        if (!(grid.editModel && grid.editModel.editing) && grid.focused) {
	            grid.textarea.value = grid.dataModel.get(grid.navigationModel.focus.row, grid.navigationModel.focus.col).formatted || '.';
	            grid.textarea.select();
	        }
	    }, 1);
	
	    model._maybeSelectText = maybeSelectText;
	
	    grid.eventLoop.bind('keyup', function (e) {
	        maybeSelectText();
	    });
	    grid.eventLoop.bind('grid-focus', function (e) {
	        maybeSelectText();
	    });
	    grid.eventLoop.bind('mousedown', function (e) {
	        if (e.target !== grid.textarea) {
	            return;
	        }
	        maybeSelectText();
	    });
	    return model;
	};

/***/ },
/* 50 */
/***/ function(module, exports) {

	'use strict';
	
	module.exports.stringify = function (data) {
	    var string = '';
	    data.forEach(function (row, r) {
	        row.forEach(function (value, c) {
	            if (value.indexOf('\n') !== -1 || value.indexOf('\t') !== -1 || value.indexOf('"') !== -1) {
	                //replace " with "" to escape and wrap the whole value in quotes
	                value = '"' + value.replace(/"/g, '""') + '"';
	            }
	            string += value;
	            if (c !== row.length - 1) {
	                string += '\t';
	            }
	        });
	        if (r !== data.length - 1) {
	            string += '\n';
	        }
	    });
	    return string;
	};
	
	// ref: http://stackoverflow.com/a/1293163/2343
	// This will parse a delimited string into an array of
	// arrays. The default delimiter is the comma, but this
	// can be overriden in the second argument.
	function DSVToArray(strData, strDelimiter) {
	    // Check to see if the delimiter is defined. If not,
	    // then default to comma.
	    strDelimiter = strDelimiter || ",";
	
	    // Create a regular expression to parse the CSV values.
	    var objPattern = new RegExp(
	    // Delimiters.
	    "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +
	
	    // Quoted fields.
	    "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +
	
	    // Standard fields.
	    "([^\"\\" + strDelimiter + "\\r\\n]+))", "gi");
	
	    // Create an array to hold our data. Give the array
	    // a default empty first row.
	    var arrData = [[]];
	
	    // Create an array to hold our individual pattern
	    // matching groups.
	    var arrMatches = null;
	
	    // Keep looping over the regular expression matches
	    // until we can no longer find a match.
	    while (arrMatches = objPattern.exec(strData)) {
	
	        // Get the delimiter that was found.
	        var strMatchedDelimiter = arrMatches[1];
	
	        // Check to see if the given delimiter has a length
	        // (is not the start of string) and if it matches
	        // field delimiter. If id does not, then we know
	        // that this delimiter is a row delimiter.
	        if (strMatchedDelimiter.length && strMatchedDelimiter !== strDelimiter) {
	
	            // Since we have reached a new row of data,
	            // add an empty row to our data array.
	            arrData.push([]);
	        }
	
	        var strMatchedValue;
	
	        // Now that we have our delimiter out of the way,
	        // let's check to see which kind of value we
	        // captured (quoted or unquoted).
	        if (arrMatches[2]) {
	
	            // We found a quoted value. When we capture
	            // this value, unescape any double quotes.
	            strMatchedValue = arrMatches[2].replace(new RegExp("\"\"", "g"), "\"");
	        } else {
	
	            // We found a non-quoted value.
	            strMatchedValue = arrMatches[3];
	        }
	
	        // Now that we have our value string, let's add
	        // it to the data array.
	        arrData[arrData.length - 1].push(strMatchedValue);
	    }
	
	    // Return the parsed data.
	    return (arrData[0].length || !strData) && arrData || [[strData]];
	}
	
	module.exports.parse = function (string) {
	    return DSVToArray(string, '\t');
	};

/***/ },
/* 51 */
/***/ function(module, exports) {

	module.exports = function innerText(el) {
	  if (el.innerText) return el.innerText;
	  if (!window.getSelection) return 'ERROR: UUPS `window.getSelection` is not available.';
	
	  var selection = window.getSelection();
	  var ranges = [];
	  var text;
	
	  // Save existing selections.
	  for (var i = 0; i < selection.rangeCount; i++) {
	    ranges[i] = selection.getRangeAt(i);
	  }
	
	  // Deselect everything.
	  selection.removeAllRanges();
	
	  // Select `el` and all child nodes.
	  selection.selectAllChildren(el);
	
	  // Get the string representation of the selected nodes.
	  text = selection.toString();
	
	  // Deselect everything. Again.
	  selection.removeAllRanges();
	
	  // Restore all formerly existing selections.
	  for (var i = 0; i < ranges.length; i++) {
	    selection.addRange(ranges[i]);
	  }
	
	  // Oh look, this is what we wanted.
	  // String representation of the element, close to as rendered.
	  return text;
	
	};

/***/ }
/******/ ]);
//# sourceMappingURL=bundle.js.map