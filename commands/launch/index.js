/*
 * Launcher
 */
var path = require('path'),
	hyperloop = require('../../lib/dev').require('hyperloop-common'),
	log = hyperloop.log,
	Command = hyperloop.Command,
	spawn = require('child_process').spawn,
	exec = require('child_process').exec,
	util = hyperloop.log,
	buildlib = require('../../lib/buildlib');

module.exports = new Command(
	'launch',
	'Launch the application in the Java VM',
	[
	],
	function(state,done) {
		try {
			var options = state.options;
			buildlib.getJavaHome(function(err,javahome){
				var javac = path.join(javahome,'bin','javac'),
					java = path.join(javahome,'bin','java'),
					outdir = path.resolve(options.dest),
					cmd = javac+' -g -d "'+outdir+'" app.java org/appcelerator/hyperloop/Hyperloop.java',
					cwd = process.cwd(),
					_finished = false;

				process.chdir(path.join(__dirname,'..','..','templates','java'));
				log.debug(cmd);

				function finish() {
					if (!_finished) {
						_finished = true;
						//process.nextTick(done);
					}
				}
				exec(cmd, function(err,stdout,stderr){
					process.chdir(cwd);
					err && log.fatal(err);
					cmd = java + ' -Djava.library.path="'+outdir+'" -cp "'+outdir+'" app';
					log.debug(cmd)
					var p = spawn(java,['-Djava.library.path='+outdir,'-cp',outdir,'app']);
					p.stdout.on('data',function(buf){
						buf.toString().split(/\n/).forEach(function(line){
							line = line.trim();
							if (line && /^TI_EXIT/.test(line)) {
								// done, but give the logger some time to finish
								setTimeout(finish,10);
							}
							else {
								line && log.info(line);
							}
						});
					});
					p.stderr.on('data',function(buf){
						done(buf.toString());
					});
					p.on('close',finish);
				});
			});
		} catch (E) {
			done(E);
		}
	}
);

