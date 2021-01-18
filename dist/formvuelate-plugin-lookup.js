/**
 * @formvuelate/plugin-lookup v1.2.2
 * (c) 2021 Marina Mosti <marina@mosti.com.mx>
 * @license MIT
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global['@formvuelate/pluginLookup'] = {})));
}(this, (function (exports) { 'use strict';

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 * IMPORTANT: all calls of this function must be prefixed with
 * \/\*#\_\_PURE\_\_\*\/
 * So that rollup can tree-shake them if necessary.
 */
function makeMap(str, expectsLowerCase) {
    var map = Object.create(null);
    var list = str.split(',');
    for (var i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase ? function (val) { return !!map[val.toLowerCase()]; } : function (val) { return !!map[val]; };
}

var GLOBALS_WHITE_LISTED = 'Infinity,undefined,NaN,isFinite,isNaN,parseFloat,parseInt,decodeURI,' +
    'decodeURIComponent,encodeURI,encodeURIComponent,Math,Number,Date,Array,' +
    'Object,Boolean,String,RegExp,Map,Set,JSON,Intl';
var isGloballyWhitelisted = /*#__PURE__*/ makeMap(GLOBALS_WHITE_LISTED);

/**
 * On the client we only need to offer special cases for boolean attributes that
 * have different names from their corresponding dom properties:
 * - itemscope -> N/A
 * - allowfullscreen -> allowFullscreen
 * - formnovalidate -> formNoValidate
 * - ismap -> isMap
 * - nomodule -> noModule
 * - novalidate -> noValidate
 * - readonly -> readOnly
 */
var specialBooleanAttrs = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly";
var isSpecialBooleanAttr = /*#__PURE__*/ makeMap(specialBooleanAttrs);
/**
 * The full list is needed during SSR to produce the correct initial markup.
 */
var isBooleanAttr = /*#__PURE__*/ makeMap(specialBooleanAttrs +
    ",async,autofocus,autoplay,controls,default,defer,disabled,hidden," +
    "loop,open,required,reversed,scoped,seamless," +
    "checked,muted,multiple,selected");
/**
 * CSS properties that accept plain numbers
 */
var isNoUnitNumericStyleProp = /*#__PURE__*/ makeMap("animation-iteration-count,border-image-outset,border-image-slice," +
    "border-image-width,box-flex,box-flex-group,box-ordinal-group,column-count," +
    "columns,flex,flex-grow,flex-positive,flex-shrink,flex-negative,flex-order," +
    "grid-row,grid-row-end,grid-row-span,grid-row-start,grid-column," +
    "grid-column-end,grid-column-span,grid-column-start,font-weight,line-clamp," +
    "line-height,opacity,order,orphans,tab-size,widows,z-index,zoom," +
    // SVG
    "fill-opacity,flood-opacity,stop-opacity,stroke-dasharray,stroke-dashoffset," +
    "stroke-miterlimit,stroke-opacity,stroke-width");
/**
 * Known attributes, this is used for stringification of runtime static nodes
 * so that we don't stringify bindings that cannot be set from HTML.
 * Don't also forget to allow `data-*` and `aria-*`!
 * Generated from https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes
 */
var isKnownAttr = /*#__PURE__*/ makeMap("accept,accept-charset,accesskey,action,align,allow,alt,async," +
    "autocapitalize,autocomplete,autofocus,autoplay,background,bgcolor," +
    "border,buffered,capture,challenge,charset,checked,cite,class,code," +
    "codebase,color,cols,colspan,content,contenteditable,contextmenu,controls," +
    "coords,crossorigin,csp,data,datetime,decoding,default,defer,dir,dirname," +
    "disabled,download,draggable,dropzone,enctype,enterkeyhint,for,form," +
    "formaction,formenctype,formmethod,formnovalidate,formtarget,headers," +
    "height,hidden,high,href,hreflang,http-equiv,icon,id,importance,integrity," +
    "ismap,itemprop,keytype,kind,label,lang,language,loading,list,loop,low," +
    "manifest,max,maxlength,minlength,media,min,multiple,muted,name,novalidate," +
    "open,optimum,pattern,ping,placeholder,poster,preload,radiogroup,readonly," +
    "referrerpolicy,rel,required,reversed,rows,rowspan,sandbox,scope,scoped," +
    "selected,shape,size,sizes,slot,span,spellcheck,src,srcdoc,srclang,srcset," +
    "start,step,style,summary,tabindex,target,title,translate,type,usemap," +
    "value,width,wrap");

function normalizeStyle(value) {
    if (isArray(value)) {
        var res = {};
        for (var i = 0; i < value.length; i++) {
            var item = value[i];
            var normalized = normalizeStyle(isString(item) ? parseStringStyle(item) : item);
            if (normalized) {
                for (var key in normalized) {
                    res[key] = normalized[key];
                }
            }
        }
        return res;
    }
    else if (isObject(value)) {
        return value;
    }
}
var listDelimiterRE = /;(?![^(]*\))/g;
var propertyDelimiterRE = /:(.+)/;
function parseStringStyle(cssText) {
    var ret = {};
    cssText.split(listDelimiterRE).forEach(function (item) {
        if (item) {
            var tmp = item.split(propertyDelimiterRE);
            tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
        }
    });
    return ret;
}
function normalizeClass(value) {
    var res = '';
    if (isString(value)) {
        res = value;
    }
    else if (isArray(value)) {
        for (var i = 0; i < value.length; i++) {
            res += normalizeClass(value[i]) + ' ';
        }
    }
    else if (isObject(value)) {
        for (var name in value) {
            if (value[name]) {
                res += name + ' ';
            }
        }
    }
    return res.trim();
}

// These tag configs are shared between compiler-dom and runtime-dom, so they
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element
var HTML_TAGS = 'html,body,base,head,link,meta,style,title,address,article,aside,footer,' +
    'header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,' +
    'figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,' +
    'data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,' +
    'time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,' +
    'canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,' +
    'th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,' +
    'option,output,progress,select,textarea,details,dialog,menu,' +
    'summary,template,blockquote,iframe,tfoot';
// https://developer.mozilla.org/en-US/docs/Web/SVG/Element
var SVG_TAGS = 'svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,' +
    'defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,' +
    'feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,' +
    'feDistanceLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,' +
    'feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,' +
    'fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,' +
    'foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,' +
    'mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,' +
    'polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,' +
    'text,textPath,title,tspan,unknown,use,view';
var VOID_TAGS = 'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr';
var isHTMLTag = /*#__PURE__*/ makeMap(HTML_TAGS);
var isSVGTag = /*#__PURE__*/ makeMap(SVG_TAGS);
var isVoidTag = /*#__PURE__*/ makeMap(VOID_TAGS);

var EMPTY_OBJ = Object.freeze({});
var EMPTY_ARR = Object.freeze([]);
var NOOP = function () { };
var onRE = /^on[^a-z]/;
var isOn = function (key) { return onRE.test(key); };
var isModelListener = function (key) { return key.startsWith('onUpdate:'); };
var extend = Object.assign;
var remove = function (arr, el) {
    var i = arr.indexOf(el);
    if (i > -1) {
        arr.splice(i, 1);
    }
};
var hasOwnProperty = Object.prototype.hasOwnProperty;
var hasOwn = function (val, key) { return hasOwnProperty.call(val, key); };
var isArray = Array.isArray;
var isMap = function (val) { return toTypeString(val) === '[object Map]'; };
var isSet = function (val) { return toTypeString(val) === '[object Set]'; };
var isFunction = function (val) { return typeof val === 'function'; };
var isString = function (val) { return typeof val === 'string'; };
var isSymbol = function (val) { return typeof val === 'symbol'; };
var isObject = function (val) { return val !== null && typeof val === 'object'; };
var isPromise = function (val) {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch);
};
var objectToString = Object.prototype.toString;
var toTypeString = function (value) { return objectToString.call(value); };
var toRawType = function (value) {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1);
};
var isIntegerKey = function (key) { return isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key; };
var isReservedProp = /*#__PURE__*/ makeMap(
// the leading comma is intentional so empty string "" is also included
',key,ref,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted');
var cacheStringFunction = function (fn) {
    var cache = Object.create(null);
    return (function (str) {
        var hit = cache[str];
        return hit || (cache[str] = fn(str));
    });
};
var camelizeRE = /-(\w)/g;
/**
 * @private
 */
var camelize = cacheStringFunction(function (str) {
    return str.replace(camelizeRE, function (_, c) { return (c ? c.toUpperCase() : ''); });
});
var hyphenateRE = /\B([A-Z])/g;
/**
 * @private
 */
var hyphenate = cacheStringFunction(function (str) { return str.replace(hyphenateRE, '-$1').toLowerCase(); });
/**
 * @private
 */
var capitalize = cacheStringFunction(function (str) { return str.charAt(0).toUpperCase() + str.slice(1); });
/**
 * @private
 */
var toHandlerKey = cacheStringFunction(function (str) { return (str ? ("on" + (capitalize(str))) : ""); });
// compare whether a value has changed, accounting for NaN.
var hasChanged = function (value, oldValue) { return value !== oldValue && (value === value || oldValue === oldValue); };
var toNumber = function (val) {
    var n = parseFloat(val);
    return isNaN(n) ? val : n;
};
var _globalThis;
var getGlobalThis = function () {
    return (_globalThis ||
        (_globalThis =
            typeof globalThis !== 'undefined'
                ? globalThis
                : typeof self !== 'undefined'
                    ? self
                    : typeof window !== 'undefined'
                        ? window
                        : typeof global !== 'undefined'
                            ? global
                            : {}));
};

var targetMap = new WeakMap();
var effectStack = [];
var activeEffect;
var ITERATE_KEY = Symbol('iterate');
var MAP_KEY_ITERATE_KEY = Symbol('Map key iterate');
function isEffect(fn) {
    return fn && fn._isEffect === true;
}
function effect(fn, options) {
    if ( options === void 0 ) options = EMPTY_OBJ;

    if (isEffect(fn)) {
        fn = fn.raw;
    }
    var effect = createReactiveEffect(fn, options);
    if (!options.lazy) {
        effect();
    }
    return effect;
}
function stop(effect) {
    if (effect.active) {
        cleanup(effect);
        if (effect.options.onStop) {
            effect.options.onStop();
        }
        effect.active = false;
    }
}
var uid$1$1 = 0;
function createReactiveEffect(fn, options) {
    var effect = function reactiveEffect() {
        if (!effect.active) {
            return options.scheduler ? undefined : fn();
        }
        if (!effectStack.includes(effect)) {
            cleanup(effect);
            try {
                enableTracking();
                effectStack.push(effect);
                activeEffect = effect;
                return fn();
            }
            finally {
                effectStack.pop();
                resetTracking();
                activeEffect = effectStack[effectStack.length - 1];
            }
        }
    };
    effect.id = uid$1$1++;
    effect.allowRecurse = !!options.allowRecurse;
    effect._isEffect = true;
    effect.active = true;
    effect.raw = fn;
    effect.deps = [];
    effect.options = options;
    return effect;
}
function cleanup(effect) {
    var deps = effect.deps;
    if (deps.length) {
        for (var i = 0; i < deps.length; i++) {
            deps[i].delete(effect);
        }
        deps.length = 0;
    }
}
var shouldTrack$1 = true;
var trackStack = [];
function pauseTracking() {
    trackStack.push(shouldTrack$1);
    shouldTrack$1 = false;
}
function enableTracking() {
    trackStack.push(shouldTrack$1);
    shouldTrack$1 = true;
}
function resetTracking() {
    var last = trackStack.pop();
    shouldTrack$1 = last === undefined ? true : last;
}
function track(target, type, key) {
    if (!shouldTrack$1 || activeEffect === undefined) {
        return;
    }
    var depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()));
    }
    var dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = new Set()));
    }
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        activeEffect.deps.push(dep);
        if (("development" !== 'production') && activeEffect.options.onTrack) {
            activeEffect.options.onTrack({
                effect: activeEffect,
                target: target,
                type: type,
                key: key
            });
        }
    }
}
function trigger$1(target, type, key, newValue, oldValue, oldTarget) {
    var depsMap = targetMap.get(target);
    if (!depsMap) {
        // never been tracked
        return;
    }
    var effects = new Set();
    var add = function (effectsToAdd) {
        if (effectsToAdd) {
            effectsToAdd.forEach(function (effect) {
                if (effect !== activeEffect || effect.allowRecurse) {
                    effects.add(effect);
                }
            });
        }
    };
    if (type === "clear" /* CLEAR */) {
        // collection being cleared
        // trigger all effects for target
        depsMap.forEach(add);
    }
    else if (key === 'length' && isArray(target)) {
        depsMap.forEach(function (dep, key) {
            if (key === 'length' || key >= newValue) {
                add(dep);
            }
        });
    }
    else {
        // schedule runs for SET | ADD | DELETE
        if (key !== void 0) {
            add(depsMap.get(key));
        }
        // also run for iteration key on ADD | DELETE | Map.SET
        switch (type) {
            case "add" /* ADD */:
                if (!isArray(target)) {
                    add(depsMap.get(ITERATE_KEY));
                    if (isMap(target)) {
                        add(depsMap.get(MAP_KEY_ITERATE_KEY));
                    }
                }
                else if (isIntegerKey(key)) {
                    // new index added to array -> length changes
                    add(depsMap.get('length'));
                }
                break;
            case "delete" /* DELETE */:
                if (!isArray(target)) {
                    add(depsMap.get(ITERATE_KEY));
                    if (isMap(target)) {
                        add(depsMap.get(MAP_KEY_ITERATE_KEY));
                    }
                }
                break;
            case "set" /* SET */:
                if (isMap(target)) {
                    add(depsMap.get(ITERATE_KEY));
                }
                break;
        }
    }
    var run = function (effect) {
        if (("development" !== 'production') && effect.options.onTrigger) {
            effect.options.onTrigger({
                effect: effect,
                target: target,
                key: key,
                type: type,
                newValue: newValue,
                oldValue: oldValue,
                oldTarget: oldTarget
            });
        }
        if (effect.options.scheduler) {
            effect.options.scheduler(effect);
        }
        else {
            effect();
        }
    };
    effects.forEach(run);
}

var builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol)
    .map(function (key) { return Symbol[key]; })
    .filter(isSymbol));
var get = /*#__PURE__*/ createGetter();
var shallowGet = /*#__PURE__*/ createGetter(false, true);
var readonlyGet = /*#__PURE__*/ createGetter(true);
var shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true);
var arrayInstrumentations = {};
['includes', 'indexOf', 'lastIndexOf'].forEach(function (key) {
    var method = Array.prototype[key];
    arrayInstrumentations[key] = function () {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        var arr = toRaw(this);
        for (var i = 0, l = this.length; i < l; i++) {
            track(arr, "get" /* GET */, i + '');
        }
        // we run the method using the original args first (which may be reactive)
        var res = method.apply(arr, args);
        if (res === -1 || res === false) {
            // if that didn't work, run it again using raw values.
            return method.apply(arr, args.map(toRaw));
        }
        else {
            return res;
        }
    };
});
['push', 'pop', 'shift', 'unshift', 'splice'].forEach(function (key) {
    var method = Array.prototype[key];
    arrayInstrumentations[key] = function () {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        pauseTracking();
        var res = method.apply(this, args);
        resetTracking();
        return res;
    };
});
function createGetter(isReadonly, shallow) {
    if ( isReadonly === void 0 ) isReadonly = false;
    if ( shallow === void 0 ) shallow = false;

    return function get(target, key, receiver) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        else if (key === "__v_raw" /* RAW */ &&
            receiver === (isReadonly ? readonlyMap : reactiveMap).get(target)) {
            return target;
        }
        var targetIsArray = isArray(target);
        if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
            return Reflect.get(arrayInstrumentations, key, receiver);
        }
        var res = Reflect.get(target, key, receiver);
        if (isSymbol(key)
            ? builtInSymbols.has(key)
            : key === "__proto__" || key === "__v_isRef") {
            return res;
        }
        if (!isReadonly) {
            track(target, "get" /* GET */, key);
        }
        if (shallow) {
            return res;
        }
        if (isRef(res)) {
            // ref unwrapping - does not apply for Array + integer key.
            var shouldUnwrap = !targetIsArray || !isIntegerKey(key);
            return shouldUnwrap ? res.value : res;
        }
        if (isObject(res)) {
            // Convert returned value into a proxy as well. we do the isObject check
            // here to avoid invalid value warning. Also need to lazy access readonly
            // and reactive here to avoid circular dependency.
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
var set = /*#__PURE__*/ createSetter();
var shallowSet = /*#__PURE__*/ createSetter(true);
function createSetter(shallow) {
    if ( shallow === void 0 ) shallow = false;

    return function set(target, key, value, receiver) {
        var oldValue = target[key];
        if (!shallow) {
            value = toRaw(value);
            if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                oldValue.value = value;
                return true;
            }
        }
        var hadKey = isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);
        var result = Reflect.set(target, key, value, receiver);
        // don't trigger if target is something up in the prototype chain of original
        if (target === toRaw(receiver)) {
            if (!hadKey) {
                trigger$1(target, "add" /* ADD */, key, value);
            }
            else if (hasChanged(value, oldValue)) {
                trigger$1(target, "set" /* SET */, key, value, oldValue);
            }
        }
        return result;
    };
}
function deleteProperty(target, key) {
    var hadKey = hasOwn(target, key);
    var oldValue = target[key];
    var result = Reflect.deleteProperty(target, key);
    if (result && hadKey) {
        trigger$1(target, "delete" /* DELETE */, key, undefined, oldValue);
    }
    return result;
}
function has(target, key) {
    var result = Reflect.has(target, key);
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
        track(target, "has" /* HAS */, key);
    }
    return result;
}
function ownKeys(target) {
    track(target, "iterate" /* ITERATE */, isArray(target) ? 'length' : ITERATE_KEY);
    return Reflect.ownKeys(target);
}
var mutableHandlers = {
    get: get,
    set: set,
    deleteProperty: deleteProperty,
    has: has,
    ownKeys: ownKeys
};
var readonlyHandlers = {
    get: readonlyGet,
    set: function set(target, key) {
        {
            console.warn(("Set operation on key \"" + (String(key)) + "\" failed: target is readonly."), target);
        }
        return true;
    },
    deleteProperty: function deleteProperty(target, key) {
        {
            console.warn(("Delete operation on key \"" + (String(key)) + "\" failed: target is readonly."), target);
        }
        return true;
    }
};
var shallowReactiveHandlers = extend({}, mutableHandlers, {
    get: shallowGet,
    set: shallowSet
});
// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.
var shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

var toReactive = function (value) { return isObject(value) ? reactive(value) : value; };
var toReadonly = function (value) { return isObject(value) ? readonly(value) : value; };
var toShallow = function (value) { return value; };
var getProto = function (v) { return Reflect.getPrototypeOf(v); };
function get$1(target, key, isReadonly, isShallow) {
    if ( isReadonly === void 0 ) isReadonly = false;
    if ( isShallow === void 0 ) isShallow = false;

    // #1772: readonly(reactive(Map)) should return readonly + reactive version
    // of the value
    target = target["__v_raw" /* RAW */];
    var rawTarget = toRaw(target);
    var rawKey = toRaw(key);
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, "get" /* GET */, key);
    }
    !isReadonly && track(rawTarget, "get" /* GET */, rawKey);
    var ref = getProto(rawTarget);
    var has = ref.has;
    var wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive;
    if (has.call(rawTarget, key)) {
        return wrap(target.get(key));
    }
    else if (has.call(rawTarget, rawKey)) {
        return wrap(target.get(rawKey));
    }
}
function has$1(key, isReadonly) {
    if ( isReadonly === void 0 ) isReadonly = false;

    var target = this["__v_raw" /* RAW */];
    var rawTarget = toRaw(target);
    var rawKey = toRaw(key);
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, "has" /* HAS */, key);
    }
    !isReadonly && track(rawTarget, "has" /* HAS */, rawKey);
    return key === rawKey
        ? target.has(key)
        : target.has(key) || target.has(rawKey);
}
function size(target, isReadonly) {
    if ( isReadonly === void 0 ) isReadonly = false;

    target = target["__v_raw" /* RAW */];
    !isReadonly && track(toRaw(target), "iterate" /* ITERATE */, ITERATE_KEY);
    return Reflect.get(target, 'size', target);
}
function add(value) {
    value = toRaw(value);
    var target = toRaw(this);
    var proto = getProto(target);
    var hadKey = proto.has.call(target, value);
    target.add(value);
    if (!hadKey) {
        trigger$1(target, "add" /* ADD */, value, value);
    }
    return this;
}
function set$1(key, value) {
    value = toRaw(value);
    var target = toRaw(this);
    var ref = getProto(target);
    var has = ref.has;
    var get = ref.get;
    var hadKey = has.call(target, key);
    if (!hadKey) {
        key = toRaw(key);
        hadKey = has.call(target, key);
    }
    else {
        checkIdentityKeys(target, has, key);
    }
    var oldValue = get.call(target, key);
    target.set(key, value);
    if (!hadKey) {
        trigger$1(target, "add" /* ADD */, key, value);
    }
    else if (hasChanged(value, oldValue)) {
        trigger$1(target, "set" /* SET */, key, value, oldValue);
    }
    return this;
}
function deleteEntry(key) {
    var target = toRaw(this);
    var ref = getProto(target);
    var has = ref.has;
    var get = ref.get;
    var hadKey = has.call(target, key);
    if (!hadKey) {
        key = toRaw(key);
        hadKey = has.call(target, key);
    }
    else {
        checkIdentityKeys(target, has, key);
    }
    var oldValue = get ? get.call(target, key) : undefined;
    // forward the operation before queueing reactions
    var result = target.delete(key);
    if (hadKey) {
        trigger$1(target, "delete" /* DELETE */, key, undefined, oldValue);
    }
    return result;
}
function clear() {
    var target = toRaw(this);
    var hadItems = target.size !== 0;
    var oldTarget = isMap(target)
            ? new Map(target)
            : new Set(target);
    // forward the operation before queueing reactions
    var result = target.clear();
    if (hadItems) {
        trigger$1(target, "clear" /* CLEAR */, undefined, undefined, oldTarget);
    }
    return result;
}
function createForEach(isReadonly, isShallow) {
    return function forEach(callback, thisArg) {
        var observed = this;
        var target = observed["__v_raw" /* RAW */];
        var rawTarget = toRaw(target);
        var wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive;
        !isReadonly && track(rawTarget, "iterate" /* ITERATE */, ITERATE_KEY);
        return target.forEach(function (value, key) {
            // important: make sure the callback is
            // 1. invoked with the reactive map as `this` and 3rd arg
            // 2. the value received should be a corresponding reactive/readonly.
            return callback.call(thisArg, wrap(value), wrap(key), observed);
        });
    };
}
function createIterableMethod(method, isReadonly, isShallow) {
    return function () {
        var obj;

        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];
        var target = this["__v_raw" /* RAW */];
        var rawTarget = toRaw(target);
        var targetIsMap = isMap(rawTarget);
        var isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap);
        var isKeyOnly = method === 'keys' && targetIsMap;
        var innerIterator = target[method].apply(target, args);
        var wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive;
        !isReadonly &&
            track(rawTarget, "iterate" /* ITERATE */, isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
        // return a wrapped iterator which returns observed versions of the
        // values emitted from the real iterator
        return ( obj = {
            // iterator protocol
            next: function next() {
                var ref = innerIterator.next();
                var value = ref.value;
                var done = ref.done;
                return done
                    ? { value: value, done: done }
                    : {
                        value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                        done: done
                    };
            }
        }, obj[Symbol.iterator] = function () {
                return this;
            }, obj);
    };
}
function createReadonlyMethod(type) {
    return function () {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        {
            var key = args[0] ? ("on key \"" + (args[0]) + "\" ") : "";
            console.warn(((capitalize(type)) + " operation " + key + "failed: target is readonly."), toRaw(this));
        }
        return type === "delete" /* DELETE */ ? false : this;
    };
}
var mutableInstrumentations = {
    get: function get(key) {
        return get$1(this, key);
    },
    get size() {
        return size(this);
    },
    has: has$1,
    add: add,
    set: set$1,
    delete: deleteEntry,
    clear: clear,
    forEach: createForEach(false, false)
};
var shallowInstrumentations = {
    get: function get(key) {
        return get$1(this, key, false, true);
    },
    get size() {
        return size(this);
    },
    has: has$1,
    add: add,
    set: set$1,
    delete: deleteEntry,
    clear: clear,
    forEach: createForEach(false, true)
};
var readonlyInstrumentations = {
    get: function get(key) {
        return get$1(this, key, true);
    },
    get size() {
        return size(this, true);
    },
    has: function has(key) {
        return has$1.call(this, key, true);
    },
    add: createReadonlyMethod("add" /* ADD */),
    set: createReadonlyMethod("set" /* SET */),
    delete: createReadonlyMethod("delete" /* DELETE */),
    clear: createReadonlyMethod("clear" /* CLEAR */),
    forEach: createForEach(true, false)
};
var iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator];
iteratorMethods.forEach(function (method) {
    mutableInstrumentations[method] = createIterableMethod(method, false, false);
    readonlyInstrumentations[method] = createIterableMethod(method, true, false);
    shallowInstrumentations[method] = createIterableMethod(method, false, true);
});
function createInstrumentationGetter(isReadonly, shallow) {
    var instrumentations = shallow
        ? shallowInstrumentations
        : isReadonly
            ? readonlyInstrumentations
            : mutableInstrumentations;
    return function (target, key, receiver) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        else if (key === "__v_raw" /* RAW */) {
            return target;
        }
        return Reflect.get(hasOwn(instrumentations, key) && key in target
            ? instrumentations
            : target, key, receiver);
    };
}
var mutableCollectionHandlers = {
    get: createInstrumentationGetter(false, false)
};
var readonlyCollectionHandlers = {
    get: createInstrumentationGetter(true, false)
};
function checkIdentityKeys(target, has, key) {
    var rawKey = toRaw(key);
    if (rawKey !== key && has.call(target, rawKey)) {
        var type = toRawType(target);
        console.warn("Reactive " + type + " contains both the raw and reactive " +
            "versions of the same object" + (type === "Map" ? " as keys" : "") + ", " +
            "which can lead to inconsistencies. " +
            "Avoid differentiating between the raw and reactive versions " +
            "of an object and only use the reactive version if possible.");
    }
}

var reactiveMap = new WeakMap();
var readonlyMap = new WeakMap();
function targetTypeMap(rawType) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return 1 /* COMMON */;
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return 2 /* COLLECTION */;
        default:
            return 0 /* INVALID */;
    }
}
function getTargetType(value) {
    return value["__v_skip" /* SKIP */] || !Object.isExtensible(value)
        ? 0 /* INVALID */
        : targetTypeMap(toRawType(value));
}
function reactive(target) {
    // if trying to observe a readonly proxy, return the readonly version.
    if (target && target["__v_isReadonly" /* IS_READONLY */]) {
        return target;
    }
    return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers);
}
/**
 * Creates a readonly copy of the original object. Note the returned copy is not
 * made reactive, but `readonly` can be called on an already reactive object.
 */
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers);
}
/**
 * Returns a reactive-copy of the original object, where only the root level
 * properties are readonly, and does NOT unwrap refs nor recursively convert
 * returned properties.
 * This is used for creating the props proxy object for stateful components.
 */
function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers, readonlyCollectionHandlers);
}
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers) {
    if (!isObject(target)) {
        {
            console.warn(("value cannot be made reactive: " + (String(target))));
        }
        return target;
    }
    // target is already a Proxy, return it.
    // exception: calling readonly() on a reactive object
    if (target["__v_raw" /* RAW */] &&
        !(isReadonly && target["__v_isReactive" /* IS_REACTIVE */])) {
        return target;
    }
    // target already has corresponding Proxy
    var proxyMap = isReadonly ? readonlyMap : reactiveMap;
    var existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy;
    }
    // only a whitelist of value types can be observed.
    var targetType = getTargetType(target);
    if (targetType === 0 /* INVALID */) {
        return target;
    }
    var proxy = new Proxy(target, targetType === 2 /* COLLECTION */ ? collectionHandlers : baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
}
function isReactive(value) {
    if (isReadonly(value)) {
        return isReactive(value["__v_raw" /* RAW */]);
    }
    return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}
function isReadonly(value) {
    return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
function toRaw(observed) {
    return ((observed && toRaw(observed["__v_raw" /* RAW */])) || observed);
}
var convert = function (val) { return isObject(val) ? reactive(val) : val; };
function isRef(r) {
    return Boolean(r && r.__v_isRef === true);
}
var RefImpl = function RefImpl(_rawValue, _shallow) {
    if ( _shallow === void 0 ) _shallow = false;

    this._rawValue = _rawValue;
    this._shallow = _shallow;
    this.__v_isRef = true;
    this._value = _shallow ? _rawValue : convert(_rawValue);
};

var prototypeAccessors = { value: { configurable: true } };
prototypeAccessors.value.get = function () {
    track(toRaw(this), "get" /* GET */, 'value');
    return this._value;
};
prototypeAccessors.value.set = function (newVal) {
    if (hasChanged(toRaw(newVal), this._rawValue)) {
        this._rawValue = newVal;
        this._value = this._shallow ? newVal : convert(newVal);
        trigger$1(toRaw(this), "set" /* SET */, 'value', newVal);
    }
};

Object.defineProperties( RefImpl.prototype, prototypeAccessors );
var CustomRefImpl = function CustomRefImpl(factory) {
    var this$1 = this;

    this.__v_isRef = true;
    var ref = factory(function () { return track(this$1, "get" /* GET */, 'value'); }, function () { return trigger$1(this$1, "set" /* SET */, 'value'); });
    var get = ref.get;
    var set = ref.set;
    this._get = get;
    this._set = set;
};

var prototypeAccessors$1 = { value: { configurable: true } };
prototypeAccessors$1.value.get = function () {
    return this._get();
};
prototypeAccessors$1.value.set = function (newVal) {
    this._set(newVal);
};

Object.defineProperties( CustomRefImpl.prototype, prototypeAccessors$1 );
var ObjectRefImpl = function ObjectRefImpl(_object, _key) {
    this._object = _object;
    this._key = _key;
    this.__v_isRef = true;
};

var prototypeAccessors$2 = { value: { configurable: true } };
prototypeAccessors$2.value.get = function () {
    return this._object[this._key];
};
prototypeAccessors$2.value.set = function (newVal) {
    this._object[this._key] = newVal;
};

Object.defineProperties( ObjectRefImpl.prototype, prototypeAccessors$2 );
var ComputedRefImpl = function ComputedRefImpl(getter, _setter, isReadonly) {
    var this$1 = this;

    this._setter = _setter;
    this._dirty = true;
    this.__v_isRef = true;
    this.effect = effect(getter, {
        lazy: true,
        scheduler: function () {
            if (!this$1._dirty) {
                this$1._dirty = true;
                trigger$1(toRaw(this$1), "set" /* SET */, 'value');
            }
        }
    });
    this["__v_isReadonly" /* IS_READONLY */] = isReadonly;
};

var prototypeAccessors$3 = { value: { configurable: true } };
prototypeAccessors$3.value.get = function () {
    if (this._dirty) {
        this._value = this.effect();
        this._dirty = false;
    }
    track(toRaw(this), "get" /* GET */, 'value');
    return this._value;
};
prototypeAccessors$3.value.set = function (newValue) {
    this._setter(newValue);
};

Object.defineProperties( ComputedRefImpl.prototype, prototypeAccessors$3 );
function computed$1(getterOrOptions) {
    var getter;
    var setter;
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions;
        setter = function () {
                console.warn('Write operation failed: computed value is readonly');
            };
    }
    else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter, setter, isFunction(getterOrOptions) || !getterOrOptions.set);
}

var stack = [];
function pushWarningContext(vnode) {
    stack.push(vnode);
}
function popWarningContext() {
    stack.pop();
}
function warn(msg) {
    var args = [], len = arguments.length - 1;
    while ( len-- > 0 ) args[ len ] = arguments[ len + 1 ];

    // avoid props formatting or warn handler tracking deps that might be mutated
    // during patch, leading to infinite recursion.
    pauseTracking();
    var instance = stack.length ? stack[stack.length - 1].component : null;
    var appWarnHandler = instance && instance.appContext.config.warnHandler;
    var trace = getComponentTrace();
    if (appWarnHandler) {
        callWithErrorHandling(appWarnHandler, instance, 11 /* APP_WARN_HANDLER */, [
            msg + args.join(''),
            instance && instance.proxy,
            trace
                .map(function (ref$$1) {
                  var vnode = ref$$1.vnode;

                  return ("at <" + (formatComponentName(instance, vnode.type)) + ">");
        })
                .join('\n'),
            trace
        ]);
    }
    else {
        var warnArgs = [("[Vue warn]: " + msg) ].concat( args);
        /* istanbul ignore if */
        if (trace.length &&
            // avoid spamming console during tests
            !false) {
            warnArgs.push.apply(warnArgs, [ "\n" ].concat( formatTrace(trace) ));
        }
        console.warn.apply(console, warnArgs);
    }
    resetTracking();
}
function getComponentTrace() {
    var currentVNode = stack[stack.length - 1];
    if (!currentVNode) {
        return [];
    }
    // we can't just use the stack because it will be incomplete during updates
    // that did not start from the root. Re-construct the parent chain using
    // instance parent pointers.
    var normalizedStack = [];
    while (currentVNode) {
        var last = normalizedStack[0];
        if (last && last.vnode === currentVNode) {
            last.recurseCount++;
        }
        else {
            normalizedStack.push({
                vnode: currentVNode,
                recurseCount: 0
            });
        }
        var parentInstance = currentVNode.component && currentVNode.component.parent;
        currentVNode = parentInstance && parentInstance.vnode;
    }
    return normalizedStack;
}
/* istanbul ignore next */
function formatTrace(trace) {
    var logs = [];
    trace.forEach(function (entry, i) {
        logs.push.apply(logs, (i === 0 ? [] : ["\n"]).concat( formatTraceEntry(entry) ));
    });
    return logs;
}
function formatTraceEntry(ref$$1) {
    var vnode = ref$$1.vnode;
    var recurseCount = ref$$1.recurseCount;

    var postfix = recurseCount > 0 ? ("... (" + recurseCount + " recursive calls)") : "";
    var isRoot = vnode.component ? vnode.component.parent == null : false;
    var open = " at <" + (formatComponentName(vnode.component, vnode.type, isRoot));
    var close = ">" + postfix;
    return vnode.props
        ? [open ].concat( formatProps(vnode.props), [close])
        : [open + close];
}
/* istanbul ignore next */
function formatProps(props) {
    var res = [];
    var keys = Object.keys(props);
    keys.slice(0, 3).forEach(function (key) {
        res.push.apply(res, formatProp(key, props[key]));
    });
    if (keys.length > 3) {
        res.push(" ...");
    }
    return res;
}
/* istanbul ignore next */
function formatProp(key, value, raw) {
    if (isString(value)) {
        value = JSON.stringify(value);
        return raw ? value : [(key + "=" + value)];
    }
    else if (typeof value === 'number' ||
        typeof value === 'boolean' ||
        value == null) {
        return raw ? value : [(key + "=" + value)];
    }
    else if (isRef(value)) {
        value = formatProp(key, toRaw(value.value), true);
        return raw ? value : [(key + "=Ref<"), value, ">"];
    }
    else if (isFunction(value)) {
        return [(key + "=fn" + (value.name ? ("<" + (value.name) + ">") : ""))];
    }
    else {
        value = toRaw(value);
        return raw ? value : [(key + "="), value];
    }
}

var ErrorTypeStrings = {};
ErrorTypeStrings["bc" /* BEFORE_CREATE */] = 'beforeCreate hook';
ErrorTypeStrings["c" /* CREATED */] = 'created hook';
ErrorTypeStrings["bm" /* BEFORE_MOUNT */] = 'beforeMount hook';
ErrorTypeStrings["m" /* MOUNTED */] = 'mounted hook';
ErrorTypeStrings["bu" /* BEFORE_UPDATE */] = 'beforeUpdate hook';
ErrorTypeStrings["u" /* UPDATED */] = 'updated';
ErrorTypeStrings["bum" /* BEFORE_UNMOUNT */] = 'beforeUnmount hook';
ErrorTypeStrings["um" /* UNMOUNTED */] = 'unmounted hook';
ErrorTypeStrings["a" /* ACTIVATED */] = 'activated hook';
ErrorTypeStrings["da" /* DEACTIVATED */] = 'deactivated hook';
ErrorTypeStrings["ec" /* ERROR_CAPTURED */] = 'errorCaptured hook';
ErrorTypeStrings["rtc" /* RENDER_TRACKED */] = 'renderTracked hook';
ErrorTypeStrings["rtg" /* RENDER_TRIGGERED */] = 'renderTriggered hook';
ErrorTypeStrings[0 /* SETUP_FUNCTION */] = 'setup function';
ErrorTypeStrings[1 /* RENDER_FUNCTION */] = 'render function';
ErrorTypeStrings[2 /* WATCH_GETTER */] = 'watcher getter';
ErrorTypeStrings[3 /* WATCH_CALLBACK */] = 'watcher callback';
ErrorTypeStrings[4 /* WATCH_CLEANUP */] = 'watcher cleanup function';
ErrorTypeStrings[5 /* NATIVE_EVENT_HANDLER */] = 'native event handler';
ErrorTypeStrings[6 /* COMPONENT_EVENT_HANDLER */] = 'component event handler';
ErrorTypeStrings[7 /* VNODE_HOOK */] = 'vnode hook';
ErrorTypeStrings[8 /* DIRECTIVE_HOOK */] = 'directive hook';
ErrorTypeStrings[9 /* TRANSITION_HOOK */] = 'transition hook';
ErrorTypeStrings[10 /* APP_ERROR_HANDLER */] = 'app errorHandler';
ErrorTypeStrings[11 /* APP_WARN_HANDLER */] = 'app warnHandler';
ErrorTypeStrings[12 /* FUNCTION_REF */] = 'ref function';
ErrorTypeStrings[13 /* ASYNC_COMPONENT_LOADER */] = 'async component loader';
ErrorTypeStrings[14 /* SCHEDULER */] = 'scheduler flush. This is likely a Vue internals bug. ' +
        'Please open an issue at https://new-issue.vuejs.org/?repo=vuejs/vue-next';
function callWithErrorHandling(fn, instance, type, args) {
    var res;
    try {
        res = args ? fn.apply(void 0, args) : fn();
    }
    catch (err) {
        handleError(err, instance, type);
    }
    return res;
}
function callWithAsyncErrorHandling(fn, instance, type, args) {
    if (isFunction(fn)) {
        var res = callWithErrorHandling(fn, instance, type, args);
        if (res && isPromise(res)) {
            res.catch(function (err) {
                handleError(err, instance, type);
            });
        }
        return res;
    }
    var values = [];
    for (var i = 0; i < fn.length; i++) {
        values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
    }
    return values;
}
function handleError(err, instance, type, throwInDev) {
    if ( throwInDev === void 0 ) throwInDev = true;

    var contextVNode = instance ? instance.vnode : null;
    if (instance) {
        var cur = instance.parent;
        // the exposed instance is the render proxy to keep it consistent with 2.x
        var exposedInstance = instance.proxy;
        // in production the hook receives only the error code
        var errorInfo = ErrorTypeStrings[type];
        while (cur) {
            var errorCapturedHooks = cur.ec;
            if (errorCapturedHooks) {
                for (var i = 0; i < errorCapturedHooks.length; i++) {
                    if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
                        return;
                    }
                }
            }
            cur = cur.parent;
        }
        // app-level handling
        var appErrorHandler = instance.appContext.config.errorHandler;
        if (appErrorHandler) {
            callWithErrorHandling(appErrorHandler, null, 10 /* APP_ERROR_HANDLER */, [err, exposedInstance, errorInfo]);
            return;
        }
    }
    logError(err, type, contextVNode, throwInDev);
}
function logError(err, type, contextVNode, throwInDev) {
    if ( throwInDev === void 0 ) throwInDev = true;

    {
        var info = ErrorTypeStrings[type];
        if (contextVNode) {
            pushWarningContext(contextVNode);
        }
        warn(("Unhandled error" + (info ? (" during execution of " + info) : "")));
        if (contextVNode) {
            popWarningContext();
        }
        // crash in dev by default so it's more noticeable
        if (throwInDev) {
            throw err;
        }
        else {
            console.error(err);
        }
    }
}

var isFlushing = false;
var isFlushPending = false;
var queue = [];
var flushIndex = 0;
var pendingPreFlushCbs = [];
var activePreFlushCbs = null;
var preFlushIndex = 0;
var pendingPostFlushCbs = [];
var activePostFlushCbs = null;
var postFlushIndex = 0;
var resolvedPromise = Promise.resolve();
var currentFlushPromise = null;
var currentPreFlushParentJob = null;
var RECURSION_LIMIT = 100;
function nextTick(fn) {
    var p = currentFlushPromise || resolvedPromise;
    return fn ? p.then(this ? fn.bind(this) : fn) : p;
}
function queueJob(job) {
    // the dedupe search uses the startIndex argument of Array.includes()
    // by default the search index includes the current job that is being run
    // so it cannot recursively trigger itself again.
    // if the job is a watch() callback, the search will start with a +1 index to
    // allow it recursively trigger itself - it is the user's responsibility to
    // ensure it doesn't end up in an infinite loop.
    if ((!queue.length ||
        !queue.includes(job, isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex)) &&
        job !== currentPreFlushParentJob) {
        queue.push(job);
        queueFlush();
    }
}
function queueFlush() {
    if (!isFlushing && !isFlushPending) {
        isFlushPending = true;
        currentFlushPromise = resolvedPromise.then(flushJobs);
    }
}
function queueCb(cb, activeQueue, pendingQueue, index) {
    if (!isArray(cb)) {
        if (!activeQueue ||
            !activeQueue.includes(cb, cb.allowRecurse ? index + 1 : index)) {
            pendingQueue.push(cb);
        }
    }
    else {
        // if cb is an array, it is a component lifecycle hook which can only be
        // triggered by a job, which is already deduped in the main queue, so
        // we can skip duplicate check here to improve perf
        pendingQueue.push.apply(pendingQueue, cb);
    }
    queueFlush();
}
function queuePreFlushCb(cb) {
    queueCb(cb, activePreFlushCbs, pendingPreFlushCbs, preFlushIndex);
}
function queuePostFlushCb(cb) {
    queueCb(cb, activePostFlushCbs, pendingPostFlushCbs, postFlushIndex);
}
function flushPreFlushCbs(seen, parentJob) {
    if ( parentJob === void 0 ) parentJob = null;

    if (pendingPreFlushCbs.length) {
        currentPreFlushParentJob = parentJob;
        activePreFlushCbs = [].concat( new Set(pendingPreFlushCbs) );
        pendingPreFlushCbs.length = 0;
        {
            seen = seen || new Map();
        }
        for (preFlushIndex = 0; preFlushIndex < activePreFlushCbs.length; preFlushIndex++) {
            {
                checkRecursiveUpdates(seen, activePreFlushCbs[preFlushIndex]);
            }
            activePreFlushCbs[preFlushIndex]();
        }
        activePreFlushCbs = null;
        preFlushIndex = 0;
        currentPreFlushParentJob = null;
        // recursively flush until it drains
        flushPreFlushCbs(seen, parentJob);
    }
}
function flushPostFlushCbs(seen) {
    if (pendingPostFlushCbs.length) {
        var deduped = [].concat( new Set(pendingPostFlushCbs) );
        pendingPostFlushCbs.length = 0;
        // #1947 already has active queue, nested flushPostFlushCbs call
        if (activePostFlushCbs) {
            activePostFlushCbs.push.apply(activePostFlushCbs, deduped);
            return;
        }
        activePostFlushCbs = deduped;
        {
            seen = seen || new Map();
        }
        activePostFlushCbs.sort(function (a, b) { return getId(a) - getId(b); });
        for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
            {
                checkRecursiveUpdates(seen, activePostFlushCbs[postFlushIndex]);
            }
            activePostFlushCbs[postFlushIndex]();
        }
        activePostFlushCbs = null;
        postFlushIndex = 0;
    }
}
var getId = function (job) { return job.id == null ? Infinity : job.id; };
function flushJobs(seen) {
    isFlushPending = false;
    isFlushing = true;
    {
        seen = seen || new Map();
    }
    flushPreFlushCbs(seen);
    // Sort queue before flush.
    // This ensures that:
    // 1. Components are updated from parent to child. (because parent is always
    //    created before the child so its render effect will have smaller
    //    priority number)
    // 2. If a component is unmounted during a parent component's update,
    //    its update can be skipped.
    queue.sort(function (a, b) { return getId(a) - getId(b); });
    try {
        for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
            var job = queue[flushIndex];
            if (job) {
                {
                    checkRecursiveUpdates(seen, job);
                }
                callWithErrorHandling(job, null, 14 /* SCHEDULER */);
            }
        }
    }
    finally {
        flushIndex = 0;
        queue.length = 0;
        flushPostFlushCbs(seen);
        isFlushing = false;
        currentFlushPromise = null;
        // some postFlushCb queued jobs!
        // keep flushing until it drains.
        if (queue.length || pendingPostFlushCbs.length) {
            flushJobs(seen);
        }
    }
}
function checkRecursiveUpdates(seen, fn) {
    if (!seen.has(fn)) {
        seen.set(fn, 1);
    }
    else {
        var count = seen.get(fn);
        if (count > RECURSION_LIMIT) {
            throw new Error("Maximum recursive updates exceeded. " +
                "This means you have a reactive effect that is mutating its own " +
                "dependencies and thus recursively triggering itself. Possible sources " +
                "include component template, render function, updated hook or " +
                "watcher source function.");
        }
        else {
            seen.set(fn, count + 1);
        }
    }
}

var hmrDirtyComponents = new Set();
// Expose the HMR runtime on the global object
// This makes it entirely tree-shakable without polluting the exports and makes
// it easier to be used in toolings like vue-loader
// Note: for a component to be eligible for HMR it also needs the __hmrId option
// to be set so that its instances can be registered / removed.
{
    var globalObject = typeof global !== 'undefined'
        ? global
        : typeof self !== 'undefined'
            ? self
            : typeof window !== 'undefined'
                ? window
                : {};
    globalObject.__VUE_HMR_RUNTIME__ = {
        createRecord: tryWrap(createRecord),
        rerender: tryWrap(rerender),
        reload: tryWrap(reload)
    };
}
var map = new Map();
function createRecord(id, component) {
    if (!component) {
        warn("HMR API usage is out of date.\n" +
            "Please upgrade vue-loader/vite/rollup-plugin-vue or other relevant " +
            "depdendency that handles Vue SFC compilation.");
        component = {};
    }
    if (map.has(id)) {
        return false;
    }
    map.set(id, {
        component: isClassComponent(component) ? component.__vccOpts : component,
        instances: new Set()
    });
    return true;
}
function rerender(id, newRender) {
    var record = map.get(id);
    if (!record)
        { return; }
    if (newRender)
        { record.component.render = newRender; }
    // Array.from creates a snapshot which avoids the set being mutated during
    // updates
    Array.from(record.instances).forEach(function (instance) {
        if (newRender) {
            instance.render = newRender;
        }
        instance.renderCache = [];
        // this flag forces child components with slot content to update
        instance.update();
        
    });
}
function reload(id, newComp) {
    var record = map.get(id);
    if (!record)
        { return; }
    // Array.from creates a snapshot which avoids the set being mutated during
    // updates
    var component = record.component;
    var instances = record.instances;
    if (!hmrDirtyComponents.has(component)) {
        // 1. Update existing comp definition to match new one
        newComp = isClassComponent(newComp) ? newComp.__vccOpts : newComp;
        extend(component, newComp);
        for (var key in component) {
            if (!(key in newComp)) {
                delete component[key];
            }
        }
        // 2. Mark component dirty. This forces the renderer to replace the component
        // on patch.
        hmrDirtyComponents.add(component);
        // 3. Make sure to unmark the component after the reload.
        queuePostFlushCb(function () {
            hmrDirtyComponents.delete(component);
        });
    }
    Array.from(instances).forEach(function (instance) {
        if (instance.parent) {
            // 4. Force the parent instance to re-render. This will cause all updated
            // components to be unmounted and re-mounted. Queue the update so that we
            // don't end up forcing the same parent to re-render multiple times.
            queueJob(instance.parent.update);
        }
        else if (instance.appContext.reload) {
            // root instance mounted via createApp() has a reload method
            instance.appContext.reload();
        }
        else if (typeof window !== 'undefined') {
            // root instance inside tree created via raw render(). Force reload.
            window.location.reload();
        }
        else {
            console.warn('[HMR] Root or manually mounted instance modified. Full reload required.');
        }
    });
}
function tryWrap(fn) {
    return function (id, arg) {
        try {
            return fn(id, arg);
        }
        catch (e) {
            console.error(e);
            console.warn("[HMR] Something went wrong during Vue component hot-reload. " +
                "Full reload required.");
        }
    };
}

function setDevtoolsHook(hook) {
    
}
/**
 * mark the current rendering instance for asset resolution (e.g.
 * resolveComponent, resolveDirective) during render
 */
var currentRenderingInstance = null;
function filterSingleRoot(children) {
    var singleRoot;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (isVNode(child)) {
            // ignore user comment
            if (child.type !== Comment || child.children === 'v-if') {
                if (singleRoot) {
                    // has more than 1 non-comment child, return now
                    return;
                }
                else {
                    singleRoot = child;
                }
            }
        }
        else {
            return;
        }
    }
    return singleRoot;
}
var isSuspense = function (type) { return type.__isSuspense; };
function normalizeSuspenseChildren(vnode) {
    var shapeFlag = vnode.shapeFlag;
    var children = vnode.children;
    var content;
    var fallback;
    if (shapeFlag & 32 /* SLOTS_CHILDREN */) {
        content = normalizeSuspenseSlot(children.default);
        fallback = normalizeSuspenseSlot(children.fallback);
    }
    else {
        content = normalizeSuspenseSlot(children);
        fallback = normalizeVNode(null);
    }
    return {
        content: content,
        fallback: fallback
    };
}
function normalizeSuspenseSlot(s) {
    if (isFunction(s)) {
        s = s();
    }
    if (isArray(s)) {
        var singleChild = filterSingleRoot(s);
        if (("development" !== 'production') && !singleChild) {
            warn("<Suspense> slots expect a single root node.");
        }
        s = singleChild;
    }
    return normalizeVNode(s);
}
function queueEffectWithSuspense(fn, suspense) {
    if (suspense && suspense.pendingBranch) {
        if (isArray(fn)) {
            (ref$$1 = suspense.effects).push.apply(ref$$1, fn);
        }
        else {
            suspense.effects.push(fn);
        }
    }
    else {
        queuePostFlushCb(fn);
    }
    var ref$$1;
}
var isRenderingCompiledSlot = 0;
var setCompiledSlotRendering = function (n) { return (isRenderingCompiledSlot += n); };
// SFC scoped style ID management.
var currentScopeId = null;
var isSimpleType = /*#__PURE__*/ makeMap('String,Number,Boolean,Function,Symbol');
function injectHook(type, hook, target, prepend) {
    if ( target === void 0 ) target = currentInstance;
    if ( prepend === void 0 ) prepend = false;

    if (target) {
        var hooks = target[type] || (target[type] = []);
        // cache the error handling wrapper for injected hooks so the same hook
        // can be properly deduped by the scheduler. "__weh" stands for "with error
        // handling".
        var wrappedHook = hook.__weh ||
            (hook.__weh = function () {
                var args = [], len = arguments.length;
                while ( len-- ) args[ len ] = arguments[ len ];

                if (target.isUnmounted) {
                    return;
                }
                // disable tracking inside all lifecycle hooks
                // since they can potentially be called inside effects.
                pauseTracking();
                // Set currentInstance during hook invocation.
                // This assumes the hook does not synchronously trigger other hooks, which
                // can only be false when the user does something really funky.
                setCurrentInstance(target);
                var res = callWithAsyncErrorHandling(hook, target, type, args);
                setCurrentInstance(null);
                resetTracking();
                return res;
            });
        if (prepend) {
            hooks.unshift(wrappedHook);
        }
        else {
            hooks.push(wrappedHook);
        }
        return wrappedHook;
    }
    else {
        var apiName = toHandlerKey(ErrorTypeStrings[type].replace(/ hook$/, ''));
        warn(apiName + " is called when there is no active component instance to be " +
            "associated with. " +
            "Lifecycle injection APIs can only be used during execution of setup()." +
            ( " If you are using async setup(), make sure to register lifecycle " +
                    "hooks before the first await statement."
                ));
    }
}
var createHook = function (lifecycle) { return function (hook, target) {
  if ( target === void 0 ) target = currentInstance;

  return !isInSSRComponentSetup && injectHook(lifecycle, hook, target);
 }  };
var onMounted = createHook("m" /* MOUNTED */);
var onUpdated = createHook("u" /* UPDATED */);
var onBeforeUnmount = createHook("bum" /* BEFORE_UNMOUNT */);
// initial value for watchers to trigger on undefined initial values
var INITIAL_WATCHER_VALUE = {};
function doWatch(source, cb, ref$$1, instance) {
    if ( ref$$1 === void 0 ) ref$$1 = EMPTY_OBJ;
    var immediate = ref$$1.immediate;
    var deep = ref$$1.deep;
    var flush = ref$$1.flush;
    var onTrack = ref$$1.onTrack;
    var onTrigger = ref$$1.onTrigger;
    if ( instance === void 0 ) instance = currentInstance;

    if (("development" !== 'production') && !cb) {
        if (immediate !== undefined) {
            warn("watch() \"immediate\" option is only respected when using the " +
                "watch(source, callback, options?) signature.");
        }
        if (deep !== undefined) {
            warn("watch() \"deep\" option is only respected when using the " +
                "watch(source, callback, options?) signature.");
        }
    }
    var warnInvalidSource = function (s) {
        warn("Invalid watch source: ", s, "A watch source can only be a getter/effect function, a ref, " +
            "a reactive object, or an array of these types.");
    };
    var getter;
    var forceTrigger = false;
    if (isRef(source)) {
        getter = function () { return source.value; };
        forceTrigger = !!source._shallow;
    }
    else if (isReactive(source)) {
        getter = function () { return source; };
        deep = true;
    }
    else if (isArray(source)) {
        getter = function () { return source.map(function (s) {
            if (isRef(s)) {
                return s.value;
            }
            else if (isReactive(s)) {
                return traverse(s);
            }
            else if (isFunction(s)) {
                return callWithErrorHandling(s, instance, 2 /* WATCH_GETTER */);
            }
            else {
                ("development" !== 'production') && warnInvalidSource(s);
            }
        }); };
    }
    else if (isFunction(source)) {
        if (cb) {
            // getter with cb
            getter = function () { return callWithErrorHandling(source, instance, 2 /* WATCH_GETTER */); };
        }
        else {
            // no cb -> simple effect
            getter = function () {
                if (instance && instance.isUnmounted) {
                    return;
                }
                if (cleanup) {
                    cleanup();
                }
                return callWithErrorHandling(source, instance, 3 /* WATCH_CALLBACK */, [onInvalidate]);
            };
        }
    }
    else {
        getter = NOOP;
        ("development" !== 'production') && warnInvalidSource(source);
    }
    if (cb && deep) {
        var baseGetter = getter;
        getter = function () { return traverse(baseGetter()); };
    }
    var cleanup;
    var onInvalidate = function (fn) {
        cleanup = runner.options.onStop = function () {
            callWithErrorHandling(fn, instance, 4 /* WATCH_CLEANUP */);
        };
    };
    var oldValue = isArray(source) ? [] : INITIAL_WATCHER_VALUE;
    var job = function () {
        if (!runner.active) {
            return;
        }
        if (cb) {
            // watch(source, cb)
            var newValue = runner();
            if (deep || forceTrigger || hasChanged(newValue, oldValue)) {
                // cleanup before running cb again
                if (cleanup) {
                    cleanup();
                }
                callWithAsyncErrorHandling(cb, instance, 3 /* WATCH_CALLBACK */, [
                    newValue,
                    // pass undefined as the old value when it's changed for the first time
                    oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
                    onInvalidate
                ]);
                oldValue = newValue;
            }
        }
        else {
            // watchEffect
            runner();
        }
    };
    // important: mark the job as a watcher callback so that scheduler knows
    // it is allowed to self-trigger (#1727)
    job.allowRecurse = !!cb;
    var scheduler;
    if (flush === 'sync') {
        scheduler = job;
    }
    else if (flush === 'post') {
        scheduler = function () { return queuePostRenderEffect(job, instance && instance.suspense); };
    }
    else {
        // default: 'pre'
        scheduler = function () {
            if (!instance || instance.isMounted) {
                queuePreFlushCb(job);
            }
            else {
                // with 'pre' option, the first call must happen before
                // the component is mounted so it is called synchronously.
                job();
            }
        };
    }
    var runner = effect(getter, {
        lazy: true,
        onTrack: onTrack,
        onTrigger: onTrigger,
        scheduler: scheduler
    });
    recordInstanceBoundEffect(runner, instance);
    // initial run
    if (cb) {
        if (immediate) {
            job();
        }
        else {
            oldValue = runner();
        }
    }
    else if (flush === 'post') {
        queuePostRenderEffect(runner, instance && instance.suspense);
    }
    else {
        runner();
    }
    return function () {
        stop(runner);
        if (instance) {
            remove(instance.effects, runner);
        }
    };
}
// this.$watch
function instanceWatch(source, cb, options) {
    var publicThis = this.proxy;
    var getter = isString(source)
        ? function () { return publicThis[source]; }
        : source.bind(publicThis);
    return doWatch(getter, cb.bind(publicThis), options, this);
}
function traverse(value, seen) {
    if ( seen === void 0 ) seen = new Set();

    if (!isObject(value) || seen.has(value)) {
        return value;
    }
    seen.add(value);
    if (isRef(value)) {
        traverse(value.value, seen);
    }
    else if (isArray(value)) {
        for (var i = 0; i < value.length; i++) {
            traverse(value[i], seen);
        }
    }
    else if (isSet(value) || isMap(value)) {
        value.forEach(function (v) {
            traverse(v, seen);
        });
    }
    else {
        for (var key in value) {
            traverse(value[key], seen);
        }
    }
    return value;
}

function useTransitionState() {
    var state = {
        isMounted: false,
        isLeaving: false,
        isUnmounting: false,
        leavingVNodes: new Map()
    };
    onMounted(function () {
        state.isMounted = true;
    });
    onBeforeUnmount(function () {
        state.isUnmounting = true;
    });
    return state;
}
var TransitionHookValidator = [Function, Array];
var BaseTransitionImpl = {
    name: "BaseTransition",
    props: {
        mode: String,
        appear: Boolean,
        persisted: Boolean,
        // enter
        onBeforeEnter: TransitionHookValidator,
        onEnter: TransitionHookValidator,
        onAfterEnter: TransitionHookValidator,
        onEnterCancelled: TransitionHookValidator,
        // leave
        onBeforeLeave: TransitionHookValidator,
        onLeave: TransitionHookValidator,
        onAfterLeave: TransitionHookValidator,
        onLeaveCancelled: TransitionHookValidator,
        // appear
        onBeforeAppear: TransitionHookValidator,
        onAppear: TransitionHookValidator,
        onAfterAppear: TransitionHookValidator,
        onAppearCancelled: TransitionHookValidator
    },
    setup: function setup(props, ref$$1) {
        var slots = ref$$1.slots;

        var instance = getCurrentInstance();
        var state = useTransitionState();
        var prevTransitionKey;
        return function () {
            var children = slots.default && getTransitionRawChildren(slots.default(), true);
            if (!children || !children.length) {
                return;
            }
            // warn multiple elements
            if (("development" !== 'production') && children.length > 1) {
                warn('<transition> can only be used on a single element or component. Use ' +
                    '<transition-group> for lists.');
            }
            // there's no need to track reactivity for these props so use the raw
            // props for a bit better perf
            var rawProps = toRaw(props);
            var mode = rawProps.mode;
            // check mode
            if (("development" !== 'production') && mode && !['in-out', 'out-in', 'default'].includes(mode)) {
                warn(("invalid <transition> mode: " + mode));
            }
            // at this point children has a guaranteed length of 1.
            var child = children[0];
            if (state.isLeaving) {
                return emptyPlaceholder(child);
            }
            // in the case of <transition><keep-alive/></transition>, we need to
            // compare the type of the kept-alive children.
            var innerChild = getKeepAliveChild(child);
            if (!innerChild) {
                return emptyPlaceholder(child);
            }
            var enterHooks = resolveTransitionHooks(innerChild, rawProps, state, instance);
            setTransitionHooks(innerChild, enterHooks);
            var oldChild = instance.subTree;
            var oldInnerChild = oldChild && getKeepAliveChild(oldChild);
            var transitionKeyChanged = false;
            var ref$$1 = innerChild.type;
            var getTransitionKey = ref$$1.getTransitionKey;
            if (getTransitionKey) {
                var key = getTransitionKey();
                if (prevTransitionKey === undefined) {
                    prevTransitionKey = key;
                }
                else if (key !== prevTransitionKey) {
                    prevTransitionKey = key;
                    transitionKeyChanged = true;
                }
            }
            // handle mode
            if (oldInnerChild &&
                oldInnerChild.type !== Comment &&
                (!isSameVNodeType(innerChild, oldInnerChild) || transitionKeyChanged)) {
                var leavingHooks = resolveTransitionHooks(oldInnerChild, rawProps, state, instance);
                // update old tree's hooks in case of dynamic transition
                setTransitionHooks(oldInnerChild, leavingHooks);
                // switching between different views
                if (mode === 'out-in') {
                    state.isLeaving = true;
                    // return placeholder node and queue update when leave finishes
                    leavingHooks.afterLeave = function () {
                        state.isLeaving = false;
                        instance.update();
                    };
                    return emptyPlaceholder(child);
                }
                else if (mode === 'in-out') {
                    leavingHooks.delayLeave = function (el, earlyRemove, delayedLeave) {
                        var leavingVNodesCache = getLeavingNodesForType(state, oldInnerChild);
                        leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild;
                        // early removal callback
                        el._leaveCb = function () {
                            earlyRemove();
                            el._leaveCb = undefined;
                            delete enterHooks.delayedLeave;
                        };
                        enterHooks.delayedLeave = delayedLeave;
                    };
                }
            }
            return child;
        };
    }
};
// export the public type for h/tsx inference
// also to avoid inline import() in generated d.ts files
var BaseTransition = BaseTransitionImpl;
function getLeavingNodesForType(state, vnode) {
    var leavingVNodes = state.leavingVNodes;
    var leavingVNodesCache = leavingVNodes.get(vnode.type);
    if (!leavingVNodesCache) {
        leavingVNodesCache = Object.create(null);
        leavingVNodes.set(vnode.type, leavingVNodesCache);
    }
    return leavingVNodesCache;
}
// The transition hooks are attached to the vnode as vnode.transition
// and will be called at appropriate timing in the renderer.
function resolveTransitionHooks(vnode, props, state, instance) {
    var appear = props.appear;
    var mode = props.mode;
    var persisted = props.persisted; if ( persisted === void 0 ) persisted = false;
    var onBeforeEnter = props.onBeforeEnter;
    var onEnter = props.onEnter;
    var onAfterEnter = props.onAfterEnter;
    var onEnterCancelled = props.onEnterCancelled;
    var onBeforeLeave = props.onBeforeLeave;
    var onLeave = props.onLeave;
    var onAfterLeave = props.onAfterLeave;
    var onLeaveCancelled = props.onLeaveCancelled;
    var onBeforeAppear = props.onBeforeAppear;
    var onAppear = props.onAppear;
    var onAfterAppear = props.onAfterAppear;
    var onAppearCancelled = props.onAppearCancelled;
    var key = String(vnode.key);
    var leavingVNodesCache = getLeavingNodesForType(state, vnode);
    var callHook = function (hook, args) {
        hook &&
            callWithAsyncErrorHandling(hook, instance, 9 /* TRANSITION_HOOK */, args);
    };
    var hooks = {
        mode: mode,
        persisted: persisted,
        beforeEnter: function beforeEnter(el) {
            var hook = onBeforeEnter;
            if (!state.isMounted) {
                if (appear) {
                    hook = onBeforeAppear || onBeforeEnter;
                }
                else {
                    return;
                }
            }
            // for same element (v-show)
            if (el._leaveCb) {
                el._leaveCb(true /* cancelled */);
            }
            // for toggled element with same key (v-if)
            var leavingVNode = leavingVNodesCache[key];
            if (leavingVNode &&
                isSameVNodeType(vnode, leavingVNode) &&
                leavingVNode.el._leaveCb) {
                // force early removal (not cancelled)
                leavingVNode.el._leaveCb();
            }
            callHook(hook, [el]);
        },
        enter: function enter(el) {
            var hook = onEnter;
            var afterHook = onAfterEnter;
            var cancelHook = onEnterCancelled;
            if (!state.isMounted) {
                if (appear) {
                    hook = onAppear || onEnter;
                    afterHook = onAfterAppear || onAfterEnter;
                    cancelHook = onAppearCancelled || onEnterCancelled;
                }
                else {
                    return;
                }
            }
            var called = false;
            var done = (el._enterCb = function (cancelled) {
                if (called)
                    { return; }
                called = true;
                if (cancelled) {
                    callHook(cancelHook, [el]);
                }
                else {
                    callHook(afterHook, [el]);
                }
                if (hooks.delayedLeave) {
                    hooks.delayedLeave();
                }
                el._enterCb = undefined;
            });
            if (hook) {
                hook(el, done);
                if (hook.length <= 1) {
                    done();
                }
            }
            else {
                done();
            }
        },
        leave: function leave(el, remove$$1) {
            var key = String(vnode.key);
            if (el._enterCb) {
                el._enterCb(true /* cancelled */);
            }
            if (state.isUnmounting) {
                return remove$$1();
            }
            callHook(onBeforeLeave, [el]);
            var called = false;
            var done = (el._leaveCb = function (cancelled) {
                if (called)
                    { return; }
                called = true;
                remove$$1();
                if (cancelled) {
                    callHook(onLeaveCancelled, [el]);
                }
                else {
                    callHook(onAfterLeave, [el]);
                }
                el._leaveCb = undefined;
                if (leavingVNodesCache[key] === vnode) {
                    delete leavingVNodesCache[key];
                }
            });
            leavingVNodesCache[key] = vnode;
            if (onLeave) {
                onLeave(el, done);
                if (onLeave.length <= 1) {
                    done();
                }
            }
            else {
                done();
            }
        },
        clone: function clone(vnode) {
            return resolveTransitionHooks(vnode, props, state, instance);
        }
    };
    return hooks;
}
// the placeholder really only handles one special case: KeepAlive
// in the case of a KeepAlive in a leave phase we need to return a KeepAlive
// placeholder with empty content to avoid the KeepAlive instance from being
// unmounted.
function emptyPlaceholder(vnode) {
    if (isKeepAlive(vnode)) {
        vnode = cloneVNode(vnode);
        vnode.children = null;
        return vnode;
    }
}
function getKeepAliveChild(vnode) {
    return isKeepAlive(vnode)
        ? vnode.children
            ? vnode.children[0]
            : undefined
        : vnode;
}
function setTransitionHooks(vnode, hooks) {
    if (vnode.shapeFlag & 6 /* COMPONENT */ && vnode.component) {
        setTransitionHooks(vnode.component.subTree, hooks);
    }
    else if ( vnode.shapeFlag & 128 /* SUSPENSE */) {
        vnode.ssContent.transition = hooks.clone(vnode.ssContent);
        vnode.ssFallback.transition = hooks.clone(vnode.ssFallback);
    }
    else {
        vnode.transition = hooks;
    }
}
function getTransitionRawChildren(children, keepComment) {
    if ( keepComment === void 0 ) keepComment = false;

    var ret = [];
    var keyedFragmentCount = 0;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        // handle fragment children case, e.g. v-for
        if (child.type === Fragment) {
            if (child.patchFlag & 128 /* KEYED_FRAGMENT */)
                { keyedFragmentCount++; }
            ret = ret.concat(getTransitionRawChildren(child.children, keepComment));
        }
        // comment placeholders should be skipped, e.g. v-if
        else if (keepComment || child.type !== Comment) {
            ret.push(child);
        }
    }
    // #1126 if a transition children list contains multiple sub fragments, these
    // fragments will be merged into a flat children array. Since each v-for
    // fragment may contain different static bindings inside, we need to de-op
    // these children to force full diffs to ensure correct behavior.
    if (keyedFragmentCount > 1) {
        for (var i$1 = 0; i$1 < ret.length; i$1++) {
            ret[i$1].patchFlag = -2 /* BAIL */;
        }
    }
    return ret;
}

var isKeepAlive = function (vnode) { return vnode.type.__isKeepAlive; };
/**
Runtime helper for applying directives to a vnode. Example usage:

const comp = resolveComponent('comp')
const foo = resolveDirective('foo')
const bar = resolveDirective('bar')

return withDirectives(h(comp), [
  [foo, this.x],
  [bar, this.y]
])
*/
var isBuiltInDirective = /*#__PURE__*/ makeMap('bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text');
var queuePostRenderEffect =  queueEffectWithSuspense;
var isTeleport = function (type) { return type.__isTeleport; };
var NULL_DYNAMIC_COMPONENT = Symbol();
var Fragment = Symbol('Fragment');
var Text = Symbol('Text');
var Comment = Symbol('Comment');
var currentBlock = null;
// Whether we should be tracking dynamic child nodes inside a block.
// Only tracks when this value is > 0
// We are not using a simple boolean because this value may need to be
// incremented/decremented by nested usage of v-once (see below)
var shouldTrack = 1;
function isVNode(value) {
    return value ? value.__v_isVNode === true : false;
}
function isSameVNodeType(n1, n2) {
    if (("development" !== 'production') &&
        n2.shapeFlag & 6 /* COMPONENT */ &&
        hmrDirtyComponents.has(n2.type)) {
        // HMR only: if the component has been hot-updated, force a reload.
        return false;
    }
    return n1.type === n2.type && n1.key === n2.key;
}
var vnodeArgsTransformer;
var createVNodeWithArgsTransform = function () {
    var args = [], len = arguments.length;
    while ( len-- ) args[ len ] = arguments[ len ];

    return _createVNode.apply(void 0, (vnodeArgsTransformer
        ? vnodeArgsTransformer(args, currentRenderingInstance)
        : args));
};
var InternalObjectKey = "__vInternal";
var normalizeKey = function (ref$$1) {
  var key = ref$$1.key;

  return key != null ? key : null;
};
var normalizeRef = function (ref$1) {
    var ref$$1 = ref$1.ref;

    return (ref$$1 != null
        ? isString(ref$$1) || isRef(ref$$1) || isFunction(ref$$1)
            ? { i: currentRenderingInstance, r: ref$$1 }
            : ref$$1
        : null);
};
var createVNode = (createVNodeWithArgsTransform);
function _createVNode(type, props, children, patchFlag, dynamicProps, isBlockNode) {
    if ( props === void 0 ) props = null;
    if ( children === void 0 ) children = null;
    if ( patchFlag === void 0 ) patchFlag = 0;
    if ( dynamicProps === void 0 ) dynamicProps = null;
    if ( isBlockNode === void 0 ) isBlockNode = false;

    if (!type || type === NULL_DYNAMIC_COMPONENT) {
        if (("development" !== 'production') && !type) {
            warn(("Invalid vnode type when creating vnode: " + type + "."));
        }
        type = Comment;
    }
    if (isVNode(type)) {
        // createVNode receiving an existing vnode. This happens in cases like
        // <component :is="vnode"/>
        // #2078 make sure to merge refs during the clone instead of overwriting it
        var cloned = cloneVNode(type, props, true /* mergeRef: true */);
        if (children) {
            normalizeChildren(cloned, children);
        }
        return cloned;
    }
    // class component normalization.
    if (isClassComponent(type)) {
        type = type.__vccOpts;
    }
    // class & style normalization.
    if (props) {
        // for reactive or proxy objects, we need to clone it to enable mutation.
        if (isProxy(props) || InternalObjectKey in props) {
            props = extend({}, props);
        }
        var klass = props.class;
        var style = props.style;
        if (klass && !isString(klass)) {
            props.class = normalizeClass(klass);
        }
        if (isObject(style)) {
            // reactive state objects need to be cloned since they are likely to be
            // mutated
            if (isProxy(style) && !isArray(style)) {
                style = extend({}, style);
            }
            props.style = normalizeStyle(style);
        }
    }
    // encode the vnode type information into a bitmap
    var shapeFlag = isString(type)
        ? 1 /* ELEMENT */
        :  isSuspense(type)
            ? 128 /* SUSPENSE */
            : isTeleport(type)
                ? 64 /* TELEPORT */
                : isObject(type)
                    ? 4 /* STATEFUL_COMPONENT */
                    : isFunction(type)
                        ? 2 /* FUNCTIONAL_COMPONENT */
                        : 0;
    if (("development" !== 'production') && shapeFlag & 4 /* STATEFUL_COMPONENT */ && isProxy(type)) {
        type = toRaw(type);
        warn("Vue received a Component which was made a reactive object. This can " +
            "lead to unnecessary performance overhead, and should be avoided by " +
            "marking the component with `markRaw` or using `shallowRef` " +
            "instead of `ref`.", "\nComponent that was made reactive: ", type);
    }
    var vnode = {
        __v_isVNode: true
    };
    vnode["__v_skip" /* SKIP */] = true;
    vnode.type = type;
    vnode.props = props;
    vnode.key = props && normalizeKey(props);
    vnode.ref = props && normalizeRef(props);
    vnode.scopeId = currentScopeId;
    vnode.children = null;
    vnode.component = null;
    vnode.suspense = null;
    vnode.ssContent = null;
    vnode.ssFallback = null;
    vnode.dirs = null;
    vnode.transition = null;
    vnode.el = null;
    vnode.anchor = null;
    vnode.target = null;
    vnode.targetAnchor = null;
    vnode.staticCount = 0;
    vnode.shapeFlag = shapeFlag;
    vnode.patchFlag = patchFlag;
    vnode.dynamicProps = dynamicProps;
    vnode.dynamicChildren = null;
    vnode.appContext = null;
    // validate key
    if (("development" !== 'production') && vnode.key !== vnode.key) {
        warn("VNode created with invalid key (NaN). VNode type:", vnode.type);
    }
    normalizeChildren(vnode, children);
    // normalize suspense children
    if ( shapeFlag & 128 /* SUSPENSE */) {
        var ref$$1 = normalizeSuspenseChildren(vnode);
        var content = ref$$1.content;
        var fallback = ref$$1.fallback;
        vnode.ssContent = content;
        vnode.ssFallback = fallback;
    }
    if (shouldTrack > 0 &&
        // avoid a block node from tracking itself
        !isBlockNode &&
        // has current parent block
        currentBlock &&
        // presence of a patch flag indicates this node needs patching on updates.
        // component nodes also should always be patched, because even if the
        // component doesn't need to update, it needs to persist the instance on to
        // the next vnode so that it can be properly unmounted later.
        (patchFlag > 0 || shapeFlag & 6 /* COMPONENT */) &&
        // the EVENTS flag is only for hydration and if it is the only flag, the
        // vnode should not be considered dynamic due to handler caching.
        patchFlag !== 32 /* HYDRATE_EVENTS */) {
        currentBlock.push(vnode);
    }
    return vnode;
}
function cloneVNode(vnode, extraProps, mergeRef) {
    var obj;

    if ( mergeRef === void 0 ) mergeRef = false;
    // This is intentionally NOT using spread or extend to avoid the runtime
    // key enumeration cost.
    var props = vnode.props;
    var ref$$1 = vnode.ref;
    var patchFlag = vnode.patchFlag;
    var mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props;
    return ( obj = {
        __v_isVNode: true
    }, obj["__v_skip" /* SKIP */] = true, obj.type = vnode.type, obj.props = mergedProps, obj.key = mergedProps && normalizeKey(mergedProps), obj.ref = extraProps && extraProps.ref
            ? // #2078 in the case of <component :is="vnode" ref="extra"/>
                // if the vnode itself already has a ref, cloneVNode will need to merge
                // the refs so the single vnode can be set on multiple refs
                mergeRef && ref$$1
                    ? isArray(ref$$1)
                        ? ref$$1.concat(normalizeRef(extraProps))
                        : [ref$$1, normalizeRef(extraProps)]
                    : normalizeRef(extraProps)
            : ref$$1, obj.scopeId = vnode.scopeId, obj.children = vnode.children, obj.target = vnode.target, obj.targetAnchor = vnode.targetAnchor, obj.staticCount = vnode.staticCount, obj.shapeFlag = vnode.shapeFlag, obj.patchFlag = extraProps && vnode.type !== Fragment
            ? patchFlag === -1 // hoisted node
                ? 16 /* FULL_PROPS */
                : patchFlag | 16 /* FULL_PROPS */
            : patchFlag, obj.dynamicProps = vnode.dynamicProps, obj.dynamicChildren = vnode.dynamicChildren, obj.appContext = vnode.appContext, obj.dirs = vnode.dirs, obj.transition = vnode.transition, obj.component = vnode.component, obj.suspense = vnode.suspense, obj.ssContent = vnode.ssContent && cloneVNode(vnode.ssContent), obj.ssFallback = vnode.ssFallback && cloneVNode(vnode.ssFallback), obj.el = vnode.el, obj.anchor = vnode.anchor, obj);
}
/**
 * @private
 */
function createTextVNode(text, flag) {
    if ( text === void 0 ) text = ' ';
    if ( flag === void 0 ) flag = 0;

    return createVNode(Text, null, text, flag);
}
function normalizeVNode(child) {
    if (child == null || typeof child === 'boolean') {
        // empty placeholder
        return createVNode(Comment);
    }
    else if (isArray(child)) {
        // fragment
        return createVNode(Fragment, null, child);
    }
    else if (typeof child === 'object') {
        // already vnode, this should be the most common since compiled templates
        // always produce all-vnode children arrays
        return child.el === null ? child : cloneVNode(child);
    }
    else {
        // strings and numbers
        return createVNode(Text, null, String(child));
    }
}
function normalizeChildren(vnode, children) {
    var type = 0;
    var shapeFlag = vnode.shapeFlag;
    if (children == null) {
        children = null;
    }
    else if (isArray(children)) {
        type = 16 /* ARRAY_CHILDREN */;
    }
    else if (typeof children === 'object') {
        if (shapeFlag & 1 /* ELEMENT */ || shapeFlag & 64 /* TELEPORT */) {
            // Normalize slot to plain children for plain element and Teleport
            var slot = children.default;
            if (slot) {
                // _c marker is added by withCtx() indicating this is a compiled slot
                slot._c && setCompiledSlotRendering(1);
                normalizeChildren(vnode, slot());
                slot._c && setCompiledSlotRendering(-1);
            }
            return;
        }
        else {
            type = 32 /* SLOTS_CHILDREN */;
            var slotFlag = children._;
            if (!slotFlag && !(InternalObjectKey in children)) {
                children._ctx = currentRenderingInstance;
            }
            else if (slotFlag === 3 /* FORWARDED */ && currentRenderingInstance) {
                // a child component receives forwarded slots from the parent.
                // its slot type is determined by its parent's slot type.
                if (currentRenderingInstance.vnode.patchFlag & 1024 /* DYNAMIC_SLOTS */) {
                    children._ = 2 /* DYNAMIC */;
                    vnode.patchFlag |= 1024 /* DYNAMIC_SLOTS */;
                }
                else {
                    children._ = 1 /* STABLE */;
                }
            }
        }
    }
    else if (isFunction(children)) {
        children = { default: children, _ctx: currentRenderingInstance };
        type = 32 /* SLOTS_CHILDREN */;
    }
    else {
        children = String(children);
        // force teleport children to array so it can be moved around
        if (shapeFlag & 64 /* TELEPORT */) {
            type = 16 /* ARRAY_CHILDREN */;
            children = [createTextVNode(children)];
        }
        else {
            type = 8 /* TEXT_CHILDREN */;
        }
    }
    vnode.children = children;
    vnode.shapeFlag |= type;
}
function mergeProps() {
    var args = [], len = arguments.length;
    while ( len-- ) args[ len ] = arguments[ len ];

    var ret = extend({}, args[0]);
    for (var i = 1; i < args.length; i++) {
        var toMerge = args[i];
        for (var key in toMerge) {
            if (key === 'class') {
                if (ret.class !== toMerge.class) {
                    ret.class = normalizeClass([ret.class, toMerge.class]);
                }
            }
            else if (key === 'style') {
                ret.style = normalizeStyle([ret.style, toMerge.style]);
            }
            else if (isOn(key)) {
                var existing = ret[key];
                var incoming = toMerge[key];
                if (existing !== incoming) {
                    ret[key] = existing
                        ? [].concat(existing, toMerge[key])
                        : incoming;
                }
            }
            else if (key !== '') {
                ret[key] = toMerge[key];
            }
        }
    }
    return ret;
}

var isInBeforeCreate = false;
function resolveMergedOptions(instance) {
    var raw = instance.type;
    var __merged = raw.__merged;
    var mixins = raw.mixins;
    var extendsOptions = raw.extends;
    if (__merged)
        { return __merged; }
    var globalMixins = instance.appContext.mixins;
    if (!globalMixins.length && !mixins && !extendsOptions)
        { return raw; }
    var options = {};
    globalMixins.forEach(function (m) { return mergeOptions(options, m, instance); });
    mergeOptions(options, raw, instance);
    return (raw.__merged = options);
}
function mergeOptions(to, from, instance) {
    var strats = instance.appContext.config.optionMergeStrategies;
    var mixins = from.mixins;
    var extendsOptions = from.extends;
    extendsOptions && mergeOptions(to, extendsOptions, instance);
    mixins &&
        mixins.forEach(function (m) { return mergeOptions(to, m, instance); });
    for (var key in from) {
        if (strats && hasOwn(strats, key)) {
            to[key] = strats[key](to[key], from[key], instance.proxy, key);
        }
        else {
            to[key] = from[key];
        }
    }
}

/**
 * #2437 In Vue 3, functional components do not have a public instance proxy but
 * they exist in the internal parent chain. For code that relies on traversing
 * public $parent chains, skip functional ones and go to the parent instead.
 */
var getPublicInstance = function (i) { return i && (i.proxy ? i.proxy : getPublicInstance(i.parent)); };
var publicPropertiesMap = extend(Object.create(null), {
    $: function (i) { return i; },
    $el: function (i) { return i.vnode.el; },
    $data: function (i) { return i.data; },
    $props: function (i) { return (shallowReadonly(i.props)); },
    $attrs: function (i) { return (shallowReadonly(i.attrs)); },
    $slots: function (i) { return (shallowReadonly(i.slots)); },
    $refs: function (i) { return (shallowReadonly(i.refs)); },
    $parent: function (i) { return getPublicInstance(i.parent); },
    $root: function (i) { return i.root && i.root.proxy; },
    $emit: function (i) { return i.emit; },
    $options: function (i) { return (__VUE_OPTIONS_API__ ? resolveMergedOptions(i) : i.type); },
    $forceUpdate: function (i) { return function () { return queueJob(i.update); }; },
    $nextTick: function (i) { return nextTick.bind(i.proxy); },
    $watch: function (i) { return (__VUE_OPTIONS_API__ ? instanceWatch.bind(i) : NOOP); }
});
var PublicInstanceProxyHandlers = {
    get: function get(ref$$1, key) {
        var instance = ref$$1._;

        var ctx = instance.ctx;
        var setupState = instance.setupState;
        var data = instance.data;
        var props = instance.props;
        var accessCache = instance.accessCache;
        var type = instance.type;
        var appContext = instance.appContext;
        // let @vue/reactivity know it should never observe Vue public instances.
        if (key === "__v_skip" /* SKIP */) {
            return true;
        }
        // for internal formatters to know that this is a Vue instance
        if (("development" !== 'production') && key === '__isVue') {
            return true;
        }
        // data / props / ctx
        // This getter gets called for every property access on the render context
        // during render and is a major hotspot. The most expensive part of this
        // is the multiple hasOwn() calls. It's much faster to do a simple property
        // access on a plain object, so we use an accessCache object (with null
        // prototype) to memoize what access type a key corresponds to.
        var normalizedProps;
        if (key[0] !== '$') {
            var n = accessCache[key];
            if (n !== undefined) {
                switch (n) {
                    case 0 /* SETUP */:
                        return setupState[key];
                    case 1 /* DATA */:
                        return data[key];
                    case 3 /* CONTEXT */:
                        return ctx[key];
                    case 2 /* PROPS */:
                        return props[key];
                    // default: just fallthrough
                }
            }
            else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
                accessCache[key] = 0 /* SETUP */;
                return setupState[key];
            }
            else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
                accessCache[key] = 1 /* DATA */;
                return data[key];
            }
            else if (
            // only cache other properties when instance has declared (thus stable)
            // props
            (normalizedProps = instance.propsOptions[0]) &&
                hasOwn(normalizedProps, key)) {
                accessCache[key] = 2 /* PROPS */;
                return props[key];
            }
            else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
                accessCache[key] = 3 /* CONTEXT */;
                return ctx[key];
            }
            else if (!__VUE_OPTIONS_API__ || !isInBeforeCreate) {
                accessCache[key] = 4 /* OTHER */;
            }
        }
        var publicGetter = publicPropertiesMap[key];
        var cssModule, globalProperties;
        // public $xxx properties
        if (publicGetter) {
            if (key === '$attrs') {
                track(instance, "get" /* GET */, key);
                
            }
            return publicGetter(instance);
        }
        else if (
        // css module (injected by vue-loader)
        (cssModule = type.__cssModules) &&
            (cssModule = cssModule[key])) {
            return cssModule;
        }
        else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
            // user may set custom properties to `this` that start with `$`
            accessCache[key] = 3 /* CONTEXT */;
            return ctx[key];
        }
        else if (
        // global properties
        (globalProperties = appContext.config.globalProperties, hasOwn(globalProperties, key))) {
            return globalProperties[key];
        }
        else if (("development" !== 'production') &&
            currentRenderingInstance &&
            (!isString(key) ||
                // #1091 avoid internal isRef/isVNode checks on component instance leading
                // to infinite warning loop
                key.indexOf('__v') !== 0)) {
            if (data !== EMPTY_OBJ &&
                (key[0] === '$' || key[0] === '_') &&
                hasOwn(data, key)) {
                warn("Property " + (JSON.stringify(key)) + " must be accessed via $data because it starts with a reserved " +
                    "character (\"$\" or \"_\") and is not proxied on the render context.");
            }
            else {
                warn("Property " + (JSON.stringify(key)) + " was accessed during render " +
                    "but is not defined on instance.");
            }
        }
    },
    set: function set(ref$$1, key, value) {
        var instance = ref$$1._;

        var data = instance.data;
        var setupState = instance.setupState;
        var ctx = instance.ctx;
        if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
            setupState[key] = value;
        }
        else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
            data[key] = value;
        }
        else if (key in instance.props) {
            ("development" !== 'production') &&
                warn(("Attempting to mutate prop \"" + key + "\". Props are readonly."), instance);
            return false;
        }
        if (key[0] === '$' && key.slice(1) in instance) {
            ("development" !== 'production') &&
                warn("Attempting to mutate public property \"" + key + "\". " +
                    "Properties starting with $ are reserved and readonly.", instance);
            return false;
        }
        else {
            if (("development" !== 'production') && key in instance.appContext.config.globalProperties) {
                Object.defineProperty(ctx, key, {
                    enumerable: true,
                    configurable: true,
                    value: value
                });
            }
            else {
                ctx[key] = value;
            }
        }
        return true;
    },
    has: function has(ref$$1, key) {
        var ref_ = ref$$1._;
        var data = ref_.data;
        var setupState = ref_.setupState;
        var accessCache = ref_.accessCache;
        var ctx = ref_.ctx;
        var appContext = ref_.appContext;
        var propsOptions = ref_.propsOptions;

        var normalizedProps;
        return (accessCache[key] !== undefined ||
            (data !== EMPTY_OBJ && hasOwn(data, key)) ||
            (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) ||
            ((normalizedProps = propsOptions[0]) && hasOwn(normalizedProps, key)) ||
            hasOwn(ctx, key) ||
            hasOwn(publicPropertiesMap, key) ||
            hasOwn(appContext.config.globalProperties, key));
    }
};
{
    PublicInstanceProxyHandlers.ownKeys = function (target) {
        warn("Avoid app logic that relies on enumerating keys on a component instance. " +
            "The keys will be empty in production mode to avoid performance overhead.");
        return Reflect.ownKeys(target);
    };
}
var RuntimeCompiledPublicInstanceProxyHandlers = extend({}, PublicInstanceProxyHandlers, {
    get: function get(target, key) {
        // fast path for unscopables when using `with` block
        if (key === Symbol.unscopables) {
            return;
        }
        return PublicInstanceProxyHandlers.get(target, key, target);
    },
    has: function has(_, key) {
        var has = key[0] !== '_' && !isGloballyWhitelisted(key);
        if (("development" !== 'production') && !has && PublicInstanceProxyHandlers.has(_, key)) {
            warn(("Property " + (JSON.stringify(key)) + " should not start with _ which is a reserved prefix for Vue internals."));
        }
        return has;
    }
});
var currentInstance = null;
var getCurrentInstance = function () { return currentInstance || currentRenderingInstance; };
var setCurrentInstance = function (instance) {
    currentInstance = instance;
};
var isBuiltInTag = /*#__PURE__*/ makeMap('slot,component');
var isInSSRComponentSetup = false;
// record effects created during a component's setup() so that they can be
// stopped when the component unmounts
function recordInstanceBoundEffect(effect$$1, instance) {
    if ( instance === void 0 ) instance = currentInstance;

    if (instance) {
        (instance.effects || (instance.effects = [])).push(effect$$1);
    }
}
var classifyRE = /(?:^|[-_])(\w)/g;
var classify = function (str) { return str.replace(classifyRE, function (c) { return c.toUpperCase(); }).replace(/[-_]/g, ''); };
function getComponentName(Component) {
    return isFunction(Component)
        ? Component.displayName || Component.name
        : Component.name;
}
/* istanbul ignore next */
function formatComponentName(instance, Component, isRoot) {
    if ( isRoot === void 0 ) isRoot = false;

    var name = getComponentName(Component);
    if (!name && Component.__file) {
        var match = Component.__file.match(/([^/\\]+)\.\w+$/);
        if (match) {
            name = match[1];
        }
    }
    if (!name && instance && instance.parent) {
        // try to infer the name based on reverse resolution
        var inferFromRegistry = function (registry) {
            for (var key in registry) {
                if (registry[key] === Component) {
                    return key;
                }
            }
        };
        name =
            inferFromRegistry(instance.components ||
                instance.parent.type.components) || inferFromRegistry(instance.appContext.components);
    }
    return name ? classify(name) : isRoot ? "App" : "Anonymous";
}
function isClassComponent(value) {
    return isFunction(value) && '__vccOpts' in value;
}

function computed$$1(getterOrOptions) {
    var c = computed$1(getterOrOptions);
    recordInstanceBoundEffect(c.effect);
    return c;
}

// Actual implementation
function h(type, propsOrChildren, children) {
    var l = arguments.length;
    if (l === 2) {
        if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
            // single vnode without props
            if (isVNode(propsOrChildren)) {
                return createVNode(type, null, [propsOrChildren]);
            }
            // props without children
            return createVNode(type, propsOrChildren);
        }
        else {
            // omit props
            return createVNode(type, null, propsOrChildren);
        }
    }
    else {
        if (l > 3) {
            children = Array.prototype.slice.call(arguments, 2);
        }
        else if (l === 3 && isVNode(children)) {
            children = [children];
        }
        return createVNode(type, propsOrChildren, children);
    }
}

function initCustomFormatter() {
    /* eslint-disable no-restricted-globals */
    if (!("development" !== 'production') || typeof window === 'undefined') {
        return;
    }
    var vueStyle = { style: 'color:#3ba776' };
    var numberStyle = { style: 'color:#0b1bc9' };
    var stringStyle = { style: 'color:#b62e24' };
    var keywordStyle = { style: 'color:#9d288c' };
    // custom formatter for Chrome
    // https://www.mattzeunert.com/2016/02/19/custom-chrome-devtools-object-formatters.html
    var formatter = {
        header: function header(obj) {
            // TODO also format ComponentPublicInstance & ctx.slots/attrs in setup
            if (!isObject(obj)) {
                return null;
            }
            if (obj.__isVue) {
                return ['div', vueStyle, "VueInstance"];
            }
            else if (isRef(obj)) {
                return [
                    'div',
                    {},
                    ['span', vueStyle, genRefFlag(obj)],
                    '<',
                    formatValue(obj.value),
                    ">"
                ];
            }
            else if (isReactive(obj)) {
                return [
                    'div',
                    {},
                    ['span', vueStyle, 'Reactive'],
                    '<',
                    formatValue(obj),
                    (">" + (isReadonly(obj) ? " (readonly)" : ""))
                ];
            }
            else if (isReadonly(obj)) {
                return [
                    'div',
                    {},
                    ['span', vueStyle, 'Readonly'],
                    '<',
                    formatValue(obj),
                    '>'
                ];
            }
            return null;
        },
        hasBody: function hasBody(obj) {
            return obj && obj.__isVue;
        },
        body: function body(obj) {
            if (obj && obj.__isVue) {
                return [
                    'div',
                    {} ].concat( formatInstance(obj.$)
                );
            }
        }
    };
    function formatInstance(instance) {
        var blocks = [];
        if (instance.type.props && instance.props) {
            blocks.push(createInstanceBlock('props', toRaw(instance.props)));
        }
        if (instance.setupState !== EMPTY_OBJ) {
            blocks.push(createInstanceBlock('setup', instance.setupState));
        }
        if (instance.data !== EMPTY_OBJ) {
            blocks.push(createInstanceBlock('data', toRaw(instance.data)));
        }
        var computed$$1 = extractKeys(instance, 'computed');
        if (computed$$1) {
            blocks.push(createInstanceBlock('computed', computed$$1));
        }
        var injected = extractKeys(instance, 'inject');
        if (injected) {
            blocks.push(createInstanceBlock('injected', injected));
        }
        blocks.push([
            'div',
            {},
            [
                'span',
                {
                    style: keywordStyle.style + ';opacity:0.66'
                },
                '$ (internal): '
            ],
            ['object', { object: instance }]
        ]);
        return blocks;
    }
    function createInstanceBlock(type, target) {
        target = extend({}, target);
        if (!Object.keys(target).length) {
            return ['span', {}];
        }
        return [
            'div',
            { style: 'line-height:1.25em;margin-bottom:0.6em' },
            [
                'div',
                {
                    style: 'color:#476582'
                },
                type
            ],
            [
                'div',
                {
                    style: 'padding-left:1.25em'
                } ].concat( Object.keys(target).map(function (key) {
                    return [
                        'div',
                        {},
                        ['span', keywordStyle, key + ': '],
                        formatValue(target[key], false)
                    ];
                })
            )
        ];
    }
    function formatValue(v, asRaw) {
        if ( asRaw === void 0 ) asRaw = true;

        if (typeof v === 'number') {
            return ['span', numberStyle, v];
        }
        else if (typeof v === 'string') {
            return ['span', stringStyle, JSON.stringify(v)];
        }
        else if (typeof v === 'boolean') {
            return ['span', keywordStyle, v];
        }
        else if (isObject(v)) {
            return ['object', { object: asRaw ? toRaw(v) : v }];
        }
        else {
            return ['span', stringStyle, String(v)];
        }
    }
    function extractKeys(instance, type) {
        var Comp = instance.type;
        if (isFunction(Comp)) {
            return;
        }
        var extracted = {};
        for (var key in instance.ctx) {
            if (isKeyOfType(Comp, key, type)) {
                extracted[key] = instance.ctx[key];
            }
        }
        return extracted;
    }
    function isKeyOfType(Comp, key, type) {
        var opts = Comp[type];
        if ((isArray(opts) && opts.includes(key)) ||
            (isObject(opts) && key in opts)) {
            return true;
        }
        if (Comp.extends && isKeyOfType(Comp.extends, key, type)) {
            return true;
        }
        if (Comp.mixins && Comp.mixins.some(function (m) { return isKeyOfType(m, key, type); })) {
            return true;
        }
    }
    function genRefFlag(v) {
        if (v._shallow) {
            return "ShallowRef";
        }
        if (v.effect) {
            return "ComputedRef";
        }
        return "Ref";
    }
    if (window.devtoolsFormatters) {
        window.devtoolsFormatters.push(formatter);
    }
    else {
        window.devtoolsFormatters = [formatter];
    }
}

var svgNS = 'http://www.w3.org/2000/svg';
var doc = (typeof document !== 'undefined' ? document : null);
var tempContainer;
var tempSVGContainer;
var nodeOps = {
    insert: function (child, parent, anchor) {
        parent.insertBefore(child, anchor || null);
    },
    remove: function (child) {
        var parent = child.parentNode;
        if (parent) {
            parent.removeChild(child);
        }
    },
    createElement: function (tag, isSVG, is) { return isSVG
        ? doc.createElementNS(svgNS, tag)
        : doc.createElement(tag, is ? { is: is } : undefined); },
    createText: function (text) { return doc.createTextNode(text); },
    createComment: function (text) { return doc.createComment(text); },
    setText: function (node, text) {
        node.nodeValue = text;
    },
    setElementText: function (el, text) {
        el.textContent = text;
    },
    parentNode: function (node) { return node.parentNode; },
    nextSibling: function (node) { return node.nextSibling; },
    querySelector: function (selector) { return doc.querySelector(selector); },
    setScopeId: function setScopeId(el, id) {
        el.setAttribute(id, '');
    },
    cloneNode: function cloneNode(el) {
        return el.cloneNode(true);
    },
    // __UNSAFE__
    // Reason: innerHTML.
    // Static content here can only come from compiled templates.
    // As long as the user only uses trusted templates, this is safe.
    insertStaticContent: function insertStaticContent(content, parent, anchor, isSVG) {
        var temp = isSVG
            ? tempSVGContainer ||
                (tempSVGContainer = doc.createElementNS(svgNS, 'svg'))
            : tempContainer || (tempContainer = doc.createElement('div'));
        temp.innerHTML = content;
        var first = temp.firstChild;
        var node = first;
        var last = node;
        while (node) {
            last = node;
            nodeOps.insert(node, parent, anchor);
            node = temp.firstChild;
        }
        return [first, last];
    }
};

// compiler should normalize class + :class bindings on the same element
// into a single binding ['staticClass', dynamic]
function patchClass(el, value, isSVG) {
    if (value == null) {
        value = '';
    }
    if (isSVG) {
        el.setAttribute('class', value);
    }
    else {
        // directly setting className should be faster than setAttribute in theory
        // if this is an element during a transition, take the temporary transition
        // classes into account.
        var transitionClasses = el._vtc;
        if (transitionClasses) {
            value = (value
                ? [value ].concat( transitionClasses)
                : [].concat( transitionClasses )).join(' ');
        }
        el.className = value;
    }
}

function patchStyle(el, prev, next) {
    var style = el.style;
    if (!next) {
        el.removeAttribute('style');
    }
    else if (isString(next)) {
        if (prev !== next) {
            style.cssText = next;
        }
    }
    else {
        for (var key in next) {
            setStyle(style, key, next[key]);
        }
        if (prev && !isString(prev)) {
            for (var key$1 in prev) {
                if (next[key$1] == null) {
                    setStyle(style, key$1, '');
                }
            }
        }
    }
}
var importantRE = /\s*!important$/;
function setStyle(style, name, val) {
    if (isArray(val)) {
        val.forEach(function (v) { return setStyle(style, name, v); });
    }
    else {
        if (name.startsWith('--')) {
            // custom property definition
            style.setProperty(name, val);
        }
        else {
            var prefixed = autoPrefix(style, name);
            if (importantRE.test(val)) {
                // !important
                style.setProperty(hyphenate(prefixed), val.replace(importantRE, ''), 'important');
            }
            else {
                style[prefixed] = val;
            }
        }
    }
}
var prefixes = ['Webkit', 'Moz', 'ms'];
var prefixCache = {};
function autoPrefix(style, rawName) {
    var cached = prefixCache[rawName];
    if (cached) {
        return cached;
    }
    var name = camelize(rawName);
    if (name !== 'filter' && name in style) {
        return (prefixCache[rawName] = name);
    }
    name = capitalize(name);
    for (var i = 0; i < prefixes.length; i++) {
        var prefixed = prefixes[i] + name;
        if (prefixed in style) {
            return (prefixCache[rawName] = prefixed);
        }
    }
    return rawName;
}

var xlinkNS = 'http://www.w3.org/1999/xlink';
function patchAttr(el, key, value, isSVG) {
    if (isSVG && key.startsWith('xlink:')) {
        if (value == null) {
            el.removeAttributeNS(xlinkNS, key.slice(6, key.length));
        }
        else {
            el.setAttributeNS(xlinkNS, key, value);
        }
    }
    else {
        // note we are only checking boolean attributes that don't have a
        // corresponding dom prop of the same name here.
        var isBoolean = isSpecialBooleanAttr(key);
        if (value == null || (isBoolean && value === false)) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, isBoolean ? '' : value);
        }
    }
}

// __UNSAFE__
// functions. The user is responsible for using them with only trusted content.
function patchDOMProp(el, key, value, 
// the following args are passed only due to potential innerHTML/textContent
// overriding existing VNodes, in which case the old tree must be properly
// unmounted.
prevChildren, parentComponent, parentSuspense, unmountChildren) {
    if (key === 'innerHTML' || key === 'textContent') {
        if (prevChildren) {
            unmountChildren(prevChildren, parentComponent, parentSuspense);
        }
        el[key] = value == null ? '' : value;
        return;
    }
    if (key === 'value' && el.tagName !== 'PROGRESS') {
        // store value as _value as well since
        // non-string values will be stringified.
        el._value = value;
        var newValue = value == null ? '' : value;
        if (el.value !== newValue) {
            el.value = newValue;
        }
        return;
    }
    if (value === '' || value == null) {
        var type = typeof el[key];
        if (value === '' && type === 'boolean') {
            // e.g. <select multiple> compiles to { multiple: '' }
            el[key] = true;
            return;
        }
        else if (value == null && type === 'string') {
            // e.g. <div :id="null">
            el[key] = '';
            el.removeAttribute(key);
            return;
        }
        else if (type === 'number') {
            // e.g. <img :width="null">
            el[key] = 0;
            el.removeAttribute(key);
            return;
        }
    }
    // some properties perform value validation and throw
    try {
        el[key] = value;
    }
    catch (e) {
        {
            warn("Failed setting prop \"" + key + "\" on <" + (el.tagName.toLowerCase()) + ">: " +
                "value " + value + " is invalid.", e);
        }
    }
}

// Async edge case fix requires storing an event listener's attach timestamp.
var _getNow = Date.now;
// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
if (typeof document !== 'undefined' &&
    _getNow() > document.createEvent('Event').timeStamp) {
    // if the low-res timestamp which is bigger than the event timestamp
    // (which is evaluated AFTER) it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listeners as well.
    _getNow = function () { return performance.now(); };
}
// To avoid the overhead of repeatedly calling performance.now(), we cache
// and use the same timestamp for all event listeners attached in the same tick.
var cachedNow = 0;
var p = Promise.resolve();
var reset = function () {
    cachedNow = 0;
};
var getNow = function () { return cachedNow || (p.then(reset), cachedNow = _getNow()); };
function addEventListener(el, event, handler, options) {
    el.addEventListener(event, handler, options);
}
function removeEventListener(el, event, handler, options) {
    el.removeEventListener(event, handler, options);
}
function patchEvent(el, rawName, prevValue, nextValue, instance) {
    if ( instance === void 0 ) instance = null;

    // vei = vue event invokers
    var invokers = el._vei || (el._vei = {});
    var existingInvoker = invokers[rawName];
    if (nextValue && existingInvoker) {
        // patch
        existingInvoker.value = nextValue;
    }
    else {
        var ref = parseName(rawName);
        var name = ref[0];
        var options = ref[1];
        if (nextValue) {
            // add
            var invoker = (invokers[rawName] = createInvoker(nextValue, instance));
            addEventListener(el, name, invoker, options);
        }
        else if (existingInvoker) {
            // remove
            removeEventListener(el, name, existingInvoker, options);
            invokers[rawName] = undefined;
        }
    }
}
var optionsModifierRE = /(?:Once|Passive|Capture)$/;
function parseName(name) {
    var options;
    if (optionsModifierRE.test(name)) {
        options = {};
        var m;
        while ((m = name.match(optionsModifierRE))) {
            name = name.slice(0, name.length - m[0].length);
            options[m[0].toLowerCase()] = true;
        }
    }
    return [name.slice(2).toLowerCase(), options];
}
function createInvoker(initialValue, instance) {
    var invoker = function (e) {
        // async edge case #6566: inner click event triggers patch, event handler
        // attached to outer element during patch, and triggered again. This
        // happens because browsers fire microtask ticks between event propagation.
        // the solution is simple: we save the timestamp when a handler is attached,
        // and the handler would only fire if the event passed to it was fired
        // AFTER it was attached.
        var timeStamp = e.timeStamp || _getNow();
        if (timeStamp >= invoker.attached - 1) {
            callWithAsyncErrorHandling(patchStopImmediatePropagation(e, invoker.value), instance, 5 /* NATIVE_EVENT_HANDLER */, [e]);
        }
    };
    invoker.value = initialValue;
    invoker.attached = getNow();
    return invoker;
}
function patchStopImmediatePropagation(e, value) {
    if (isArray(value)) {
        var originalStop = e.stopImmediatePropagation;
        e.stopImmediatePropagation = function () {
            originalStop.call(e);
            e._stopped = true;
        };
        return value.map(function (fn) { return function (e) { return !e._stopped && fn(e); }; });
    }
    else {
        return value;
    }
}

var nativeOnRE = /^on[a-z]/;
var forcePatchProp = function (_, key) { return key === 'value'; };
var patchProp = function (el, key, prevValue, nextValue, isSVG, prevChildren, parentComponent, parentSuspense, unmountChildren) {
    if ( isSVG === void 0 ) isSVG = false;

    switch (key) {
        // special
        case 'class':
            patchClass(el, nextValue, isSVG);
            break;
        case 'style':
            patchStyle(el, prevValue, nextValue);
            break;
        default:
            if (isOn(key)) {
                // ignore v-model listeners
                if (!isModelListener(key)) {
                    patchEvent(el, key, prevValue, nextValue, parentComponent);
                }
            }
            else if (shouldSetAsProp(el, key, nextValue, isSVG)) {
                patchDOMProp(el, key, nextValue, prevChildren, parentComponent, parentSuspense, unmountChildren);
            }
            else {
                // special case for <input v-model type="checkbox"> with
                // :true-value & :false-value
                // store value as dom properties since non-string values will be
                // stringified.
                if (key === 'true-value') {
                    el._trueValue = nextValue;
                }
                else if (key === 'false-value') {
                    el._falseValue = nextValue;
                }
                patchAttr(el, key, nextValue, isSVG);
            }
            break;
    }
};
function shouldSetAsProp(el, key, value, isSVG) {
    if (isSVG) {
        // most keys must be set as attribute on svg elements to work
        // ...except innerHTML
        if (key === 'innerHTML') {
            return true;
        }
        // or native onclick with function values
        if (key in el && nativeOnRE.test(key) && isFunction(value)) {
            return true;
        }
        return false;
    }
    // spellcheck and draggable are numerated attrs, however their
    // corresponding DOM properties are actually booleans - this leads to
    // setting it with a string "false" value leading it to be coerced to
    // `true`, so we need to always treat them as attributes.
    // Note that `contentEditable` doesn't have this problem: its DOM
    // property is also enumerated string values.
    if (key === 'spellcheck' || key === 'draggable') {
        return false;
    }
    // #1787 form as an attribute must be a string, while it accepts an Element as
    // a prop
    if (key === 'form' && typeof value === 'string') {
        return false;
    }
    // #1526 <input list> must be set as attribute
    if (key === 'list' && el.tagName === 'INPUT') {
        return false;
    }
    // native onclick with string value, must be set as attribute
    if (nativeOnRE.test(key) && isString(value)) {
        return false;
    }
    return key in el;
}

var TRANSITION = 'transition';
var ANIMATION = 'animation';
// DOM Transition is a higher-order-component based on the platform-agnostic
// base Transition component, with DOM-specific logic.
var Transition = function (props, ref) {
    var slots = ref.slots;

    return h(BaseTransition, resolveTransitionProps(props), slots);
};
Transition.displayName = 'Transition';
var DOMTransitionPropsValidators = {
    name: String,
    type: String,
    css: {
        type: Boolean,
        default: true
    },
    duration: [String, Number, Object],
    enterFromClass: String,
    enterActiveClass: String,
    enterToClass: String,
    appearFromClass: String,
    appearActiveClass: String,
    appearToClass: String,
    leaveFromClass: String,
    leaveActiveClass: String,
    leaveToClass: String
};
var TransitionPropsValidators = (Transition.props = /*#__PURE__*/ extend({}, BaseTransition.props, DOMTransitionPropsValidators));
function resolveTransitionProps(rawProps) {
    var name = rawProps.name; if ( name === void 0 ) name = 'v';
    var type = rawProps.type;
    var css = rawProps.css; if ( css === void 0 ) css = true;
    var duration = rawProps.duration;
    var enterFromClass = rawProps.enterFromClass; if ( enterFromClass === void 0 ) enterFromClass = name + "-enter-from";
    var enterActiveClass = rawProps.enterActiveClass; if ( enterActiveClass === void 0 ) enterActiveClass = name + "-enter-active";
    var enterToClass = rawProps.enterToClass; if ( enterToClass === void 0 ) enterToClass = name + "-enter-to";
    var appearFromClass = rawProps.appearFromClass; if ( appearFromClass === void 0 ) appearFromClass = enterFromClass;
    var appearActiveClass = rawProps.appearActiveClass; if ( appearActiveClass === void 0 ) appearActiveClass = enterActiveClass;
    var appearToClass = rawProps.appearToClass; if ( appearToClass === void 0 ) appearToClass = enterToClass;
    var leaveFromClass = rawProps.leaveFromClass; if ( leaveFromClass === void 0 ) leaveFromClass = name + "-leave-from";
    var leaveActiveClass = rawProps.leaveActiveClass; if ( leaveActiveClass === void 0 ) leaveActiveClass = name + "-leave-active";
    var leaveToClass = rawProps.leaveToClass; if ( leaveToClass === void 0 ) leaveToClass = name + "-leave-to";
    var baseProps = {};
    for (var key in rawProps) {
        if (!(key in DOMTransitionPropsValidators)) {
            baseProps[key] = rawProps[key];
        }
    }
    if (!css) {
        return baseProps;
    }
    var durations = normalizeDuration(duration);
    var enterDuration = durations && durations[0];
    var leaveDuration = durations && durations[1];
    var onBeforeEnter = baseProps.onBeforeEnter;
    var onEnter = baseProps.onEnter;
    var onEnterCancelled = baseProps.onEnterCancelled;
    var onLeave = baseProps.onLeave;
    var onLeaveCancelled = baseProps.onLeaveCancelled;
    var onBeforeAppear = baseProps.onBeforeAppear; if ( onBeforeAppear === void 0 ) onBeforeAppear = onBeforeEnter;
    var onAppear = baseProps.onAppear; if ( onAppear === void 0 ) onAppear = onEnter;
    var onAppearCancelled = baseProps.onAppearCancelled; if ( onAppearCancelled === void 0 ) onAppearCancelled = onEnterCancelled;
    var finishEnter = function (el, isAppear, done) {
        removeTransitionClass(el, isAppear ? appearToClass : enterToClass);
        removeTransitionClass(el, isAppear ? appearActiveClass : enterActiveClass);
        done && done();
    };
    var finishLeave = function (el, done) {
        removeTransitionClass(el, leaveToClass);
        removeTransitionClass(el, leaveActiveClass);
        done && done();
    };
    var makeEnterHook = function (isAppear) {
        return function (el, done) {
            var hook = isAppear ? onAppear : onEnter;
            var resolve = function () { return finishEnter(el, isAppear, done); };
            hook && hook(el, resolve);
            nextFrame(function () {
                removeTransitionClass(el, isAppear ? appearFromClass : enterFromClass);
                addTransitionClass(el, isAppear ? appearToClass : enterToClass);
                if (!(hook && hook.length > 1)) {
                    whenTransitionEnds(el, type, enterDuration, resolve);
                }
            });
        };
    };
    return extend(baseProps, {
        onBeforeEnter: function onBeforeEnter$1(el) {
            onBeforeEnter && onBeforeEnter(el);
            addTransitionClass(el, enterFromClass);
            addTransitionClass(el, enterActiveClass);
        },
        onBeforeAppear: function onBeforeAppear$1(el) {
            onBeforeAppear && onBeforeAppear(el);
            addTransitionClass(el, appearFromClass);
            addTransitionClass(el, appearActiveClass);
        },
        onEnter: makeEnterHook(false),
        onAppear: makeEnterHook(true),
        onLeave: function onLeave$1(el, done) {
            var resolve = function () { return finishLeave(el, done); };
            addTransitionClass(el, leaveFromClass);
            // force reflow so *-leave-from classes immediately take effect (#2593)
            forceReflow();
            addTransitionClass(el, leaveActiveClass);
            nextFrame(function () {
                removeTransitionClass(el, leaveFromClass);
                addTransitionClass(el, leaveToClass);
                if (!(onLeave && onLeave.length > 1)) {
                    whenTransitionEnds(el, type, leaveDuration, resolve);
                }
            });
            onLeave && onLeave(el, resolve);
        },
        onEnterCancelled: function onEnterCancelled$1(el) {
            finishEnter(el, false);
            onEnterCancelled && onEnterCancelled(el);
        },
        onAppearCancelled: function onAppearCancelled$1(el) {
            finishEnter(el, true);
            onAppearCancelled && onAppearCancelled(el);
        },
        onLeaveCancelled: function onLeaveCancelled$1(el) {
            finishLeave(el);
            onLeaveCancelled && onLeaveCancelled(el);
        }
    });
}
function normalizeDuration(duration) {
    if (duration == null) {
        return null;
    }
    else if (isObject(duration)) {
        return [NumberOf(duration.enter), NumberOf(duration.leave)];
    }
    else {
        var n = NumberOf(duration);
        return [n, n];
    }
}
function NumberOf(val) {
    var res = toNumber(val);
    { validateDuration(res); }
    return res;
}
function validateDuration(val) {
    if (typeof val !== 'number') {
        warn("<transition> explicit duration is not a valid number - " +
            "got " + (JSON.stringify(val)) + ".");
    }
    else if (isNaN(val)) {
        warn("<transition> explicit duration is NaN - " +
            'the duration expression might be incorrect.');
    }
}
function addTransitionClass(el, cls) {
    cls.split(/\s+/).forEach(function (c) { return c && el.classList.add(c); });
    (el._vtc ||
        (el._vtc = new Set())).add(cls);
}
function removeTransitionClass(el, cls) {
    cls.split(/\s+/).forEach(function (c) { return c && el.classList.remove(c); });
    var _vtc = el._vtc;
    if (_vtc) {
        _vtc.delete(cls);
        if (!_vtc.size) {
            el._vtc = undefined;
        }
    }
}
function nextFrame(cb) {
    requestAnimationFrame(function () {
        requestAnimationFrame(cb);
    });
}
var endId = 0;
function whenTransitionEnds(el, expectedType, explicitTimeout, resolve) {
    var id = (el._endId = ++endId);
    var resolveIfNotStale = function () {
        if (id === el._endId) {
            resolve();
        }
    };
    if (explicitTimeout) {
        return setTimeout(resolveIfNotStale, explicitTimeout);
    }
    var ref = getTransitionInfo(el, expectedType);
    var type = ref.type;
    var timeout = ref.timeout;
    var propCount = ref.propCount;
    if (!type) {
        return resolve();
    }
    var endEvent = type + 'end';
    var ended = 0;
    var end = function () {
        el.removeEventListener(endEvent, onEnd);
        resolveIfNotStale();
    };
    var onEnd = function (e) {
        if (e.target === el && ++ended >= propCount) {
            end();
        }
    };
    setTimeout(function () {
        if (ended < propCount) {
            end();
        }
    }, timeout + 1);
    el.addEventListener(endEvent, onEnd);
}
function getTransitionInfo(el, expectedType) {
    var styles = window.getComputedStyle(el);
    // JSDOM may return undefined for transition properties
    var getStyleProperties = function (key) { return (styles[key] || '').split(', '); };
    var transitionDelays = getStyleProperties(TRANSITION + 'Delay');
    var transitionDurations = getStyleProperties(TRANSITION + 'Duration');
    var transitionTimeout = getTimeout(transitionDelays, transitionDurations);
    var animationDelays = getStyleProperties(ANIMATION + 'Delay');
    var animationDurations = getStyleProperties(ANIMATION + 'Duration');
    var animationTimeout = getTimeout(animationDelays, animationDurations);
    var type = null;
    var timeout = 0;
    var propCount = 0;
    /* istanbul ignore if */
    if (expectedType === TRANSITION) {
        if (transitionTimeout > 0) {
            type = TRANSITION;
            timeout = transitionTimeout;
            propCount = transitionDurations.length;
        }
    }
    else if (expectedType === ANIMATION) {
        if (animationTimeout > 0) {
            type = ANIMATION;
            timeout = animationTimeout;
            propCount = animationDurations.length;
        }
    }
    else {
        timeout = Math.max(transitionTimeout, animationTimeout);
        type =
            timeout > 0
                ? transitionTimeout > animationTimeout
                    ? TRANSITION
                    : ANIMATION
                : null;
        propCount = type
            ? type === TRANSITION
                ? transitionDurations.length
                : animationDurations.length
            : 0;
    }
    var hasTransform = type === TRANSITION &&
        /\b(transform|all)(,|$)/.test(styles[TRANSITION + 'Property']);
    return {
        type: type,
        timeout: timeout,
        propCount: propCount,
        hasTransform: hasTransform
    };
}
function getTimeout(delays, durations) {
    while (delays.length < durations.length) {
        delays = delays.concat(delays);
    }
    return Math.max.apply(Math, durations.map(function (d, i) { return toMs(d) + toMs(delays[i]); }));
}
// Old versions of Chromium (below 61.0.3163.100) formats floating pointer
// numbers in a locale-dependent way, using a comma instead of a dot.
// If comma is not replaced with a dot, the input will be rounded down
// (i.e. acting as a floor function) causing unexpected behaviors
function toMs(s) {
    return Number(s.slice(0, -1).replace(',', '.')) * 1000;
}
// synchronously force layout to put elements into a certain state
function forceReflow() {
    return document.body.offsetHeight;
}

var positionMap = new WeakMap();
var newPositionMap = new WeakMap();
var TransitionGroupImpl = {
    name: 'TransitionGroup',
    props: /*#__PURE__*/ extend({}, TransitionPropsValidators, {
        tag: String,
        moveClass: String
    }),
    setup: function setup(props, ref) {
        var slots = ref.slots;

        var instance = getCurrentInstance();
        var state = useTransitionState();
        var prevChildren;
        var children;
        onUpdated(function () {
            // children is guaranteed to exist after initial render
            if (!prevChildren.length) {
                return;
            }
            var moveClass = props.moveClass || ((props.name || 'v') + "-move");
            if (!hasCSSTransform(prevChildren[0].el, instance.vnode.el, moveClass)) {
                return;
            }
            // we divide the work into three loops to avoid mixing DOM reads and writes
            // in each iteration - which helps prevent layout thrashing.
            prevChildren.forEach(callPendingCbs);
            prevChildren.forEach(recordPosition);
            var movedChildren = prevChildren.filter(applyTranslation);
            // force reflow to put everything in position
            forceReflow();
            movedChildren.forEach(function (c) {
                var el = c.el;
                var style = el.style;
                addTransitionClass(el, moveClass);
                style.transform = style.webkitTransform = style.transitionDuration = '';
                var cb = (el._moveCb = function (e) {
                    if (e && e.target !== el) {
                        return;
                    }
                    if (!e || /transform$/.test(e.propertyName)) {
                        el.removeEventListener('transitionend', cb);
                        el._moveCb = null;
                        removeTransitionClass(el, moveClass);
                    }
                });
                el.addEventListener('transitionend', cb);
            });
        });
        return function () {
            var rawProps = toRaw(props);
            var cssTransitionProps = resolveTransitionProps(rawProps);
            var tag = rawProps.tag || Fragment;
            prevChildren = children;
            children = slots.default ? getTransitionRawChildren(slots.default()) : [];
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (child.key != null) {
                    setTransitionHooks(child, resolveTransitionHooks(child, cssTransitionProps, state, instance));
                }
                else {
                    warn("<TransitionGroup> children must be keyed.");
                }
            }
            if (prevChildren) {
                for (var i$1 = 0; i$1 < prevChildren.length; i$1++) {
                    var child$1 = prevChildren[i$1];
                    setTransitionHooks(child$1, resolveTransitionHooks(child$1, cssTransitionProps, state, instance));
                    positionMap.set(child$1, child$1.el.getBoundingClientRect());
                }
            }
            return createVNode(tag, null, children);
        };
    }
};
function callPendingCbs(c) {
    var el = c.el;
    if (el._moveCb) {
        el._moveCb();
    }
    if (el._enterCb) {
        el._enterCb();
    }
}
function recordPosition(c) {
    newPositionMap.set(c, c.el.getBoundingClientRect());
}
function applyTranslation(c) {
    var oldPos = positionMap.get(c);
    var newPos = newPositionMap.get(c);
    var dx = oldPos.left - newPos.left;
    var dy = oldPos.top - newPos.top;
    if (dx || dy) {
        var s = c.el.style;
        s.transform = s.webkitTransform = "translate(" + dx + "px," + dy + "px)";
        s.transitionDuration = '0s';
        return c;
    }
}
function hasCSSTransform(el, root, moveClass) {
    // Detect whether an element with the move class applied has
    // CSS transitions. Since the element may be inside an entering
    // transition at this very moment, we make a clone of it and remove
    // all other transition classes applied to ensure only the move class
    // is applied.
    var clone = el.cloneNode();
    if (el._vtc) {
        el._vtc.forEach(function (cls) {
            cls.split(/\s+/).forEach(function (c) { return c && clone.classList.remove(c); });
        });
    }
    moveClass.split(/\s+/).forEach(function (c) { return c && clone.classList.add(c); });
    clone.style.display = 'none';
    var container = (root.nodeType === 1
        ? root
        : root.parentNode);
    container.appendChild(clone);
    var ref = getTransitionInfo(clone);
    var hasTransform = ref.hasTransform;
    container.removeChild(clone);
    return hasTransform;
}

var rendererOptions = extend({ patchProp: patchProp, forcePatchProp: forcePatchProp }, nodeOps);

function initDev() {
    var target = getGlobalThis();
    target.__VUE__ = true;
    setDevtoolsHook(target.__VUE_DEVTOOLS_GLOBAL_HOOK__);
    {
        initCustomFormatter();
    }
}

// This entry exports the runtime only, and is built as
("development" !== 'production') && initDev();

/**
 * LookupPlugin
 * @param {Object} configuration
 * @param {Object|Function} configuration.mapComponents - Key value pair of component mapping or a function that returns it
 * @param {Object|Function} configuration.mapProps - Key value pair of prop mapping or a function that returns it
 *
 * @returns {Function}
 */
function LookupPlugin (ref) {
  var mapComponents = ref.mapComponents; if ( mapComponents === void 0 ) mapComponents = {};
  var mapProps = ref.mapProps; if ( mapProps === void 0 ) mapProps = null;

  return function (baseReturns) {
    var parsedSchema = baseReturns.parsedSchema;

    var replacedSchema = computed$$1(function () {
      var schemaWithRemappedProps = mapProperties(parsedSchema.value, mapProps);

      return mapComps(schemaWithRemappedProps, mapComponents)
    });

    return Object.assign({}, baseReturns,
      {parsedSchema: replacedSchema})
  }
}

/**
 * For a Schema, find the elements in each of the rows and remap the element with the given function
 * @param {Array} schema
 * @param {Function} fn
 *
 * @returns {Array}
 */
var mapElementsInSchema = function (schema, fn) { return schema.map(function (row) { return row.map(function (el) { return fn(el); }); }); };

/**
 * Remap components in a schema
 * @param {Array} schema - The schema
 * @param {Object|Function} mapComponents
 *
* @returns {Array}
 */
var mapComps = function (schema, mapComponents) {
  return mapElementsInSchema(schema, function (el) {
    var newKey = mapComponents[el.component];

    if (!newKey) { return Object.assign({}, el) }

    return Object.assign({}, el,
      {component: mapComponents[el.component]})
  })
};

/**
 * Remap properties in a schema
 * @param {Array} schema - The schema
 * @param {Function|Object} mapProps - A key pair value object or function that returns it
 *
 * @returns {Array}
 */
var mapProperties = function (schema, mapProps) {
  if (!mapProps || !['object', 'function'].includes(typeof mapProps)) { return schema }

  if (typeof mapProps === 'function') {
    return mapPropertiesWithUserFunction(schema, mapProps)
  }

  var schemaCopy;
  var loop = function ( prop ) {
    schemaCopy = mapElementsInSchema(schema, function (el) {
      return replacePropInElement(el, prop, mapProps[prop])
    });
  };

  for (var prop in mapProps) loop( prop );

  return schemaCopy
};

/**
 * Remap properties using a user defined function
 * @param {Array} schema
 * @param {Function} fn
 *
 * @returns {Array} - Parsed schema
 */
var mapPropertiesWithUserFunction = function (schema, fn) {
  var mapPropsForElement = function (el, fn) {
    var map = fn(el);
    for (var prop in map) {
      el = replacePropInElement(
        el, prop, map[prop]
      );
    }

    return el
  };

  return mapElementsInSchema(schema, function (el) {
    return mapPropsForElement(el, fn)
  })
};

/**
 *
 * @param {Object} el - The element to replace props in
 * @param {String} prop - The prop to replace or fn to pick the prop
 * @param {String|Function|Boolean} replacement - The replacement for the prop, a function that returns it or the boolean "false" to delete it
 *
 * @returns {Object} - The replaced element
 */
var replacePropInElement = function (el, prop, replacement) {
  var propReplacement = replacement;
  if (typeof replacement === 'function') {
    // If replacement is a function, call it to get
    // the prop to be replaced. If its falsey, then return
    // the element as is
    propReplacement = replacement(el);

    if (!propReplacement) { return el }
  }

  if (!(prop in el)) {
    if (process.env && "development" !== 'production') {
      console.warn(("LookupPlugin: property \"" + prop + "\" not found in"), el);
    }

    // Return the el without replacing
    return el
  }

  var originalValue = el[prop];
  var elementCopy = Object.assign({}, el);

  delete elementCopy[prop];

  if (propReplacement === false) {
    return elementCopy
  }

  elementCopy[propReplacement] = originalValue;

  return elementCopy
};

exports['default'] = LookupPlugin;
exports.mapElementsInSchema = mapElementsInSchema;

Object.defineProperty(exports, '__esModule', { value: true });

})));
