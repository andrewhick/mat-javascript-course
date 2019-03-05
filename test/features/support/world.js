'use strict'

var World = function World() {

    // tie the variable into World function and execution context
    this.product = undefined;

    // open browser and go to website
    this.openWebsite = function() {

        // Cucumber overrides Protractor's Angular functionality.
        // Use this to treat website like any other:
        browser.waitForAngularEnabled(false);

        // Visit URL. Defaults to baseUrl.
        return browser.get('');
    }

    // exports function as a module so we can import it into another file.
    module.exports.World = World;

}