"use hyperloop"

var t = Hyperloop.method('java.lang.Thread$State', '<init>(java.lang.String,int)').call('test',1);
t = t.NEW;
t = t.NEW.WAITING;
t = t.NEW.WAITING.TIMED_WAITING;

var e = Hyperloop.method('java.io.InvalidClassException', '<init>(java.lang.String,java.lang.String)').call('MyTestException','class property test');

var c = e.classname;

console.log(e.classname);

e.classname = 'java.lang.Object';

java.lang.String.CASE_INSENSITIVE_ORDER;

var order = java.lang.String.CASE_INSENSITIVE_ORDER;

console.log(java.lang.String.CASE_INSENSITIVE_ORDER);
