/**
 * metabase test case for Java
 */
var should = require('should'),
    path = require('path'),
    fs = require('fs'),
    appc = require('node-appc'),
    metabase = require('../lib/metabase'),
    wrench = require('wrench'),
    TMP = path.join('.', '_tmp');

describe("Java metabase", function() {

	before(function(done){
		wrench.mkdirSyncRecursive(TMP, 0755);
		done();
	});

	after(function(){
		wrench.rmdirSyncRecursive(TMP);
	});

	it("should load",function(done) {
		should.exist(metabase);
		done();
	});

	it("should parse Java standard libraries",function(done) {
		this.timeout(30000);
		metabase.loadMetabase(null, {force:true, platform:'java', cacheDir:TMP}, function(err,json){
			should.not.exist(err);
			should.exist(json);
			json.should.be.an.Object;
			json.classes.should.be.an.Object;
			should.exist(json.classes['java.lang.String']);
			json.classes['java.lang.String'].properties.should.be.an.Object;
			json.classes['java.lang.String'].methods.should.be.an.Object;
			json.classes['java.lang.String'].superClass.should.eql('java.lang.Object');
			json.classes['java.lang.String'].metatype.should.eql('class');
			json.classes['java.lang.String'].package.should.eql('java.lang');

			(json.classes['java.lang.String'].methods['<init>'] instanceof Array).should.be.true;
			should.exist(json.classes['java.lang.String'].methods['toString'][0]);
			should.exist(json.classes['java.lang.String'].methods['toString'][0].attributes);
			should.exist(json.classes['java.lang.String'].methods['toString'][0].signature);
			(json.classes['java.lang.String'].methods['toString'][0].attributes.indexOf('public') >= 0).should.be.true;
			json.classes['java.lang.String'].methods['toString'][0].signature.should.be.eql('()Ljava/lang/String;');

			should.exist(json.classes['java.lang.Object']);
			should.not.exist(json.classes['java.lang.Object'].superClass);
			json.classes['java.lang.Object'].rootClass.should.be.true;

			done();
		});
	});

});