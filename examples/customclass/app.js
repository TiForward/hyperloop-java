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
				action: function() {
					console.log('inside run()');
				}
			}
		).build();

	var myClass = new com.test.app.MyClass();
	myClass.run();

} catch (E) {
	console.log(E);
}
