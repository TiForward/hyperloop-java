"use hyperloop"
var s = new java.lang.String('hello');
var str = s.toString();
console.log('str returned:',str);
var s2 = new java.lang.String(['h','e','l','l','o']);
console.log('str from array returned:',s2);
var b = new java.lang.Boolean(true);
console.log('boolean is',b);
var d = Hyperloop.method('java.lang.Double', '<init>(double)').call(123);
console.log('double is',d);
var l = new java.lang.Long(456);
console.log('long is',l);
var s = new java.lang.Short(1);
console.log('short is',s);
var i = new java.lang.Integer(9);
console.log('integer is',9);


exports.a = '1';

