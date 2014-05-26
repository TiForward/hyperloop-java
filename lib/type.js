/**
 * Java specific type library subclass
 */

var hyperloop = require('./dev').require('hyperloop-common'),
	typelib = hyperloop.compiler.type,
	SuperClass = typelib.Class,
	util = hyperloop.util,
	log = hyperloop.log,
	_ = require('underscore');

JavaType.prototype = Object.create(SuperClass.prototype);
JavaType.prototype.constructor = JavaType;
JavaType.prototype.$super = SuperClass.prototype;

function JavaType() { 
	SuperClass.apply(this,arguments);
}

JavaType.prototype.isInstanceType = function() {
	return this._instancetype;
};

JavaType.prototype.getAssignmentCast = function(value) {
	if (this._type == 'byte') {
		return '(unsigned char)'+value;
	} else if (this._nativetype == SuperClass.NATIVE_PRIMITIVE) {
		return '('+this._type+')'+value;
	} else if (this._nativetype == SuperClass.NATIVE_BOOLEAN) {
		return '(bool)('+value+'==JNI_TRUE ? true : false)';
	}
	return this.$super.getAssignmentCast.call(this,value);
};

JavaType.prototype.toNativeBody = function(varname, preamble, cleanup, declare) {
	if (this._nativetype == SuperClass.NATIVE_ARRAY) {
		if (this._jsarraytype._type == 'char') {
			return 'JSValueTo_JavaCharArray(ctx,'+varname+',exception)';
		} else if (this._jsarraytype._jstype == SuperClass.JS_NUMBER) {
			return 'JSValueTo_Java'+this._jsarraytype.toJNICallType()+'Array(ctx,'+varname+',exception)';
		} else if (this._jsarraytype._jstype == SuperClass.JS_BOOLEAN) {
			return 'JSValueTo_JavaBooleanArray(ctx,'+varname+',exception)';
		}
		return 'JSValueTo_JavaObject(ctx,'+varname+',exception)';
	} else {
		return this.$super.toNativeBody.call(this, varname, preamble, cleanup, declare);
	}
};

/*
 * java.lang.String -> java/lang/String
 * java.lang.String[] -> [Ljava/lang/String;
 * 
 * Needed just because Android NDK can't resolve Ljava/lang/String; type signature
 */
JavaType.prototype.toJNISignatureSimple = function() {
	var sig = this.toJNISignature();
	var is_array = sig.match(/\[/g);
	if (is_array === null) {
		return sig.replace(/^L/,'').replace(/;$/,'');
	} else {
		return sig;
	}
};

/*
 * java.lang.String -> Ljava/lang/String;
 * java.lang.String[] -> [Ljava/lang/String;
 */
JavaType.prototype.toJNISignature = function() {
	var is_array = this._type.match(/\[/g);
	var rawtype = this._type.replace(/\./g,'/').replace(/[\[\]]/g,'');

	var br = '';
	if (is_array !== null) {
		for (var i = 0; i < is_array.length; i++) {
			br = '[' + br;
		}
	}

	switch (rawtype) {
		case 'boolean': {
			return br + 'Z';
		}
		case 'byte': {
			return br + 'B';
		}
		case 'char': {
			return br + 'C';
		}
		case 'short': {
			return br + 'S';
		}
		case 'int': {
			return br + 'I'
		}
		case 'long': {
			return br + 'J';
		}
		case 'float': {
			return br + 'F';
		}
		case 'double': {
			return br + 'D';
		}
		case 'void' : {
			return 'V';
		}
	}
	return br + 'L' + rawtype + ';';
};

JavaType.prototype.toJNICallType = function() {
	var type = this._type;
	switch (type) {
		case 'void': {
			return 'Void';
		}
		case 'boolean': {
			return 'Boolean';
		}
		case 'byte': {
			return 'Byte';
		}
		case 'char': {
			return 'Char';
		}
		case 'short': {
			return 'Short';
		}
		case 'int': {
			return 'Int';
		}
		case 'float': {
			return 'Float';
		}
		case 'long': {
			return 'Long';
		}
		case 'double': {
			return 'Double';
		}
		default: {
			return 'Object';
		}
	}
};

JavaType.prototype.addCastToJNICall = function(call) {
	if (this._nativetype == SuperClass.NATIVE_ARRAY) {
		call = 'reinterpret_cast<'+this.toCast()+'>('+call+')';
	}
	return call;
};

JavaType.prototype.getJNICall = function(instance, env, cls, object, mid, args) {
	var static_call = instance ? '' : 'Static';
	if (args.length > 0) args.unshift('');
	return this.addCastToJNICall(env+'->Call'+static_call+this.toJNICallType()+'Method('+(instance ? object : cls)+','+mid+args.join(',')+')');
};

JavaType.prototype.getJNIPropertyGetter = function(instance, env, cls, object, fid) {
	var static_call = instance ? '' : 'Static';
	return this.addCastToJNICall(env+'->Get'+static_call+this.toJNICallType()+'Field('+(instance ? object : cls)+','+fid+')');
};

JavaType.prototype.getJNIPropertySetter = function(instance, env, cls, object, fid, value) {
	var static_call = instance ? '' : 'Static';
	return this.addCastToJNICall(env+'->Set'+static_call+this.toJNICallType()+'Field('+(instance ? object : cls)+','+fid+','+value+')');
};

JavaType.prototype.getJNIType = function(leaveCast) {
	if (this._nativetype == SuperClass.NATIVE_ARRAY) {
		return this._jsarraytype.getJNIType()+'Array';
	} else if (this._nativetype == SuperClass.NATIVE_OBJECT) {
		return 'jobject';
	} else if (this._nativetype == SuperClass.NATIVE_BOOLEAN) {
		return 'jboolean';
	}
	switch(this._type) {
		case 'void': {
			return 'void';
		}
		case 'byte': {
			return 'jbyte';
		}
		case 'char': {
			return 'jchar';
		}
		case 'short': {
			return 'jshort';
		}
		case 'int': {
			return 'jint';
		}
		case 'float': {
			return 'jfloat';
		}
		case 'double': {
			return 'jdouble';
		}
		case 'long': {
			return 'jlong';
		}
		default: {
			return 'jobject';
		}
	}
};

JavaType.prototype.toCast = function(leaveCast) {
	return this.getJNIType();
};

JavaType.prototype.safeName = function(name) {
	return util.sanitizeSymbolName(name);
};

JavaType.prototype.toJSBody = function(varname, preamble, cleanup, declare) {
	if (this._jstype == SuperClass.JS_STRING) {
		if (this._length==1) {
			return 'HyperloopMakeStringFromJChar(ctx,(jchar *)&'+varname+',1,exception)';
		}
		return 'HyperloopMakeJavaStringFromJChar(ctx,'+varname+','+this._length+',exception)';
	}
	return this.$super.toJSBody.call(this, varname, preamble, cleanup, declare);
};

JavaType.prototype._parse = function(metabase) {
	var type = this._type;
	switch (type) {
		case 'boolean': {
			this._jstype = SuperClass.JS_BOOLEAN;
			this._nativetype = SuperClass.NATIVE_BOOLEAN;
			return;
		}
		case 'byte': {
			this._jstype = SuperClass.JS_NUMBER;
			this._nativetype = SuperClass.NATIVE_PRIMITIVE;
			return;
		}
	}

	// arrays are treated as object in Java even if it's primitive like char[]
	if (type.search(/.*\[\]$/) >= 0) {
		// let it resolve without array
		var t = typelib.resolveType(type.replace(/[\[\]]/g,''));
		this._jsarraytype = _.clone(t);
		this._jstype = SuperClass.JS_OBJECT;
		this._nativetype = SuperClass.NATIVE_ARRAY;
		return;
	}

	this.$super._parse.call(this,metabase);
	if (this._jstype === SuperClass.JS_UNDEFINED) {
		// check to see if a class
		var entry = metabase.classes[type];
		if (entry) {
			this._jstype = SuperClass.JS_OBJECT;
			this._nativetype = SuperClass.NATIVE_OBJECT;
			this._name = type;
			this._value = type;
			return;
		}
	}
};

JavaType.prototype.toJSValueName = function() {
	// check if it's an array
	if (this._nativetype == SuperClass.NATIVE_ARRAY) {
		if (this._jsarraytype._type == 'char') {
			return 'JavaCharArray_ToJSValue';
		} else if (this._jsarraytype._jstype == SuperClass.JS_NUMBER) {
			return 'Java'+this._jsarraytype.toJNICallType()+'Array_ToJSValue';
		} else if (this._jsarraytype._jstype == SuperClass.JS_BOOLEAN) {
			return 'JavaBooleanArray_ToJSValue';
		}
		return 'JavaObjectArray_ToJSValue';
	} else {
		return this.$super.toJSValueName.call(this);
	}
};

JavaType.prototype.toNativeName = function() {
	return 'JSValueTo_JavaObject';
};

JavaType.prototype.toValueAtFail = function() {
	switch(this._jstype) {
		case SuperClass.JS_STRING: {
			return '0';
		}
		case SuperClass.JS_NUMBER: {
			return '0';
		}
		case SuperClass.JS_BOOLEAN: {
			return 'false'; 
		}
		case SuperClass.NATIVE_ARRAY: {
			return 'nullptr';
		}
		default: {
			return 'nullptr';
		}
	}
};

exports.Class = JavaType;
