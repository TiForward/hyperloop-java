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
			action: function(){
				console.log('run()');
			}
		})
	.method(
		{
			name: 'foo', 
			returns: 'int[]', 
			arguments: [{type:'java.lang.String'}],
			action: function(arg0){
				console.log(arg0);
				return [123,456];
			}
		})
	.method(
		{
			name: 'bar', 
			returns: 'java.lang.String', 
			arguments: [{type:'java.lang.String'},{type:'int'}],
			action: function(arg0, arg1){
				console.log(arg0);
				console.log(arg1);
				return arg0 + arg1 + 123;
			}
		}
	).build();

	var myClass = new com.test.app.MyClass();
	console.log('run returns ' + myClass.run());
	console.log('foo returns ' + myClass.foo('hello'));
	console.log('bar returns ' + myClass.bar('hello', 456));
} catch (E) {
	console.log(E);
}
