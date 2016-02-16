var packageTest = require('package-test');
var fs = require('fs');

describe('package packaging' function() {
  let testFolders
  beforeAll(function(done) {
    packageTest().then(function(folders) {
      testFolders = folders;
      done();
    }, function(err) {
      fail(err);
    });
  });

  it('should return the testFolder and packageFolder parameters', function() {
    expect(testFolders.testFolder).toBe('testFolder');

    expect(testFolders.packageFolder)
        .toBe('testFolder/node_modules/package-test');
  });

  //it('should create a new test folder', function(done) {
    
});

