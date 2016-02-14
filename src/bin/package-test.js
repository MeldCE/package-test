#!/usr/bin/env node
'use strict';

let fs = require('fs');
let child_process = require('child_process');
let path = require('path');
/*fs.access('tesrt.js', fs.F_OK, function test(err) {
  console.log('ok', err);
});*/

require('promise/lib/rejection-tracking').enable(
  {allRejections: true}
);

let packageTest = require('../lib/package-test.js');

console.log('Setting up environment');
let p = packageTest();
console.log('waiting on package test setup promise');
p.then(function(data) { 
  console.log('Installing production dependencies of package');
  child_process.execSync('npm install --production', {
    cwd: data.packageFolder
  });

  console.log('Running npm test');
  child_process.execSync('npm test', {
    cwd: data.testFolder
  });
}, function(err) { throw err; });

console.log('end');
