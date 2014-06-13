"use hyperloop"
try {
	var s = Hyperloop.method('java.lang.String', '<init>(java.lang.String)').call('hello');
    var plus = s+123;
    console.log(plus);
} catch (E) {
    console.log(E);
}



