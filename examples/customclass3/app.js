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
			name: 'ICON_MONO_16x16', 
			value: '3',
			metatype: 'constant',
			attributes: [
				'final',
				'public',
				'static'
			],
			type: 'int'
		})
	.property(
		{
			name: 'imageCache',
			value: 'new java.util.Hashtable()',
			metatype: 'field',
			attributes: ['public'],
			type: 'java.util.Hashtable'
		})
	.build();

	var myClass = new com.test.app.MyClass();
	console.log('run returns ' + myClass.run());
	console.log(com.test.app.MyClass.ICON_MONO_16x16);
	console.log(myClass.imageCache);
} catch (E) {
	console.log(E);
}
