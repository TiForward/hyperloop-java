"use hyperloop"

var obj1 = new java.lang.String('hello');
var obj2 = new java.lang.String('hello');
var obj3 = new java.lang.String('hola');

console.log('should be true: ',obj1.equals(obj2));
console.log('should be false:', obj1.equals(obj3));

var state1 = java.lang.Thread$State.NEW;
var state2 = java.lang.Thread$State.NEW;

console.log('should be true: '+state1.equals(state2));

