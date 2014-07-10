"use hyperloop"

var t = new java.lang.Thread$State('test',1);
t = t.NEW;
t = t.NEW.WAITING;
t = t.NEW.WAITING.TIMED_WAITING;

var e = new java.io.InvalidClassException('MyTestException','class property test');

var c = e.classname;

console.log(e.classname);

e.classname = 'java.lang.Object';

java.lang.String.CASE_INSENSITIVE_ORDER;

var order = java.lang.String.CASE_INSENSITIVE_ORDER;

console.log(java.lang.String.CASE_INSENSITIVE_ORDER);
