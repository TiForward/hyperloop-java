/**
 * Java library generation
 */

var fs = require('fs'),
	path = require('path'),
	semver = require('semver'),
	wrench = require('wrench'),
	osplatform = require('os').platform(),
	_ = require('underscore'),
	metabase = require('./metabase'),
	buildlib = require('./buildlib'),
	hyperloop = require('./dev').require('hyperloop-common'),
	util = hyperloop.util,
	log = hyperloop.log,
	jsgen = hyperloop.compiler.jsgen,
	typelib = hyperloop.compiler.type,
	syslib = hyperloop.compiler.library;

exports.loadMetabase = loadMetabase;
exports.getArchitectures = getArchitectures;
exports.compileLibrary = compileLibrary;
exports.prepareLibrary = prepareLibrary;
exports.generateLibrary = generateLibrary;
exports.generateApp = generateApp;
exports.prepareArchitecture = prepareArchitecture;
exports.prepareClass = prepareClass;
exports.prepareFunction = prepareFunction;
exports.prepareMethod = prepareMethod;
exports.prepareProperty = prepareProperty;
exports.prepareType = prepareType;
exports.prepareTypes = prepareTypes;
exports.prepareFunctions = prepareFunctions;
exports.generateMain = generateMain;
exports.generateMethod = generateMethod;
exports.generateFunction = generateFunction;
exports.generateGetterProperty = generateGetterProperty;
exports.generateSetterProperty = generateSetterProperty;
exports.generateNewInstance = generateNewInstance;
exports.isMethodInstance = isMethodInstance;
exports.isPropertyInstance = isPropertyInstance;
exports.getClassFilename = getClassFilename;
exports.getFunctionsFilename = getFunctionsFilename;
exports.getTypesFilename = getTypesFilename;
exports.getFileExtension = getFileExtension;
exports.getObjectFileExtension = getObjectFileExtension;
exports.getLibraryFileName = getLibraryFileName;
exports.getDefaultLibraryName = getDefaultLibraryName;
exports.prepareHeader = prepareHeader;
exports.prepareFooter = prepareFooter;
exports.shouldCompileTypes = shouldCompileTypes;
exports.prepareClasses = prepareClasses;
exports.generateCustomJavaClass = generateCustomJavaClass;
exports.getClassSignature = getClassSignature;
exports.getJavaMethodSignature = getJavaMethodSignature;
exports.mangleJavaSignature = mangleJavaSignature;
exports.getMethodSignature = getMethodSignature;

// classes that we explicitly blacklist
const CLASS_BLACKLIST = [];

/**
 * called to load the metabase (and generate if needed)
 */
function loadMetabase(options, arch, sdks, settings, callback, generate) {
	var opts = _.clone(options);

	opts.cacheDir = opts.dest;

	metabase.loadMetabase(null, opts, function(err, ast, astFile){
		callback(err, ast, astFile);
	});
}

/**
 * return suitable architectures for compiling
 */
function getArchitectures (options, callback) {
	buildlib.getJavaHome(function(err){
		if (err) return callback(err);
		var archs = [];
		if (options.platform==='java') {
			archs.push('java');
		}
		else {
			archs.push('android');
		}
		return callback(null, archs);
	});
}

/** 
 * called once before doing any generation to allow the platform
 * adapter to do any setup before getting started
 */
function prepareLibrary(options, callback) {
	getArchitectures(options,callback);
}

function prepareArchitecture(options, arch, sdks, settings, callback) {
	loadMetabase(options, arch, sdks, settings, callback, true);
}

/**
 * called after all files have been processed
 */
function compileLibrary (opts, arch, metabase, callback) {
	// for now, we're going to compile and link in one step below
	if (opts.srcfiles.length) {
		callback(null, opts.srcfiles);
	}
	else {
		callback("no source files provided");
	}
}

function generateCustomJavaClass(options, state, metabase, fullClassname) {
	if (options['skip-codegen']) return;

	var packagename = fullClassname.substr(0, fullClassname.lastIndexOf('.')),
		classname = fullClassname.substr(packagename.length+1),
		packagedir = packagename.split('.').join(path.sep),
		classfile = classname + '.java',
		dir = path.join(options.srcdir, 'java', packagedir),
		outfile = path.join(dir, classfile),
		classinfo = state.custom_classes[fullClassname],
		mangled = util.sanitizeSymbolName(fullClassname),
		indent = '\t';

	state.custom_classes_files = state.custom_classes_files || [];
	state.custom_classes_files.push(path.join(packagedir, classfile));

	wrench.mkdirSyncRecursive(dir);

	// class definition
	var interfaces = '';

	if (classinfo.interfaces && classinfo.interfaces.length > 0) {
		interfaces = ' implements ' + classinfo.interfaces.join(',');
	}

	var code = [];
	code.push(util.HEADER);
	code.push('package '+packagename+';');
	code.push('');
	classinfo.annotations.forEach(function(a) {
		code.push(a);
	});
	code.push(classinfo.attributes.join(' ')+' class '+classname+' extends '+classinfo.superClass+interfaces+' {');
	code.push('');

	var enum_code = [];
	var prop_code = [];
	// properties
	Object.keys(classinfo.properties).forEach(function(name) {
		var item = classinfo.properties[name];
		var value = item.value ? ' = '+item.value : '';
		var annotations = item.annotations.length > 0  ? item.annotations.join(' ')+' ' : '';
		var attribute = annotations+item.attributes.join(' ')+' ';
		if (item.metatype == 'enum') {
			var enum_values = _.map(item.value, function(v){return v.value;});
			enum_code.push(indent+attribute+item.metatype+' '+item.name+' {'+enum_values.join(',')+'};');
		} else if (item.innertype) {
			prop_code.push(indent+attribute+item.innertype+' '+item.name+value+';');
		} else {
			prop_code.push(indent+attribute+item.type+' '+item.name+value+';');
		}
	});

	code.push(enum_code.join('\n'));
	code.push(prop_code.join('\n'));

	code.push('');

	// methods
	Object.keys(classinfo.methods).forEach(function(name) {
		classinfo.methods[name].forEach(function(method, i) {
			if (!method.hasAction) return;
			var val = 'HL_'+name+'_'+i;

			var args = [],
				argv = [],
				sep  = '';

			if (method.args.length > 0) sep = ',';

			method.args.forEach(function(arg, i) {
				args.push(arg.type+' arg'+i);
				argv.push('arg'+i);
			});

			code.push(indent+'// Set JS callback function for '+name+'('+args.join(',')+')');
			code.push(indent+'public static long '+val+'; // pointer to JSValueRef func');
			code.push(indent+'public static long '+val+'_E; // pointer to JSValueRef exception pointer');
			code.push(indent+'public native '+method.returnType+' '+val+'_Action(long action,long exception'+sep+args.join(',')+'); // Callback to JNI');
			code.push(indent+'public static void '+val+'(long action,long exception) {');
			code.push(indent+'\t'+val+' = action;');
			code.push(indent+'\t'+val+'_E = exception;');
			code.push(indent+'}');

			method.annotations.forEach(function(a) {
				code.push(indent+a);
			});
			var attr = method.attributes.join(' ');
			code.push(indent+attr+' '+method.returnType+' '+name+'('+args.join(',')+') {');

			if (method.returnType == 'void') {
				code.push(indent+'\t'+val+'_Action('+val+','+val+'_E'+sep+argv.join(',')+');');
			} else {
				code.push(indent+'\treturn '+val+'_Action('+val+','+val+'_E'+sep+argv.join(',')+');');
			}
			code.push(indent+'}');
			code.push('');

		});
	});

	code.push('}');

	fs.writeFileSync(outfile, code.join('\n'), 'utf8');
}

function generateLibrary (options, arch_results, settings, callback) {
	var builddir = options.outdir,
		libfile = path.join(options.dest, options.libname || getDefaultLibraryName()),
		arch = options.arch || options.platform,
		sources = arch_results[arch];
	buildlib.library(true, options.debug, options.jobs, sources, options.cflags, options.linkflags, options.dest, builddir, libfile, callback);
}

function generateApp (options, arch_results, settings, callback) {
	var builddir = options.outdir,
		libfile = path.join(options.dest, options.libname || getDefaultAppName()),
		arch = options.arch || options.platform,
		sources = arch_results[arch];
	buildlib.library(false, options.debug, options.jobs, sources, options.cflags, options.linkflags, options.dest, builddir, libfile, callback);
}

function addDefaultImports(state) {
	// externs
	state.externs = [];

	// we record this so we can generate the right imports
	state.imports = {
		'jni': '<jni.h>',
		'JSBase': '<JavaScriptCore/JSBase.h>',
		'JSContextRef': '<JavaScriptCore/JSContextRef.h>',
		'JSStringRef': '<JavaScriptCore/JSStringRef.h>',
		'JSObjectRef': '<JavaScriptCore/JSObjectRef.h>',
		'JSValueRef': '<JavaScriptCore/JSValueRef.h>'
	};
}

/**
 * called prepare generation of class source code. this method is called
 * once for each file before it is generated.
 */
function prepareClass(options, metabase, state, classname, code) {
	log.debug('generating class:',classname.green.bold);

	var entry = metabase.classes[classname];

	var includes = [];

	addDefaultImports(state);

	// fill out all methods/properties defined in super class
	while(entry) {
		if (entry.extra_includes) {
			includes = includes.concat(entry.extra_includes);
		}
		entry = metabase.classes[entry.superClass];
	}

	// generating JNI implementation here for now
	generateJNIClassImpl(options, metabase, state, classname, code);

	// we record this so we can generate the right imports
	state.imports = {
		'jni': '<jni.h>',
		'JSBase': '<JavaScriptCore/JSBase.h>',
		'JSContextRef': '<JavaScriptCore/JSContextRef.h>',
		'JSStringRef': '<JavaScriptCore/JSStringRef.h>',
		'JSObjectRef': '<JavaScriptCore/JSObjectRef.h>',
		'JSValueRef': '<JavaScriptCore/JSValueRef.h>'
	};

	includes.forEach(function(inc) { addHeaderToImports(state, inc); });
}

/**
 * called prepare generation of function source code. this method is called
 * once for each file before it is generated.
 */
function prepareFunction(options, metabase, state, fnname, code) {
	return [];
}

/**
 * called prepare generation of type source code. this method is called
 * once for each file before it is generated.
 */
function prepareType(options, metabase, state, type, code) {
	return [];
}

/**
 * format and then add header to imports 
 */
function addHeaderToImports(state, inc) {
	if (inc in state.imports) {
		return;	
	}
	inc = '<'+inc+'>'
	if (Object.keys(state.imports).map(function(k) {return state.imports[k] }).indexOf(inc)==-1) {
		state.imports[inc]=inc;
	}
}

/**
 * add an extern
 */
function addExtern(state, extern) {
	if (state.externs.indexOf(extern)==-1) {
		extern = /^EXPORTAPI/.test(extern) ? extern : ('EXPORTAPI '+extern);
		state.externs.push(extern);
	}
}

/**
 * called to prepare a class method to be compiled. this method is called once 
 * for each class and each method in each class that will be generated.
 */
function prepareMethod(options, metabase, state, classname, methodname, methods, code) {
	var externs = [];
	methods.forEach(function(m,index){
		typelib.resolveType(m.returnType);
		generateJNIMethod(options, metabase, state, code, '\t', classname, state.classSig, methodname, m, index, externs);
	});
	externs.length && externs.forEach(function(extern){
		addExtern(state,extern);
	});
}

/**
 * called to prepare a class property to be compiled. this method is called once
 * for each class and each property in each class that will be generated.
 */
function prepareProperty(options, metabase, state, classname, propertyname, property, code, isGetter) {
	var externs = [],
		key = state.classSig + propertyname;
	typelib.resolveType(property.type);
	if (!state.generatedProperties || !(key in state.generatedProperties)) {
		state.generatedProperties = state.generatedProperties || {};
		state.generatedProperties[key]=1;
		// since this method does both getter and setter, we should only call it once per property
		generateJNIProperty(options, metabase, state, code, '\t', classname, state.classSig, propertyname, property, externs, isGetter);
	}
	externs.length && externs.forEach(function(extern){
		addExtern(state,extern);
	});
}

/**
 * generate a function body. call for each function that should be generated.
 */
function generateFunction(options, metabase, state, indent, fnname, fn) {
	var code = [];

	code.push('//TODO');
	code.push('return JSValueMakeUndefined(ctx);');

	return code.map(function(l) { return indent + l } ).join('\n');
}

function getMethodSignature(options, metabase, state, classname, methodname, method) {
	return mangleJavaSignature(method.signature);
}

/**
 * generate a method body. call for each method that should be generated for a class
 */
function generateMethod(options, metabase, state, indent, varname, classname, method, methodname) {
	var code = [],
		cleanup = [],
		start = method.instance ? 1 : 0;

	var mangled = jsgen.generateMethodName(classname,method.name)+mangleJavaSignature(method.signature);
	var targetArg = method.instance ? varname+',' : '';

	var methodBlock = mangled+'_Impl(ctx,'+targetArg+'arguments,exception)',
		returnBlock = 'return JSValueMakeUndefined(ctx);',
		methodType = typelib.resolveType(method.returnType);

	if (methodType.isNativeVoid() && !methodType.isPointer()) {
		methodBlock = indent + methodBlock + ';';
	}
	else {
		methodBlock = indent + methodType.getAssignmentName()+' result = '+methodType.getAssignmentCast(methodBlock)+';';
		var rpreamble = [],
			declare = [],
			classObj = typelib.resolveType(classname),
			resultCode = (methodType.isInstanceType() ? classObj : methodType).toJSBody('result', rpreamble, cleanup, declare);
		returnBlock = 'return ' + resultCode + ';';
		rpreamble.length && (methodBlock+='\n'+indent+rpreamble.join('\n'+indent));
		declare.length && (declare.filter(function(c) {return !/instancetype/.test(c);}).forEach(function(d) { addExtern (state, d); }));
	}

	code.push(methodBlock);
	cleanup.forEach(function(c){ code.push(indent+c); });
	code.push(indent+returnBlock);

	return code.join('\n');
}

function getJavaMethodSignature(options,metabase,method) {
	var sig = [];
	sig.push('(');
	method.args.forEach(function(arg) {
		sig.push(typelib.resolveType(arg.type).toJNISignature());
	});
	sig.push(')');
	sig.push(typelib.resolveType(method.returnType).toJNISignature());
	return sig.join('');
}

function getClassSignature(options, metabase, classname) {
	if (options.platform=='android') {
		return typelib.resolveType(classname).toJNISignatureSimple();
	} else {
		return typelib.resolveType(classname).toJNISignature();
	}
}

function generateJNIClassImpl(options, metabase, state, classname, code) {

	var classSig = state.classSig = getClassSignature(options, metabase, classname);
	var mangledClassname = state.mangledClassname = jsgen.sanitizeClassName(classname);

	// instanceof implementation
	code.push('EXPORTAPI bool '+mangledClassname+'_IsInstanceOf(JSContextRef ctx, jobject object, JSValueRef* exception)');
	code.push('{');
	code.push('\tHyperloop::JNIEnv env;');
	code.push('\tauto clazz = env->FindClass(\"'+classSig+'\");');
	code.push('\tauto isInstance = env->IsInstanceOf(object, clazz);');
	code.push('\tenv->DeleteLocalRef(clazz);');
	code.push('\tif (env.CheckJavaException(ctx, exception)) {');
	code.push('\t\treturn false;');
	code.push('\t}');
	code.push('\treturn isInstance == JNI_TRUE ? true : false;')
	code.push('}');
	code.push('');

	var externs = [];
	generateJNICustomClassImpl(options, metabase, state, classname, code, externs);

	externs.length && externs.forEach(function(extern){
		addExtern(state,extern);
	});

}

function generateJNICustomClassImpl(options, metabase, state, classname, code, externs) {

	// process action if this class is custom class
	if (state.custom_classes && state.custom_classes[classname]) {
		var classSig = getClassSignature(options, metabase, classname);
		var methods = state.custom_classes[classname].methods;
		var mangledClassname = util.sanitizeSymbolName(classname);
		var mangledSuperClassname = util.sanitizeSymbolName(state.custom_classes[classname].superClass);
		Object.keys(methods).forEach(function(name) {
			methods[name].forEach(function(method,i) {
			if (!method.hasAction)  return;
				var mangled = mangledClassname+'_Action_'+name+'_'+i;
				var javaCallback = 'HL_'+name+'_'+i;
				var jniCallback = javaCallback+'_Action';
				code.push('// '+classname+'.'+name+method.signature);
				code.push('EXPORTAPI JSValueRef '+mangled+'(JSContextRef ctx, JSObjectRef function, JSObjectRef object, size_t argumentCount, const JSValueRef arguments[], JSValueRef* exception)');
				code.push('{');
				code.push('\tLOGD(\"'+mangled+'\");');
				code.push('\tHyperloop::JNIEnv env;');
				code.push('\tif (argumentCount < 1)');
				code.push('\t{');
				code.push('\t\t*exception = HyperloopMakeException(ctx, \"wrong number of arguments passed to '+mangled+'\");');
				code.push('\t\treturn JSValueMakeUndefined(ctx);');
				code.push('\t}');
				code.push('\tJSValueRef func = arguments[0];');
				code.push('\tJSValueProtect(ctx, func); // TODO Check if this is really needed');
				code.push('\tjclass cls = env->FindClass(\"'+classSig+'\");');
				code.push('\tjmethodID mid = env->GetStaticMethodID(cls, \"'+javaCallback+'\", \"(JJ)V\");');
				code.push('\tif (mid == nullptr)');
				code.push('\t{');
				code.push('\t\t*exception = HyperloopMakeException(ctx, \"wrong method id for '+javaCallback+'\");');
				code.push('\t\treturn JSValueMakeUndefined(ctx);');
				code.push('\t}');
				code.push('\tenv->CallStaticVoidMethod(cls,mid,(jlong)func, (jlong)exception);');
				code.push('\treturn JSValueMakeBoolean(ctx, !env.CheckJavaException(ctx,exception));');
				code.push('}');
				code.push('');

				var toJSValue = mangledClassname+'_ToJSValue';
				var superClassToJSValue = mangledSuperClassname+'_ToJSValue';

				addExtern(state, 'JSValueRef '+toJSValue+'(JSContextRef ctx, jobject instance, JSValueRef *exception);');
				addExtern(state, 'JSValueRef '+superClassToJSValue+'(JSContextRef ctx, jobject instance, JSValueRef *exception);');

				var argv = [],
					args = [];
				if (method.args.length > 0) argv.push('');
				method.args.forEach(function(arg, j) {
					var argtype = typelib.resolveType(arg.type);
					argv.push(argtype.getJNIType()+' arg'+j);
					args.push(argtype.toJSBody('arg'+j, [], [], []));
					externs.push('EXPORTAPI JSValueRef '+argtype.toJSValueName()+'(JSContextRef,jobject,JSValueRef *);');
				});
				var returnType = typelib.resolveType(method.returnType);

				code.push('// '+classname+'.'+jniCallback+'');
				code.push('EXPORTAPI '+returnType.getJNIType()+' JNICALL '+getJavaNativeMethodName(classname, jniCallback) + '(JNIEnv * env, jobject obj, jlong action, jlong excep'+argv.join(',')+')');
				code.push('{');
				code.push('\tLOGD(\"'+classname+'.'+jniCallback+'\");');
				code.push('\tauto func = (JSValueRef)action;');
				code.push('\tJSValueRef * exception = (JSValueRef*)excep;');
				code.push('\tauto ctx = HyperloopGlobalContext();');
				code.push('\tauto instance = JSValueToObject(ctx, '+toJSValue+'(ctx, obj, exception), exception);');
				code.push('\tauto superProperty = JSStringCreateWithUTF8CString(\"super\");');
				code.push('\tauto superObj = '+superClassToJSValue+'(ctx, obj, exception);'); // this.super
				code.push('\tJSObjectSetProperty(ctx, instance, superProperty, superObj, kJSPropertyAttributeReadOnly|kJSPropertyAttributeDontEnum|kJSPropertyAttributeDontDelete, exception);');
				code.push('\tJSStringRelease(superProperty);');
				if (method.args.length > 0) {
					code.push('\tJSValueRef args[] = {'+args.join(',')+'};');
				} else {
					code.push('\tJSValueRef* args = NULL;');
				}
				code.push('\tJSValueRef result = JSObjectCallAsFunction(ctx, JSValueToObject(ctx, func, exception), instance, '+method.args.length+', args, exception);');
				if (returnType.getJNIType() == 'void') {
					code.push('\treturn;');
				} else {
					code.push('\tif (JSValueIsNull(ctx, result) || JSValueIsUndefined(ctx, result))');
					code.push('\t{');
					code.push('\t\treturn '+returnType.toValueAtFail()+';');
					code.push('\t}');
					code.push('\telse');
					code.push('\t{');
					code.push('\t\treturn '+returnType.toNativeBody('result', [], [], [])+';');
					code.push('\t}');
				}
				code.push('}');
				code.push('');
			});
		});
		code.push('');
	}
}

function generateJNIProperty(options, metabase, state, code, indent, classname, classSig, propertyname, property, externs) {
	var mangledSet = jsgen.generateMethodName(classname,'Set_'+propertyname+'_Impl');
	var mangledGet = jsgen.generateMethodName(classname,'Get_'+propertyname+'_Impl');
	var typeobj = typelib.resolveType(property.type);

	var hasSetter = property.attributes.indexOf('private') < 0 && property.attributes.indexOf('final') < 0;
	var instance = isMethodInstance(options,state,state,property);

	// Android Dalvik VM can not find static constant that is defined in the super class
	// In this case class signature should point to the parent if property is not found in subclass
	if (options.platform == 'android' && !instance) {
		var targetname = classname;
		var target = metabase.classes[targetname];
		var found = target.properties[propertyname];
		while(!found && target.superClass) {
			targetname = target.superClass;
			target = metabase.classes[target.superClass];
			found = target.properties[propertyname];
		}
		if (found) {
			classSig = getClassSignature(options, metabase, targetname);
		} else {
			throw new Error('property '+propertyname+' not found for class '+classname);
		}
	}

	var instanceArg = '';
	if (instance) {
		instanceArg = 'jobject object, ';
	}

	var cleanup = [];

	code.push('/* '+property.type+' '+classname+'.'+propertyname+' (Getter) */');
	code.push('EXPORTAPI '+typeobj.toCast()+' '+mangledGet+'(JSContextRef ctx, '+instanceArg+'JSValueRef* exception)');
	code.push('{');
	code.push(indent+'LOGD(\"'+mangledGet+'\");');
	code.push(indent+'Hyperloop::JNIEnv env;');

	if (instance) {
		code.push(indent+'auto cls = env->GetObjectClass(object);');
		code.push(indent+'auto fid = env->GetFieldID(cls,\"'+propertyname+'\",\"'+typeobj.toJNISignature()+'\");');
	} else {
		code.push(indent+'auto cls = env->FindClass(\"'+classSig+'\");');
		code.push(indent+'auto fid = env->GetStaticFieldID(cls,\"'+propertyname+'\",\"'+typeobj.toJNISignature()+'\");');
	}

	code.push(indent+'if (fid == nullptr)');
	code.push(indent+'{');
	code.push(indent+'\t*exception = HyperloopMakeException(ctx,\"couldn\'t get method id '+classname+'.'+propertyname+' '+typeobj.toJNISignature()+'\");');
	if (typeobj.isNativeVoid()) {
		code.push(indent+'\treturn;');
	} else {
		code.push(indent+'\treturn '+typeobj.toValueAtFail()+';');
	}
	code.push(indent+'}');

	code.push(indent+typeobj.toCast()+' result = '+typeobj.getJNIPropertyGetter(instance, 'env', 'cls', 'object', 'fid')+';');
	code.push(indent+'env.CheckJavaException(ctx,exception);');
	code.push(indent+'return result;');

	code.push('}');
	code.push('');

	if (hasSetter) {
		code.push('/* '+property.type+' '+classname+'.'+propertyname+' (Setter) */');
		code.push('EXPORTAPI bool '+mangledSet+'(JSContextRef ctx, '+instanceArg+typeobj.toCast()+' value, JSValueRef* exception)');
		code.push('{');
		code.push(indent+'LOGD(\"'+mangledSet+'\");');
		code.push(indent+'Hyperloop::JNIEnv env;');

		if (instance) {
			code.push(indent+'auto cls = env->GetObjectClass(object);');
			code.push(indent+'auto fid = env->GetFieldID(cls,\"'+propertyname+'\",\"'+typeobj.toJNISignature()+'\");');
		} else {
			code.push(indent+'auto cls = env->FindClass(\"'+classSig+'\");');
			code.push(indent+'auto fid = env->GetStaticFieldID(cls,\"'+propertyname+'\",\"'+typeobj.toJNISignature()+'\");');
		}

		code.push(indent+'if (fid == nullptr)');
		code.push(indent+'{');
		code.push(indent+'\t*exception = HyperloopMakeException(ctx,\"couldn\'t get method id '+classname+'.'+propertyname+' '+typeobj.toJNISignature()+'\");');
		if (typeobj.isNativeVoid()) {
			code.push(indent+'\treturn;');
		} else {
			code.push(indent+'\treturn '+typeobj.toValueAtFail()+';');
		}
		code.push(indent+'}');

		code.push(indent+typeobj.getJNIPropertySetter(instance, 'env', 'cls', 'object', 'fid', 'value')+';');
		code.push(indent+'return env.CheckJavaException(ctx, exception);');

		code.push('}');
		code.push('');
	}

	return code.join('\n');
}

function mangleJavaSignature(signature) {
		return signature.replace(/[\[\]]/g, '$')
		.replace(/\(\)/, '_')
		.replace(/`\d/, '')
		.replace(/\s/g, '')
		.replace(/[`\(\)\s,\.\;\/]/g, '_')
		.replace(/\^/g, '')
		.replace(/\*/g, '');
}

function getJavaNativeMethodName(classname, methodname) {
	return 'Java_'+ classname.replace(/\./g, '_')+'_'+methodname.replace(/_/g, '_1');
}

function generateJNIConstructor(options, metabase, state, code, indent, classname, classSig, method, externs) {
	code.push(indent+'Hyperloop::JNIEnv env;');
	code.push(indent+'jobject instance = nullptr;');
	code.push(indent+'auto javaClass = env->FindClass("'+classSig+'");');

	var indent2 = indent+'\t',
		cleanup = [],
		args = [];

    if (method.args.length > 0) args.push('');

	var condition = [];
	var mblock = [];
	mblock.push(indent2+'auto methodId = env->GetMethodID(javaClass, \"<init>\", \"'+method.signature+'\");');
	method.args.forEach(function(m,i){
		var type = m.type,
			value = 'args$'+i,
			typeobj = typelib.resolveType(type), 
			cast = typeobj.isInstanceType() ? classname+' *' : typeobj.toCast();

		var argname = typeobj.getRealCast(value);

		if (typeobj.isNativeString()) {
			condition.push('JSValueIsString(ctx, arguments['+i+'])')
		} else if (typeobj.isNativeBoolean()) {
			condition.push('JSValueIsBoolean(ctx, arguments['+i+'])')
		} else if (typeobj.isNativePrimitive()) {
			condition.push('JSValueIsNumber(ctx, arguments['+i+'])')
		} else if (typeobj.isNativeArray()) {
			condition.push('HyperloopJSValueIsArray(ctx, arguments['+i+'])')
		} else {
			if (options.platform=='android') {
				condition.push('env.IsInstanceOf(ctx,\"'+typeobj.toJNISignatureSimple()+'\",arguments['+i+'],exception)');
			} else {
				condition.push('env.IsInstanceOf(ctx,\"'+typeobj.toJNISignature()+'\",arguments['+i+'],exception)');
			}
		}

		args.push(value);

		var preamble = [],
			declare = [],
			body = typeobj.toNativeBody('arguments['+i+']',preamble,cleanup,declare);
	
		preamble.length && preamble.forEach(function(c){mblock.push(indent2+c)});
		declare.length && declare.forEach(function(d){if (externs.indexOf(d) < 0) externs.push(d);});
		mblock.push(indent2+typeobj.getAssignmentName()+' '+value+' = '+body+';');
	});

	if (method.args.length > 0) {
		code.push(indent+'if ('+condition.join(' && ')+')');
	}

	code.push(indent+'{');
	mblock.forEach(function(c){ code.push(c); });
	cleanup.forEach(function(c){ code.push(indent2+c); });

	code.push(indent2+'instance = env->NewObject(javaClass,methodId'+args.join(',')+');');
	code.push(indent+'}');

	if (method.args.length > 0) {
		code.push(indent+'else');
		code.push(indent+'{');
		code.push(indent+indent+'*exception = HyperloopMakeException(ctx, \"Wrong argument for '+classname+method.signature+'\");');
		code.push(indent+'}');
	}

	code.push(indent+'if (env.CheckJavaException(ctx,exception))');
	code.push(indent+'{');
	code.push(indent+'\tinstance = nullptr;');
	code.push(indent+'}');
}

function generateJNIMethod(options, metabase, state, code, indent, classname, classSig, callname, method, index, externs) {
	var methodname = method.name,
		mangled = jsgen.generateMethodName(classname,methodname),
		typeobj = typelib.resolveType(method.returnType),
		instanceArg = '';
	if (isMethodInstance(options,state,state,method)) {
		instanceArg = 'jobject object, ';
	}
    var fn = mangled+mangleJavaSignature(method.signature)+'_Impl';

	code.push('/* '+method.returnType+' '+classname+'.'+methodname+method.signature+' */');
	code.push('EXPORTAPI '+typeobj.toCast()+' '+fn+'(JSContextRef ctx, '+instanceArg+'const JSValueRef arguments[], JSValueRef* exception)');
	code.push('{');
	code.push(indent+'LOGD(\"'+fn+'\");');
	code.push(indent+'Hyperloop::JNIEnv env;');

	var start = method.instance ? 1 : 0,
	cleanup = [];

	var args = [];

	method.args.forEach(function(m,i){
		var type = m.type,
			value = 'args$'+i,
			typeobj = typelib.resolveType(type), 
			cast = typeobj.isInstanceType() ? classname+' *' : typeobj.toCast();

		var argname = typeobj.getRealCast(value);
		args.push(value);

		var preamble = [],
			declare = [],
			body = typeobj.toNativeBody('arguments['+(i+start)+']',preamble,cleanup,declare);

		preamble.length && preamble.forEach(function(c){code.push(indent+c)});
		declare.length && declare.forEach(function(d){if (externs.indexOf(d) < 0) externs.push(d);});

		code.push(indent+typeobj.getAssignmentName()+' '+value+' = '+body+';');
	});

	if (method.instance) {
		code.push(indent+'auto cls = env->GetObjectClass(object);');
		code.push(indent+'auto mid = env->GetMethodID(cls,\"'+methodname+'\",\"'+method.signature+'\");');
	} else {
		code.push(indent+'auto cls = env->FindClass(\"'+classSig+'\");');
		code.push(indent+'auto mid = env->GetStaticMethodID(cls,\"'+methodname+'\",\"'+method.signature+'\");');
	}

	code.push(indent+'if (mid == nullptr)');
	code.push(indent+'{');
	code.push(indent+'\t*exception = HyperloopMakeException(ctx,\"couldn\'t get method id '+classname+'.'+methodname+method.signature+'\");');
	if (typeobj.isNativeVoid()) {
		code.push(indent+'\treturn;');
	} else {
		code.push(indent+'\treturn '+typeobj.toValueAtFail()+';');
	}
	code.push(indent+'}');

	if (typeobj.isNativeVoid()) {
		code.push(indent+typeobj.getJNICall(method.instance, 'env', 'cls', 'object', 'mid', args)+';');
	} else {
		code.push(indent+typeobj.toCast()+' result = '+typeobj.getJNICall(method.instance, 'env', 'cls', 'object', 'mid', args)+';');
	}

	cleanup.forEach(function(c){ code.push(indent+c); });

	code.push(indent+'env.CheckJavaException(ctx,exception);');

	if (!typeobj.isNativeVoid()) {
		code.push(indent+'return result;');
	}

	code.push('}');
	code.push('');
	return code.join('\n');
}

/**
 * generate the getter property value
 */
function generateGetterProperty(options, metabase, state, library, classname, propertyname, property, varname, cast, indent) {
	var code = [],
		value = 'is_'+propertyname.toLowerCase(),
		method = property.getter || propertyname,
		typeobj = typelib.resolveType(property.type),
		preamble = [],
		cleanup = [],
		declare = [],
		result = typeobj.toJSBody(value,preamble,cleanup,declare);

	var targetArg = '';
	if (isMethodInstance(options,metabase,state,property)) {
		targetArg = varname + ',';
	}

	code.push(typeobj.getAssignmentName()+' ' + value + ' = '+typeobj.getAssignmentCast(jsgen.generateMethodName(classname,'Get_'+propertyname+'_Impl'+'(ctx,'+targetArg)+'exception)')+';');
	code.push('result = '+result + ';');

	preamble.length && preamble.forEach(function(c){ code.push(c) });
	cleanup.length && cleanup.forEach(function(c){ code.push(c) });
	declare.length && declare.forEach(function(d){ addExtern(state,d) });

	return code.map(function(l) { return indent + l } ).join('\n');
}

/**
 * generate the setter property
 */
function generateSetterProperty(options, metabase, state, library, classname, propertyname, property, varname, cast, indent) {
	var code = [],
		typeobj = typelib.resolveType(property.type),
		preamble = [],
		cleanup = [],
		declare = [],
		result = typeobj.getRealCast(typeobj.toNativeBody('value',preamble,cleanup,declare));

	var targetArg = '';
	if (isMethodInstance(options,metabase,state,property)) {
		targetArg = varname + ','; 
	}

	preamble.length && preamble.forEach(function(c){ code.push(c) });
	code.push('auto succeeded = '+jsgen.generateMethodName(classname,'Set_'+propertyname+'_Impl')+'(ctx,'+targetArg+result+',exception);');
	cleanup.length && cleanup.forEach(function(c){ code.push(c) });
	code.push('result = JSValueMakeBoolean(ctx, succeeded);');

	declare.length && declare.forEach(function(d){ addExtern(state,d) });

	return code.map(function(l) { return indent + l } ).join('\n');
}

/**
 * return true if the method is an instance method (vs. a static method)
 */
function isMethodInstance (options, metabase, state, method) {
    return method && method.attributes.indexOf('static') < 0;
}

/**
 * return true if the property is an instance property (vs. a static property)
 */
function isPropertyInstance (options, metabase, state, property) {
    return property && property.attributes.indexOf('static') < 0;
}

/**
 * return the file extension appropriate for the platform. if header is true,
 * return the header file extension, otherwise the implementation file extension
 */
function getFileExtension (header) {
	return header ? '.h' : '.cpp';
}

/**
 * return the object file extension
 */
function getObjectFileExtension() {
	return '.o';
}

/**
 * return the library file name formatted in a platform specific format
 */
function getLibraryFileName(name) {
	var ext;
	switch (osplatform) {
		case 'darwin': {
			ext = '.a';
			break;
		}
		case 'linux': {
			ext = '.a';
			break;
		}
		case 'windows': {
			ext = '.lib';
			break;
		}
	}
	return 'lib'+name+ext;
}

/**
 * return the default library name
 */
function getDefaultLibraryName() {
	return getLibraryFileName('hyperloop');
}

/**
 * return the default application name
 */
function getDefaultAppName() {
	return getLibraryFileName('App');
}

/**
 * return a suitable filename for a given class
 */
function getClassFilename(options, metabase, state, classname) {
	var filename = jsgen.sanitizeClassName(classname).replace(/\$/g,'_');
	return 'HL_' +  filename + getFileExtension(false);
}

/**
 * return the suitable filename
 */
function getFunctionsFilename(options, metabase, state) {
	return 'HL_Functions' + getFileExtension(false);
}

/**
 * return the suitable filename
 */
function getTypesFilename(options, metabase, state) {
	return 'HL_Types' + getFileExtension(false);
}

/*
 * called to generate any code into main()
 */
function generateMain (options, state, obj, symbols, symbolnames, externs, cleanup) {
	state.custom_classes && Object.keys(state.custom_classes).forEach(function(c) {
		var methods = state.custom_classes[c].methods;
		Object.keys(methods).forEach(function(name) {
			methods[name].forEach(function(m, i) {
				if (!m.hasAction) return;
				var symbolname = util.sanitizeSymbolName(c)+'_Action_'+name+'_'+i;
				symbolnames.push(symbolname);
				symbols.push('// '+symbolname);
				symbols.push('auto '+symbolname+'Property = JSStringCreateWithUTF8CString("'+symbolname+'");');
				symbols.push('auto '+symbolname+'Fn = JSObjectMakeFunctionWithCallback(ctx,'+symbolname+'Property,'+symbolname+');');
				symbols.push('JSObjectSetProperty(ctx,object,'+symbolname+'Property,'+symbolname+'Fn,kJSPropertyAttributeReadOnly|kJSPropertyAttributeDontEnum|kJSPropertyAttributeDontDelete,nullptr);');
				cleanup.push('JSStringRelease('+symbolname+'Property);');
				symbols.push('');

				externs.push('JSValueRef '+symbolname+'(JSContextRef ctx, JSObjectRef function, JSObjectRef thisObject, size_t argumentCount, const JSValueRef arguments[], JSValueRef* exception);');
			});
		});
	});
}

/**
 * called to generate any code at the header of the class. this method
 * is called once per file
 */
function prepareHeader(options, metabase, state, classname, code) {
	state.imports && Object.keys(state.imports).forEach(function(name){
		var imp = state.imports[name],
			quote = imp && imp.charAt(0)!='<' && imp.charAt(0)!='"',
			line = quote ? ('"'+imp+'"') : imp;
		line && code.push('#include '+line);
	});

	if (state.externs && state.externs.length) {
		code.push('');
		code.push('// externs');
		code.push(state.externs.join('\n'));
	}
	
	code.push('');
}

/**
 * called to generate any code at the footer of the class. this method
 * is called once per file
 */
function prepareFooter(options, metabase, state, classname, code) {
}

/**
 * generate code for new instance
 */
function generateNewInstance(state, metabase, indent, classname, cast, varname, methodnode) {
	var code = [],
		typeobj = typelib.resolveType(classname),
		cleanup = [],
		method = methodnode.method || methodnode,
		methodname = '<init>',
		classSig = getClassSignature(state.options, metabase, classname),
		externs = [];

	if (methodnode.selector) {
		generateJNIConstructor(state.options, metabase, state, code, indent, classname, classSig, method, externs);
	} else {
		var defaultCtor = _.find(metabase.classes[classname].methods[methodname], function(m) { return m.args.length === 0; });
		if (defaultCtor) {
			generateJNIConstructor(state.options, metabase, state, code, indent, classname, classSig, defaultCtor, externs);
		} else {
			log.fatal('default constructor not found for '+classname);
		}
	}

	externs.forEach(function(extern){
		addExtern(state,extern);
	});

	return code.join('\n');
}


function prepareTypes(options,state,metabase,library,code) {
	addDefaultImports(state);
}

function prepareFunctions(options,state,metabase,library,code) {
	addDefaultImports(state);
}

function shouldCompileTypes () {
	return false;
}

function prepareClasses(options, state, metabase, library, symboltable) {
	// these classes are minimally required for all Java projects
	var required = ['java.lang.Object','java.lang.Boolean','java.lang.Double'];
	required.forEach(function(cls){
		if (!symboltable.classmap) {
			symboltable.classmap = {};
		}
		if (!(cls in symboltable.classmap)) {
			symboltable.classmap[cls] = {
				static_methods: {},
				instance_methods: {},
				getters:{},
				setters:{},
				constructors:{}
			};
		}
	});

	// JSValueTo_JavaObject needs more symbols
	state.constructors = state.constructors || {};
	state.constructors['java.lang.Double'] = state.constructors['java.lang.Double'] || {};
	state.constructors['java.lang.Double'].java_lang_Double_constructor__D_V = _.clone(_.find(metabase.classes['java.lang.Double'].methods['<init>'], function(m) {return m.signature == '(D)V';}));
	state.constructors['java.lang.Double'].java_lang_Double_constructor__D_V.selector = '(D)V';
	state.constructors['java.lang.Double'].java_lang_Double_constructor__D_V.symbolname = 'java_lang_Double_constructor__D_V';

	state.constructors['java.lang.Boolean'] = state.constructors['java.lang.Boolean'] || {};
	state.constructors['java.lang.Boolean'].java_lang_Boolean_constructor__Z_V = _.clone(_.find(metabase.classes['java.lang.Boolean'].methods['<init>'], function(m) {return m.signature == '(Z)V';}));
	state.constructors['java.lang.Boolean'].java_lang_Boolean_constructor__Z_V.selector = '(Z)V';
	state.constructors['java.lang.Boolean'].java_lang_Boolean_constructor__Z_V.symbolname = 'java_lang_Boolean_constructor__Z_V';

}