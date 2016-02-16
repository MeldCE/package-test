# Package Test
A module for testing an npm package in a near real environment.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [packageTest](#packagetest)
- [packageTest.packageJson](#packagetestpackagejson)
- [packageTest.testConfig](#packagetesttestconfig)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

The module provides the command `package-test`. Running command will:
1. Copy the package files as they would be by npm to a testing directory
1. install the dependencies of the package (using `npm install --production`)
1. copy over any testing files
1. run the test command in the testing directory

The testing files and the test command to run can be specified in a JSON file
named `.package-test.json`.

The module itself can also be used within another script to copy of the files
to the test directory (steps 1 and 3 above).

```javascript
var packageTest = require('package-test');

// Get a promise of setting up the test directory
packageTest().then(function() {
  // Do some stuff after the files have been copied over
});
```

## packageTest

Sets up a package test environment (a folder) by copying the package as it
would be exported by NPM, installing any dependencies (by running
`npm install --production` in the module folder) and then copying any
additional testing files.

**Parameters**

-   `options` **object** package-test options
    -   `options.testFolder` **[string]** The path to the test folder to create.
               If not given, it will default to the name of the package
    -   `options.testFiles` **[string or Array&lt;string&gt; or Array&lt;Object&gt;]** A glob string to
               match the test files to copy over to the test folder, an Array of
               globs string match test files to copy over or an Array of Objects
               with a `files` parameter, specyfing the glob  or array of globs to
               match the files to copy, a `destination` parameter, specifying where
               to copy the files to, and a `base` parameter, specifying a part of
               the path to remove  from the test files when copying
    -   `options.testCommand` **[string or boolean]** Test command that should be
               run instead of the one specified in the package.json file
    -   `options.noDeleteFolder` **[boolean]** Whether or not to not delete the
               test folder (and fail) if it already exists. If `testFolder` is not
               set, this must be set to `false` to delete the existing folder

Returns **Promise** A promise of setting up the package test folder that will
         resolve to an Object containing the `testFolder` and the
         `packageFolder` in node_modules of the test folder

## packageTest.packageJson

Retrieve the package.json in the working folder

**Parameters**

-   `ignoreMissing` **string** Whether to ignore a file does not exist error
           and instead resolve to undefined

Returns **Promise** A promise that will resolve to the Object contained
         in the package.json file

## packageTest.testConfig

Retrieve the .package-test.json file in the working folder

**Parameters**

-   `ignoreMissing` **string** Whether to ignore a file does not exist error
           and instead resolve to undefined

Returns **Promise** A promise that will resolve to the Object contained
         in the .package-test.json file

