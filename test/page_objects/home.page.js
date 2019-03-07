/**
 * Page object for CRUD homepage
 * @constructor
 */

 var HomePage = function() {

    /**
     * Add product button
     */
    this.addProduct = $('.mat-flat-button', '.mat-primary');

    /**
     * Create locator for product element (we don't know what our product name will be)
     * @param {object} product
     * @returns {ElementFinder} element
     */
    this.productInTable = function(product){
        return element(by.cssContainingText('.mat-cell', product.name));
    };

 };

 module.exports = new HomePage();