#!/usr/bin/env node
'use strict';

let childProcess = require('child_process');
let Promise = require('promise');

require('promise/lib/rejection-tracking').enable(
  {allRejections: true}
);

let packageTest = require('../lib/package-test.js');

Promise.all([
  packageTest.packageJson(),
  packageTest.testConfig(true)
]).then(function(config) {
  console.log('Setting up environment');
  
  let p = packageTest();
  console.log('waiting on package test setup promise');
  return p.then(function(data) { 
    console.log('Installing production dependencies of package');
    childProcess.execSync('npm install --production', {
      cwd: data.packageFolder
    });

    let testCommand;
    
    if ((testCommand = (config[1] && config[1].testCommand
        ? config[1].testCommand
        : (config[0] && config[0].scripts && config[0].scripts.test 
        ? config[0].scripts.test : false)))) {
      console.log('Running `' + testCommand + '`');
      childProcess.execSync(testCommand, {
        cwd: data.testFolder
      });
    } else {
      console.log('No test command specified, exiting');
    }

    return Promise.resolve();
  });
}).catch(function(err) { throw err; });

