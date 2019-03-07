// Access the Actions module
const actions = require('../support/actions');

// Import our page objects
const homePage = require('../page_objects/home.page');
const addProductPage = require('../page_objects/add-product.page');
const viewProductPage = require('../page_objects/view-product.page');

// Add to chai assertions library
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

// Every step definition needs the following:
// Bring in Cucumber and the World
const {Given, When, Then, Before} = require('cucumber');
const {setWorldConstructor} = require('cucumber');
const CustomWorld = require('../support/world').World;

setWorldConstructor(CustomWorld);

// Cucumber before 'hook'
Before(function() {
    this.openWebsite();
});

Given("a product with name {string} and description {string} and price {string} doesn't exist", function (name, description, price) {
    // can also use {int} above but use {string} if writing to screen

    // Convert data into an object
    this.product.name = name;
    this.product.description = description;
    this.product.price = price;

    // Must have a return to signify end of step.
    // "Eventually" comes from the chaiAsPromised API.
    // Temporarily comment the following out for parameterisation.
    // return expect(actions.isElementOnPage(homePage.productInTable(this.product))).to.eventually.be.false;
});

When('I add the product', function () {

    // break point
    debugger;
    // run 'npm run debug' open 'chrome://inspect/#devices' and click 'inspect'.

    actions.click(homePage.addProduct);
    actions.type(addProductPage.productName, this.product.name);
    actions.type(addProductPage.productDescription, this.product.description);
    actions.type(addProductPage.productPrice, this.product.price);

    return actions.click(addProductPage.submitButton);
});

Then('the product is added', function () {
    return expect(actions.waitForElement(viewProductPage.productName(this.product))).to.eventually.be.true;
});