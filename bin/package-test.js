#!/usr/bin/env node

var fs = require('fs');
var child_process = require('child_process');
var path = require('path');
/*fs.access('tesrt.js', fs.F_OK, function test(err) {
  console.log('ok', err);
});*/

var packageTest = require('../lib/package-test.js');

void 0;
packageTest().then(function(data) { 
  void 0;
  child_process.execSync('npm install --production', {
    cwd: data.packageFolder
  });

  void 0;
  child_process.execSync('npm test', {
    cwd: data.testFolder
  });
}, function(err) { throw err; });
