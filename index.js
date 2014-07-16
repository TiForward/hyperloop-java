module.exports = {
	name: 'java',
	defaultOptions: {
		environment: 'dev',
		appid: 'com.test.app',
		skip_ir: true
	},
	dirname: __dirname,
	compiler: require('./lib/compiler'),
	buildlib: require('./lib/buildlib'),
	library: require('./lib/library'),
	metabase: require('./lib/metabase'),
	type: require('./lib/type')
};