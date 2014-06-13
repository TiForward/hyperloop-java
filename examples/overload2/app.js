"use hyperloop"

var s = Hyperloop.method('java.lang.String', '<init>(java.lang.String)').call('hello');
//var i = s.indexOf(0);

var i = Hyperloop.method(s, 'indexOf(int)').call(0);
console.log(i);
