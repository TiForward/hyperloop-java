"use hyperloop"

var s = Hyperloop.method('java.lang.String', '<init>(java.lang.String)').call('hello');
var c = s.getClass();
console.log(c.getName());



