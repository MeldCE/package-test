var packageTest = require('../lib/package-test.js');
var fs = require('fs');

describe('default package packaging', function() {
  var testFolders;
  beforeAll(function(done) {
    packageTest().then(function(folders) {
      testFolders = folders;
      done();
    }, function(err) {
      throw err;
    });
  });

  it('should return the testFolder and packageFolder parameters', function() {
    expect(testFolders.testFolder).toBe('package-test');

    expect(testFolders.packageFolder)
        .toBe('package-test/node_modules/package-test');
  });

  it('should create a new test folder', function(done) {
    fs.access(testFolders.testFolder, fs.W_OK, function(err) {
      if (err) {
        fail('couldn\'t access testFolder');
        throw err;
      }
      
      done();
    });
  });

  it('should create a package folder inside the test folder', function(done) {
    fs.access(testFolders.packageFolder, fs.W_OK, function(err) {
      if (err) {
        fail('couldn\'t access packageFolder');
        throw err;
      }
      
      done();
    });
  });
});

describe('set package packaging', function() {
  var testFolders;
  beforeAdd(function(done) {
    packageTest({
      testFolder: 'test1',
      testFiles: [
        {
          files: 'test',
          base: 'test'
        }
      ]
    });
    }).then(function(folders) {
      testFolders = folders;
      done();
    }, function(err) {
      throw err;
    });
  });

  it('should return the testFolder and packageFolder parameters', function() {
    expect(testFolders.testFolder).toBe('test1');

    expect(testFolders.packageFolder)
        .toBe('test1/node_modules/package-test');
  });

  it('should create a new test folder', function(done) {
    fs.access(testFolders.testFolder, fs.W_OK, function(err) {
      if (err) {
        fail('couldn\'t access testFolder');
        throw err;
      }
      
      done();
    });
  });

  it('should create a package folder inside the test folder', function(done) {
    fs.access(testFolders.packageFolder, fs.W_OK, function(err) {
      if (err) {
        fail('couldn\'t access packageFolder');
        throw err;
      }
      
      done();
    });
  });
});
