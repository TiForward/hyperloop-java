"use hyperloop"

var num=1, str='1', obj={value:'1'}, bool=true,
	nativeObj=new java.lang.String('1'),
	nativeObjSame=new java.lang.String('1'),
	nativeObj2=new java.lang.String('2');

function assert (value, test, msg) {
	console.log(
		(value==test ? '\033[32m✓\033[39m\033[0m ' : '\033[31m✘\033[39m\033[0m') + '\t('+msg+')'
	);
}

assert((num instanceof nativeObj), false, 'number to native');
assert((str instanceof nativeObj), false, 'string to native');
assert((bool instanceof nativeObj), false, 'boolean to native');
assert((obj instanceof nativeObj), false, 'JS object to native');

assert((nativeObj instanceof nativeObj), true, 'native object');
assert((nativeObjSame instanceof nativeObj), true, 'native object with same value');
assert((nativeObj2 instanceof nativeObj), true, 'native object with different value');
assert((nativeObj instanceof nativeObjSame), true, 'native object with same value');
assert((nativeObj instanceof nativeObj2), true, 'native object with different value');
