/**
 * Page object for any actions on the page
 * @constructor
 */
var Actions = function () {

    // Set up expected conditions object to use with my 'waits'
    this.EC = protractor.ExpectedConditions;

    /**
     * Used to wait for an element if we know if should be there
     * @param {ElementFinder} element on the web page
     * @return {Promise} true if found
     */
     this.waitForElement = async function(element) {
         return await browser.wait(this.EC.visibilityOf(element), 4000)
     };

     /**
      * Used to wait until an element is clickable
      * @param {ElementFinder} element on the web page
      * @return {Promise} true if clickable
      */
    this.isElementClickable = async function(element) {
    return await browser.wait(this.EC.elementToBeClickable(element), 4000);
    };

    /**
     * Used to click on an element in the webpage
     * @param {ElementFinder} element on the web page
     * @return {Promise} <void>
     */
    this.click = async function(element) {
        await this.isElementClickable(element);
        return await element.click();
    };

    /**
     * Used to type text into a field
     * @param {ElementFinder} element on the web page
     * @return {String} text you want to type into a field
     */
    this.type = async function(element, text) {
        await this.waitForElement(element);
        return await element.sendKeys(text);
    };

    /**
     * Check if an element is on the page
     * @param {ElementFinder} element on the web page
     * @return {Promise} true if present
     */
    this.isElementOnPage = async function(element) {
        return await browser.isElementPresent(element);
    };
};

module.exports = new Actions();