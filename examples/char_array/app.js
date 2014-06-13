"use hyperloop"
var s = Hyperloop.method('java.lang.String', '<init>(java.lang.String)').call('hello');
console.log('str returned:',s.toString());
console.log('charAt(1) returned:',s.charAt(1));
console.log('toCharArray returned:',s.toCharArray());

