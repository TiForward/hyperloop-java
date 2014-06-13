"use hyperloop"

var obj1 = Hyperloop.method('java.lang.String', '<init>(java.lang.String)').call('hello');
var obj2 = Hyperloop.method('java.lang.String', '<init>(java.lang.String)').call('hello');
var obj3 = Hyperloop.method('java.lang.String', '<init>(java.lang.String)').call('hola');

console.log('should be true: ',obj1.equals(obj2));
console.log('should be false:', obj1.equals(obj3));

var state1 = java.lang.Thread$State.NEW;
var state2 = java.lang.Thread$State.NEW;

console.log('should be true: '+state1.equals(state2));

