"use hyperloop"

try {

	Hyperloop.defineClass(MyClass)
	.package('com.test.app')
	.extends('java.lang.Object')
	.implements('java.lang.Runnable')
	.method(
		{
			attributes: ['public'],
			name: 'run', 
			returns: 'void', 
			arguments: [],
			annotations: ['@Override'],
			action: function(){
				console.log('inside run()');
			}
		})
	.property(
		{
			name: 'CONFIG', 
			metatype: 'constant',
			attributes: ['public'],
			value: ['A','B','C'],
			type: 'enum'
		})
	.property(
		{
			name: 'config',
			value: 'CONFIG.B',
			metatype: 'field',
			attributes: ['public'],
			type: 'CONFIG'
		})
	.build();

	var myClass = new com.test.app.MyClass();
	var config = myClass.config;
	console.log(config==com.test.app.MyClass$CONFIG.B);
	console.log(config.equals(com.test.app.MyClass$CONFIG.B));
} catch (E) {
	console.log(E);
}
