"use hyperloop"

Hyperloop.defineClass(MyClass)
	.package('com.test.app')
	.extends('java.lang.Object')
	.method({
		name: 'foo', 
		returns: 'void', 
		arguments: [{type:'short'}],
		action: function(params){
			console.log('foo(short)');
		}
	})
	.method({
		name: 'foo', 
		returns: 'void', 
		arguments: [{type:'int'}],
		action: function(params){
			console.log('foo(int)');
		}
	})
	.method({
		name: 'foo', 
		returns: 'void', 
		arguments: [{type:'double'}],
		action: function(params){
			console.log('foo(double)');
		}
	}).build();

var s = new java.lang.String('hello');
var c = s.charAt(0);

var myClass = new com.test.app.MyClass();
//myClass.foo(1);

Hyperloop.method(myClass, 'foo(short)').call(1);
//Hyperloop.method(myClass, 'foo(int)').call(1);
//Hyperloop.method(myClass, 'foo(double)').call(1);


