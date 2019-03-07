var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "should create a product",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "6968f03e7a3ba80ae93456da99a7992d",
        "instanceId": 7132,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008c00dc-00ce-005d-006f-00160003008d.png",
        "timestamp": 1551968419555,
        "duration": 4534
    },
    {
        "description": "should create a productmeat",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ffd1a64e26a9908d9cd54eba617461be",
        "instanceId": 13044,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productmeat\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00fe008f-0081-00b2-00ca-007800820064.png",
        "timestamp": 1551969117024,
        "duration": 107
    },
    {
        "description": "should create a productvegetables",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ffd1a64e26a9908d9cd54eba617461be",
        "instanceId": 13044,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productvegetables\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00b800c1-00aa-0078-0008-0068009e0002.png",
        "timestamp": 1551969117579,
        "duration": 40
    },
    {
        "description": "should create a productbread",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ffd1a64e26a9908d9cd54eba617461be",
        "instanceId": 13044,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a productbread\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00040070-000f-0016-00aa-008a008b001d.png",
        "timestamp": 1551969117948,
        "duration": 26
    },
    {
        "description": "should create a product meat",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "dc6e1cce450c3814162c101dc777541a",
        "instanceId": 7180,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a product meat\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00600037-0023-00e7-00d7-00c100d600d6.png",
        "timestamp": 1551969317020,
        "duration": 57
    },
    {
        "description": "should create a product vegetables",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "dc6e1cce450c3814162c101dc777541a",
        "instanceId": 7180,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a product vegetables\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00aa00ba-0010-00d1-00ef-0044001f00f7.png",
        "timestamp": 1551969317456,
        "duration": 20
    },
    {
        "description": "should create a product bread",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "dc6e1cce450c3814162c101dc777541a",
        "instanceId": 7180,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a product bread\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "004500a3-00c1-00f3-00c0-0055001d00f8.png",
        "timestamp": 1551969317799,
        "duration": 23
    },
    {
        "description": "should create a product meat",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "217340e39e34ef49e188814d020ca607",
        "instanceId": 8532,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a product meat\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e30095-00c2-00b5-00d1-004b00e60001.png",
        "timestamp": 1551969388523,
        "duration": 91
    },
    {
        "description": "should create a product vegetables",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "217340e39e34ef49e188814d020ca607",
        "instanceId": 8532,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a product vegetables\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00b90018-000d-005f-002d-000e003c00e6.png",
        "timestamp": 1551969388970,
        "duration": 19
    },
    {
        "description": "should create a product bread",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "217340e39e34ef49e188814d020ca607",
        "instanceId": 8532,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a product bread\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005800af-00b1-0059-0004-00550032002c.png",
        "timestamp": 1551969389285,
        "duration": 22
    },
    {
        "description": "should create a product meat",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "2e52264d1328f3da45b6df5f87853ef9",
        "instanceId": 10556,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a product meat\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "000100ee-00ed-0031-0063-0000003b00ec.png",
        "timestamp": 1551969430739,
        "duration": 94
    },
    {
        "description": "should create a product vegetables",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "2e52264d1328f3da45b6df5f87853ef9",
        "instanceId": 10556,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a product vegetables\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002600d6-00a0-0043-0013-006300b100c0.png",
        "timestamp": 1551969431206,
        "duration": 23
    },
    {
        "description": "should create a product bread",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "2e52264d1328f3da45b6df5f87853ef9",
        "instanceId": 10556,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:188:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\stude\\mat-javascript-course\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:21:29)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"should create a product bread\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\stude\\mat-javascript-course\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:18:5\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:37:22\n    at Array.forEach (<anonymous>)\n    at C:\\Users\\stude\\mat-javascript-course\\node_modules\\jasmine-data-provider\\src\\index.js:30:24\n    at Object.<anonymous> (C:\\Users\\stude\\mat-javascript-course\\test\\products\\products_crud.spec.js:17:1)\n    at Module._compile (module.js:652:30)\n    at Object.Module._extensions..js (module.js:663:10)\n    at Module.load (module.js:565:32)\n    at tryModuleLoad (module.js:505:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a700ea-0032-00d1-008f-0017008f00a8.png",
        "timestamp": 1551969431533,
        "duration": 20
    },
    {
        "description": "should create a product meat|productTests",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ab713adf11547bda104862df116fe93c",
        "instanceId": 1600,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00080099-0009-0031-0025-009f00c500d3.png",
        "timestamp": 1551969567922,
        "duration": 3008
    },
    {
        "description": "should create a product vegetables|productTests",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ab713adf11547bda104862df116fe93c",
        "instanceId": 1600,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00da0014-001a-001e-00e7-009000b500a7.png",
        "timestamp": 1551969571307,
        "duration": 2304
    },
    {
        "description": "should create a product bread|productTests",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "ab713adf11547bda104862df116fe93c",
        "instanceId": 1600,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0088009f-0014-0095-0034-00e400190057.png",
        "timestamp": 1551969573944,
        "duration": 2232
    },
    {
        "description": "should create a product meat|productTests",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c91d286f8700ff1d36a606828b5e4d22",
        "instanceId": 13512,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:8080/ - Failed to decode downloaded font: https://fonts.gstatic.com/stats/Roboto/normal/400",
                "timestamp": 1551970213723,
                "type": ""
            }
        ],
        "screenShotFile": "003f0066-003f-00ce-00a4-00e400bc00c7.png",
        "timestamp": 1551970212726,
        "duration": 7309
    },
    {
        "description": "should create a product vegetables|productTests",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c91d286f8700ff1d36a606828b5e4d22",
        "instanceId": 13512,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:8080/ - Failed to decode downloaded font: https://fonts.gstatic.com/stats/Roboto/normal/400",
                "timestamp": 1551970221049,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:8080/products - Failed to decode downloaded font: https://fonts.gstatic.com/stats/Roboto/normal/400",
                "timestamp": 1551970223438,
                "type": ""
            }
        ],
        "screenShotFile": "000300d4-00c6-0016-0086-00f5000400f2.png",
        "timestamp": 1551970220642,
        "duration": 5104
    },
    {
        "description": "should create a product meat|productTests",
        "passed": true,
        "pending": false,
        "sessionId": "54ceebd2-f020-4190-a1f0-d5239dfdc88c",
        "instanceId": 2944,
        "browser": {
            "name": "firefox"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008d0055-00cb-006a-00f9-00e800f30042.png",
        "timestamp": 1551970219425,
        "duration": 10137
    },
    {
        "description": "should create a product bread|productTests",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "sessionId": "c91d286f8700ff1d36a606828b5e4d22",
        "instanceId": 13512,
        "browser": {
            "name": "chrome",
            "version": "72.0.3626.119"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://localhost:8080/products - Failed to decode downloaded font: https://fonts.gstatic.com/stats/Roboto/normal/400",
                "timestamp": 1551970227212,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://localhost:8080/products - Failed to decode downloaded font: https://fonts.gstatic.com/stats/Roboto/normal/400",
                "timestamp": 1551970229127,
                "type": ""
            }
        ],
        "screenShotFile": "00bd00c1-00f5-0019-0068-00e1003500a7.png",
        "timestamp": 1551970226133,
        "duration": 4943
    },
    {
        "description": "should create a product vegetables|productTests",
        "passed": true,
        "pending": false,
        "sessionId": "54ceebd2-f020-4190-a1f0-d5239dfdc88c",
        "instanceId": 2944,
        "browser": {
            "name": "firefox"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "005a00e3-009a-00f1-0059-00cf00d5006f.png",
        "timestamp": 1551970229849,
        "duration": 4470
    },
    {
        "description": "should create a product bread|productTests",
        "passed": true,
        "pending": false,
        "sessionId": "54ceebd2-f020-4190-a1f0-d5239dfdc88c",
        "instanceId": 2944,
        "browser": {
            "name": "firefox"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00360012-006b-00d5-0006-00300074005e.png",
        "timestamp": 1551970234447,
        "duration": 3575
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

