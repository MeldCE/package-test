# Package Test
A module for testing an npm package in a near real environment.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
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

<!--=include ../build/package-test.js.md -->
