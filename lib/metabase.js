/**
 * Java metabase generation
 */
var _ = require('underscore'),
	fs = require('fs'),
	hyperloop = require('hyperloop-common'),
	log = hyperloop.log,
	path = require('path'),
	spawn = require('child_process').spawn,
	spinner = hyperloop.spinner,
	util = require('util'),
	crypto = require('crypto'),
	zlib = require('zlib'),
	wrench = require('wrench');

function compileIfNecessary(outdir, cp, callback) {

	var classFile = path.join(outdir,'JavaMetabaseGenerator.class');
	if (fs.existsSync(classFile)) {
		return callback(null);
	}
	else {
		var p = spawn('javac',['-source','1.6','-target','1.6','-cp',cp,path.join(__dirname,'JavaMetabaseGenerator.java'),'-d',outdir],{env:process.env}),
			err = '';

		p.stderr.on('data', function(buf){
			err+=buf.toString();
		});
		p.on('close',function(exitCode){
			callback(exitCode===0 ? null : err);
		});
	}
}

/**
 * generate a buffer
 */
function generate(opts, classPath, callback) {
	classPath = typeof(classPath)==='string' ? [classPath] : classPath;

	var dest = opts.dest || opts.cacheDir || 'build',
		cp = [path.join(__dirname,'bcel-5.2.jar'),path.join(__dirname,'json.jar'),dest].concat(classPath).join(path.delimiter);

	compileIfNecessary(dest, cp, function(err){
		if (err) return callback(err);
		var p = spawn('java',['-Xmx1G','-classpath',cp,'JavaMetabaseGenerator'],{env:process.env}),
			out = '',
			err = '';
		p.stdout.on('data',function(buf){
			out+=buf.toString();
		});

		p.stderr.on('data',function(buf){
			err+=buf.toString();
		});

		p.on('close',function(exitCode){
			callback(exitCode===0 ? null : err, out);
		});
	});
}

/**
 * generate a JSON object
 */
function generateJSON(opts, classPath, callback) {
	generate(opts, classPath,function(err,buffer){
		if (err) return callback(err);
		return callback(null, JSON.parse(buffer));
	});
}

// module interface
exports.loadMetabase = loadMetabase;

/**
 * Loads the metabase either from the cache, or creates a new one.
 * On success, the callback will be executed with a JSON representation
 *
 * @param {String}   additional classpath to run through. this may be null.
 * @param {Object}   [opts={}] Options for metabase creation
 * @param {Function} callback Executed upon completion or error
 *
 * @returns {void}
 */
function loadMetabase(classpathToAdd, opts, callback) {
	// validate arguments
	callback = arguments[arguments.length-1] || function(){};
	if (_.isFunction(opts) || !opts) {
		opts = {};
	} else if (!_.isObject(opts)) {
		throw new TypeError('Bad arguments');
	}

	// set defaults
	var opts = _.defaults(opts, {
		isTest: (process.env['HYPERLOOP_TEST'] ? 'test' : 'not-test'),
		cacheDir: process.env.TMPDIR || process.env.TEMP || '/tmp'
	});

	var parsedChecksum = crypto.createHash('sha1').update(
			classpathToAdd
			+ opts.isTest
			+ fs.readFileSync(path.join(__dirname, 'JavaMetabaseGenerator.java'), 'utf8')
	).digest('hex');

	opts.cacheFile = path.join(opts.cacheDir, 'hyperloop_' + opts.platform + '_metabase.' + parsedChecksum + '.json.gz');

	var cacheFile = opts.cacheFile,
		thisTime, lastTime;

	// see if we have a cache file
	if (cacheFile && fs.existsSync(cacheFile) && !opts.force) {
		return loadCache(cacheFile, callback);
	} else {
		// base timestamp
		lastTime = Date.now();

		spinner.start(
			'Generating system metabase'.green.bold,
			'Generating system metabase will take up to a minute (or greater) depending on your ' +
			'environment.' + 
			(opts.force ? '' : 'This file will be cached and will execute faster on subsequent builds.')
		);

		// generate a new metabase from classpath
		// first argument is for additional classpath
		generateJSON(opts, classpathToAdd, function(err,metabase) {
			if (err) {
				return callback(err);
			} else if (!metabase) {
				return callback('Failed to generate metabase');
			}

			thisTime = Date.now();
			spinner.stop();
			log.debug('Generated AST cache file at', cacheFile, 'in', timeDiff(thisTime, lastTime), 'seconds');

			zlib.gzip(JSON.stringify(metabase, null, '  '), function(err, buf) {
				fs.writeFile(cacheFile, buf, function() {
					return callback(null, metabase);
				});
			});
		});
	}
};

/**
 * Load the metabase from a cache file
 *
 * @param {String} cacheFile The location of the cached metabase
 * @param {Function} callback Executed upon completion or error
 *
 * @returns {void}
 */
function loadCache(cacheFile, callback) {
	log.debug('Using system metabase cache file at', cacheFile.yellow);
	try {
		fs.readFile(cacheFile, function(err, buf) {
			if (/\.gz$/.test(cacheFile)) {
				zlib.gunzip(buf, function(err, buf) {
					return callback(null, JSON.parse(String(buf)));
				});
			} else {
				return callback(null, JSON.parse(String(buf)));
			}
		});
	} catch(E) {
		return callback(E);
	}
}

function timeDiff(thisTime, lastTime) {
	return ((thisTime - lastTime) / 1000).toFixed(3);
}

// standalone metabase generator
if (!module.parent) {
	var classpathToAdd = process.argv[2] ? process.argv[2] : null;
	loadMetabase(classpathToAdd, {platform:'java', force:true}, function(e, data) {
		if (e) log.fatal(e);
		console.log(JSON.stringify(data, null, 2));
	});
}
