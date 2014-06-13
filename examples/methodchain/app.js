"use hyperloop"

var s = Hyperloop.method('java.lang.String', '<init>(java.lang.String)').call('hello');
console.log(s.getClass());
console.log(s.getClass().getName());
console.log(s.getClass().getName().charAt(1));
