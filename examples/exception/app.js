"use hyperloop"
try {
	var i = Hyperloop.method('java.lang.Integer', '<init>(java.lang.String)').call('no way');
	console.log('integer is',i);
} catch (E) {
	console.log(E);
}




