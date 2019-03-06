/**
 * Page object for CRUD Add Product page
 * @constructor
 */

 var AddProductPage = function() {

     this.productName = $('mat-input-0');
     this.productDescription = $('mat-input-1');
     this.productPrice = $('mat-input-2');
     this.submitButton = $('[type=submit]');

 };

 module.exports = new AddProductPage();