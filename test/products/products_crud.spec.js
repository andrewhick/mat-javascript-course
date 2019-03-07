const homePage = require('../page_objects/home.page');
const addProductPage = require('../page_objects/add-product.page');
const viewProductPage = require('../page_objects/view-product.page');

// TEST DATA: Import our test module and the 'jasmine data provider' 'using' command to handle our data
 var using = require("jasmine-data-provider");
 var products = require("../data/product-data.module.js");

// TEST DATA: Add a 'describe' which encapsulates all tests:
describe("productTests", function() {
    beforeEach(function() {
        browser.get("")
    })

    // TEST DATA: Add 'using' to use our test data:
    using(products.productInfo, function(product, description) {
        it('should create a product ' + description, function() {
        
            // TODO: add a check that no product exists here.
            homePage.addProduct.click();
        
            // fill in form:
            addProductPage.productName.sendKeys(product.name);
            addProductPage.productDescription.sendKeys(product.description);
            addProductPage.productPrice.sendKeys(product.price);
            addProductPage.submitButton.click();
        
            // check product name
            expect(viewProductPage.productName(product).isDisplayed()).toBeTruthy();
        });
    });
});