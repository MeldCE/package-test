# package-test
A command for testing an npm package in a near real environment

## Idea for testing process
1. Create the test directory `package-test`
1. Copy the package files (those in the directory except those that would be excluded by npm) into `package-test/node_modules/<module_name>`
1. Copy the `package.json` file into `package-test/node_modules/<module_name>`
1. In `package-test/node_modules/<module_name>`, run npm install --production
1. Copy `package.json` any test files (specified in `.testfiles`) into `package-test`
1. In `package-test`, run the test command specified in `package.json`
