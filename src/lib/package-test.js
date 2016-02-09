var skemer = require('skemer');
var fs = require('fs');
var path = require('path');
var Promise = require('promise');

var rimraf = Promise.denodeify(require('rimraf'));
var mkdirp = Promise.denodeify(require('mkdirp'));
var cp = Promise.denodeify(require('node-cp'));
var access = Promise.denodeify(fs.access);
var glob = Promise.denodeify(require('glob'));

function readFile(file) {
  return new Promise(function(resolve, reject) {
    fs.readFile(file, function(err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

var schemaOptions = { type: {
  testFolder: {
    type: 'string',
    default: 'package-test'
  },
  deleteFolder: {
    type: 'boolean',
    default: true
  }
}, required: true};

module.exports = function packageTest(options) {
  console.log('packageTest');
  return new Promise(function packageTestPromise(resolve, reject) {
    console.log('hello');
    // Check package.json exists
    //var package = require('./package.json');
    try {
      options = skemer.validateNew({
        parameterName: 'options',
        schema: schemaOptions
      }, options);
      console.log('options are', options | {});
      resolve(options);
    } catch(err) {
      console.log('err', err);
      reject(err);
    }
  }); /*.then(function(options) {
    console.log('options are', options);
    return Promise.resolve('ok');
  });*/
};
/*
    // Check if the folder already exists
    return access(options.testFolder, fs.F_OK).then(function() {
      if (options.deleteFolder) {
        // Try an delete folder
        return rimraf(options.testFolder)
      } else {
        // Reject as don't want a polluted fake environment
        return Promise.reject(new Error('Test folder already exists'));
      }
    }, function(err) {
      if (err.errno !== -2) {
        err.message = 'Error checking test folder existence: ' + err.message;
        return Promise.reject(err);
      } else {
        Promise.resolve();
      }
    }).then(function() {
      // Make the test folder
      return mkdirp(path.join(options.testFolder, 'node_modules'));
    }).then(function() {
      // Copy over the package.json and the a
      return Promise.all([
        cp('package.json', options.testFolder),
        cp('package.json', path.join(options, 'node_modules', package.name)),
        readFile('.npmignore')
            .catch(function() { readFile('.gitignore') })
            .catch(function() { resolve('') })
            .then(function(ignore) {
              new Promise(function(resolve, reject) {
                // Add files npm ignores by default to ignore list
                // https://docs.npmjs.com/misc/developers#keeping-files-out-of-your-package
                ignore = '.*.swp\n._*\n.DS_Store\n.git\n.hg\n.npmrc\n'
                    + '.lock-wscript\n.svn\n.wafpickle-*\nconfig.gypi\nCVS\n'
                    + 'npm-debug.log\nnode_modules\n' + ignore;

                // Split the ignore list on new lines
                ignore = ignore.replace(/[\n\r]+/g, '\n').split('\n');

                // Change into the filter
                glob('**', { ignore: ignore }, function(err, files) {
                  if (err) {
                    reject(err);
                  } else {
                    console.log(files);
                  }
                });
              });
            })
      ]);
    })
  });
}
*/
