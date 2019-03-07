/**
 * Used to create the locator for the Product element (we don't know what the product name will be)
 * @param {object} product
 * @returns {ElementFinder} element
 */

 var viewProductPage = function() {
    this.productName = function(product) {
        return element(by.cssContainingText('h2', product.name));
    };
 };

 module.exports = new viewProductPage();