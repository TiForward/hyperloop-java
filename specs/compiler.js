/**
 * compiler test case for Java
 */
var should = require('should'),
    path = require('path'),
    fs = require('fs'),
    wrench = require('wrench'),
    compiler = require('../lib/compiler'),
    metabase = require('../lib/metabase'),
    TMP = path.join('.', '_tmp');

describe("Java compiler", function() {

	before(function(){
		wrench.mkdirSyncRecursive(TMP, 0755);
	});

	after(function(){
		wrench.rmdirSyncRecursive(TMP);
	});

	it("should load",function(done) {
		should.exist(compiler);
		done();
	});

	it("should look up type hierarchy for methods",function(done) {
		this.timeout(10000);

		metabase.loadMetabase(null, {force:true, platform:'java', cacheDir:TMP}, function(err,json){
			should.not.exist(err);
			should.exist(json);
			json.should.be.an.Object;
			json.classes.should.be.an.Object;
			should.exist(json.classes['java.lang.String']);
			should.exist(json.classes['java.lang.Object']);
			state = { metabase: json };
			node = { args: [], start: 1 };

			getClass = compiler.getInstanceMethodSymbol(state, 'java.lang.String', 'getClass', 'varname', 'symbolname', node, function(node,msg){
				throw new Error(msg);
			});
			should.exist(getClass);
			getClass.should.be.an.Object;
			getClass.type.should.be.eql('method');

			getClass.returnType.should.be.eql('java.lang.Class');

			should.exist(getClass.method);
			getClass.method.should.be.an.Object;
			should.exist(getClass.method.attributes);
			(getClass.method.attributes.indexOf('public') >= 0).should.be.true;
			(getClass.method.attributes.indexOf('final') >= 0).should.be.true;
			should.exist(getClass.method.signature);
			getClass.method.signature.should.be.eql('()Ljava/lang/Class;');
			done();
		});
	});
});