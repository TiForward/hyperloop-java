/**
 * build library utility for java
 */
var exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	_ = require('underscore'),
	wrench = require('wrench'),
	hyperloop = require('hyperloop-common'),
	log = hyperloop.log,
	util = hyperloop.util,
	lib = require('./library'),
	os = require('os'),
	clang = hyperloop.compiler.clang,
	javaHome = process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME) && process.env.JAVA_HOME,
	javaVMFrameworkHome;

exports.library = library;
exports.getJavaHome = getJavaHome;

function getJavaFrameworkHeadersForOSX(callback) {
	// Search for include dir, then look into system library
	var f = path.join(javaHome, 'include');
	if (fs.existsSync(f)) {
		javaVMFrameworkHome = f;
	} else {
		javaVMFrameworkHome = '/System/Library/Frameworks/JavaVM.framework';
		if (!fs.existsSync(javaVMFrameworkHome)) {
			return callback("Couldn't find suitable headers for the Java SDK. Please set the environment variable JAVA_HOME");
		}
	}
	callback();
}

function getJavaHome (callback) {
	switch (os.platform()) {
		case 'darwin': {
			if (javaHome) {
				getJavaFrameworkHeadersForOSX(function(err) {
					callback(err, javaHome);
				});
			} else {
				exec('/usr/libexec/java_home',function(err,stdout,stderr){
					if (err) return callback(err);
					javaHome = stdout.trim();
					getJavaFrameworkHeadersForOSX(function(err) {
						callback(err, javaHome);
					});
				});
			}
			break;
		}
		default: {
			if (javaHome) {
				return callback(null, javaHome);
			} else {
				return callback(new Error("Couldn't find suitable headers for the Java SDK. Please set the environment variable JAVA_HOME"));
			}
		}
	}
}

function getJNIIncludePaths () {
	if (!javaHome) throw new Error("must call getJavaHome before using this method");
	var headers = javaVMFrameworkHome && path.join(javaVMFrameworkHome,'Headers'),
		include = path.join(javaHome, 'include'),
		platform_include = path.join(include, os.platform());
	// check to see if this is a OSX Java.Framework path
	if (headers && fs.existsSync(headers)) {
		return [headers];		
	}
	return [include, platform_include];
}

/**
 * create a shared library
 */
function library(staticlib, debug, jobs, sources, cflags, linkflags, libdir, outdir, name, callback) {
	var cflags = (cflags||[]).concat(['-I"'+libdir+'"']),
		linkflags = linkflags||[],
		linker = staticlib ? 'libtool' : 'clang++';

	switch (process.platform) {
		case 'darwin': {
			linkflags.push('-framework');
			linkflags.push('JavaScriptCore');

			if (!staticlib) {
				name = name.replace(/\.a$/,'.dylib');
			}
			break;
		}
	}

	getJNIIncludePaths().forEach(function(inc){
		cflags.push('-I'+inc);
	});

	if (!staticlib) {
		linkflags.push('-L'+libdir);
		//TODO: fix the name of the library. right now this should work OK
		var hl = lib.getDefaultLibraryName().replace(/^lib/,'').replace(/\.a$/,'');
		linkflags.push('-l'+hl);
		linkflags.push('-dead_strip');
	}

	if (debug) {
		cflags.push('-DHL_DEBUG');
	}

	var config = {
		outdir: outdir,
		srcfiles: sources,
		cflags: cflags,
		clang: 'clang++',
		linker: linker,
		linkflags: linkflags,
		libname: name,
		debug: debug,
		jobs: jobs
	};
	
	var force = !fs.existsSync(name);

	// compile and then link a library
	clang.compile(config, function(err, objfiles) {
		if (err) return callback(err);
		if (objfiles.length || force) {
			config.objfiles = objfiles;
			clang.library(config, callback);
		}
		else {
			callback(new Error("no library created"));
		}
	});

}
