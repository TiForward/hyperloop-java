"use hyperloop"
var s = Hyperloop.method('java.lang.String', '<init>(java.lang.String)').call('hello');
var str = s.toString();
console.log('str returned:',str);
var s2 = Hyperloop.method('java.lang.String', '<init>(char[])').call(['h','e','l','l','o']);
console.log('str from array returned:',s2);
var b = Hyperloop.method('java.lang.Boolean', '<init>(boolean)').call(true);
console.log('boolean is',b);
var d = Hyperloop.method('java.lang.Double', '<init>(double)').call(123);
console.log('double is',d);
var l = Hyperloop.method('java.lang.Long', '<init>(long)').call(456);
console.log('long is',l);
var s = Hyperloop.method('java.lang.Short', '<init>(short)').call(1);
console.log('short is',s);
var i = Hyperloop.method('java.lang.Integer', '<init>(int)').call(9);
console.log('integer is',9);


exports.a = '1';

