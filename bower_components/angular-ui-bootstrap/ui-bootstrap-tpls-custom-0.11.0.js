angular.module("ui.bootstrap", ["ui.bootstrap.tpls", "ui.bootstrap.bindHtml", "ui.bootstrap.dateparser", "ui.bootstrap.position", "ui.bootstrap.datepicker", "ui.bootstrap.modal", "ui.bootstrap.tabs", "ui.bootstrap.timepicker", "ui.bootstrap.typeahead"]);
angular.module("ui.bootstrap.tpls", ["template/datepicker/datepicker.html", "template/datepicker/day.html", "template/datepicker/month.html", "template/datepicker/popup.html", "template/datepicker/year.html", "template/modal/backdrop.html", "template/modal/window.html", "template/tabs/tab.html", "template/tabs/tabset.html", "template/timepicker/timepicker.html", "template/typeahead/typeahead-match.html", "template/typeahead/typeahead-popup.html"]);


angular.module('ui.bootstrap.bindHtml', [])

    .directive('bindHtmlUnsafe', function () {
        return function (scope, element, attr) {
            element.addClass('ng-binding').data('$binding', attr.bindHtmlUnsafe);
            scope.$watch(attr.bindHtmlUnsafe, function bindHtmlUnsafeWatchAction(value) {
                element.html(value || '');
            });
        };
    });

angular.module('ui.bootstrap.dateparser', [])

    .service('dateParser', ['$locale', 'orderByFilter', function ($locale, orderByFilter) {

        this.parsers = {};

        var formatCodeToRegex = {
            'yyyy': {
                regex: '\\d{4}',
                apply: function (value) {
                    this.year = +value;
                }
            },
            'yy': {
                regex: '\\d{2}',
                apply: function (value) {
                    this.year = +value + 2000;
                }
            },
            'y': {
                regex: '\\d{1,4}',
                apply: function (value) {
                    this.year = +value;
                }
            },
            'MMMM': {
                regex: $locale.DATETIME_FORMATS.MONTH.join('|'),
                apply: function (value) {
                    this.month = $locale.DATETIME_FORMATS.MONTH.indexOf(value);
                }
            },
            'MMM': {
                regex: $locale.DATETIME_FORMATS.SHORTMONTH.join('|'),
                apply: function (value) {
                    this.month = $locale.DATETIME_FORMATS.SHORTMONTH.indexOf(value);
                }
            },
            'MM': {
                regex: '0[1-9]|1[0-2]',
                apply: function (value) {
                    this.month = value - 1;
                }
            },
            'M': {
                regex: '[1-9]|1[0-2]',
                apply: function (value) {
                    this.month = value - 1;
                }
            },
            'dd': {
                regex: '[0-2][0-9]{1}|3[0-1]{1}',
                apply: function (value) {
                    this.date = +value;
                }
            },
            'd': {
                regex: '[1-2]?[0-9]{1}|3[0-1]{1}',
                apply: function (value) {
                    this.date = +value;
                }
            },
            'EEEE': {
                regex: $locale.DATETIME_FORMATS.DAY.join('|')
            },
            'EEE': {
                regex: $locale.DATETIME_FORMATS.SHORTDAY.join('|')
            }
        };

        this.createParser = function (format) {
            var map = [], regex = format.split('');

            angular.forEach(formatCodeToRegex, function (data, code) {
                var index = format.indexOf(code);

                if (index > -1) {
                    format = format.split('');

                    regex[index] = '(' + data.regex + ')';
                    format[index] = '$'; // Custom symbol to define consumed part of format
                    for (var i = index + 1, n = index + code.length; i < n; i++) {
                        regex[i] = '';
                        format[i] = '$';
                    }
                    format = format.join('');

                    map.push({ index: index, apply: data.apply });
                }
            });

            return {
                regex: new RegExp('^' + regex.join('') + '$'),
                map: orderByFilter(map, 'index')
            };
        };

        this.parse = function (input, format) {
            if (!angular.isString(input)) {
                return input;
            }

            format = $locale.DATETIME_FORMATS[format] || format;

            if (!this.parsers[format]) {
                this.parsers[format] = this.createParser(format);
            }

            var parser = this.parsers[format],
                regex = parser.regex,
                map = parser.map,
                results = input.match(regex);

            if (results && results.length) {
                var fields = { year: 1900, month: 0, date: 1, hours: 0 }, dt;

                for (var i = 1, n = results.length; i < n; i++) {
                    var mapper = map[i - 1];
                    if (mapper.apply) {
                        mapper.apply.call(fields, results[i]);
                    }
                }

                if (isValid(fields.year, fields.month, fields.date)) {
                    dt = new Date(fields.year, fields.month, fields.date, fields.hours);
                }

                return dt;
            }
        };

        // Check if date is valid for specific month (and year for February).
        // Month: 0 = Jan, 1 = Feb, etc
        function isValid(year, month, date) {
            if (month === 1 && date > 28) {
                return date === 29 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0);
            }

            if (month === 3 || month === 5 || month === 8 || month === 10) {
                return date < 31;
            }

            return true;
        }
    }]);

angular.module('ui.bootstrap.position', [])

/**
 * A set of utility methods that can be use to retrieve position of DOM elements.
 * It is meant to be used where we need to absolute-position DOM elements in
 * relation to other, existing elements (this is the case for tooltips, popovers,
 * typeahead suggestions etc.).
 */
    .factory('$position', ['$document', '$window', function ($document, $window) {

        function getStyle(el, cssprop) {
            if (el.currentStyle) { //IE
                return el.currentStyle[cssprop];
            } else if ($window.getComputedStyle) {
                return $window.getComputedStyle(el)[cssprop];
            }
            // finally try and get inline style
            return el.style[cssprop];
        }

        /**
         * Checks if a given element is statically positioned
         * @param element - raw DOM element
         */
        function isStaticPositioned(element) {
            return (getStyle(element, 'position') || 'static' ) === 'static';
        }

        /**
         * returns the closest, non-statically positioned parentOffset of a given element
         * @param element
         */
        var parentOffsetEl = function (element) {
            var docDomEl = $document[0];
            var offsetParent = element.offsetParent || docDomEl;
            while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent)) {
                offsetParent = offsetParent.offsetParent;
            }
            return offsetParent || docDomEl;
        };

        return {
            /**
             * Provides read-only equivalent of jQuery's position function:
             * http://api.jquery.com/position/
             */
            position: function (element) {
                var elBCR = this.offset(element);
                var offsetParentBCR = { top: 0, left: 0 };
                var offsetParentEl = parentOffsetEl(element[0]);
                if (offsetParentEl != $document[0]) {
                    offsetParentBCR = this.offset(angular.element(offsetParentEl));
                    offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
                    offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
                }

                var boundingClientRect = element[0].getBoundingClientRect();
                return {
                    width: boundingClientRect.width || element.prop('offsetWidth'),
                    height: boundingClientRect.height || element.prop('offsetHeight'),
                    top: elBCR.top - offsetParentBCR.top,
                    left: elBCR.left - offsetParentBCR.left
                };
            },

            /**
             * Provides read-only equivalent of jQuery's offset function:
             * http://api.jquery.com/offset/
             */
            offset: function (element) {
                var boundingClientRect = element[0].getBoundingClientRect();
                return {
                    width: boundingClientRect.width || element.prop('offsetWidth'),
                    height: boundingClientRect.height || element.prop('offsetHeight'),
                    top: boundingClientRect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
                    left: boundingClientRect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
                };
            },

            /**
             * Provides coordinates for the targetEl in relation to hostEl
             */
            positionElements: function (hostEl, targetEl, positionStr, appendToBody) {

                var positionStrParts = positionStr.split('-');
                var pos0 = positionStrParts[0], pos1 = positionStrParts[1] || 'center';

                var hostElPos,
                    targetElWidth,
                    targetElHeight,
                    targetElPos;

                hostElPos = appendToBody ? this.offset(hostEl) : this.position(hostEl);

                targetElWidth = targetEl.prop('offsetWidth');
                targetElHeight = targetEl.prop('offsetHeight');

                var shiftWidth = {
                    center: function () {
                        return hostElPos.left + hostElPos.width / 2 - targetElWidth / 2;
                    },
                    left: function () {
                        return hostElPos.left;
                    },
                    right: function () {
                        return hostElPos.left + hostElPos.width;
                    }
                };

                var shiftHeight = {
                    center: function () {
                        return hostElPos.top + hostElPos.height / 2 - targetElHeight / 2;
                    },
                    top: function () {
                        return hostElPos.top;
                    },
                    bottom: function () {
                        return hostElPos.top + hostElPos.height;
                    }
                };

                switch (pos0) {
                    case 'right':
                        targetElPos = {
                            top: shiftHeight[pos1](),
                            left: shiftWidth[pos0]()
                        };
                        break;
                    case 'left':
                        targetElPos = {
                            top: shiftHeight[pos1](),
                            left: hostElPos.left - targetElWidth
                        };
                        break;
                    case 'bottom':
                        targetElPos = {
                            top: shiftHeight[pos0](),
                            left: shiftWidth[pos1]()
                        };
                        break;
                    default:
                        targetElPos = {
                            top: hostElPos.top - targetElHeight,
                            left: shiftWidth[pos1]()
                        };
                        break;
                }

                return targetElPos;
            }
        };
    }]);

angular.module('ui.bootstrap.datepicker', ['ui.bootstrap.dateparser', 'ui.bootstrap.position'])

    .constant('datepickerConfig', {
        formatDay: 'dd',
        formatMonth: 'MMMM',
        formatYear: 'yyyy',
        formatDayHeader: 'EEE',
        formatDayTitle: 'MMMM yyyy',
        formatMonthTitle: 'yyyy',
        datepickerMode: 'day',
        minMode: 'day',
        maxMode: 'year',
        showWeeks: true,
        startingDay: 0,
        yearRange: 20,
        minDate: null,
        maxDate: null
    })

    .controller('DatepickerController', ['$scope', '$attrs', '$parse', '$interpolate', '$timeout', '$log', 'dateFilter', 'datepickerConfig', function ($scope, $attrs, $parse, $interpolate, $timeout, $log, dateFilter, datepickerConfig) {
        var self = this,
            ngModelCtrl = { $setViewValue: angular.noop }; // nullModelCtrl;

        // Modes chain
        this.modes = ['day', 'month', 'year'];

        // Configuration attributes
        angular.forEach(['formatDay', 'formatMonth', 'formatYear', 'formatDayHeader', 'formatDayTitle', 'formatMonthTitle',
            'minMode', 'maxMode', 'showWeeks', 'startingDay', 'yearRange'], function (key, index) {
            self[key] = angular.isDefined($attrs[key]) ? (index < 8 ? $interpolate($attrs[key])($scope.$parent) : $scope.$parent.$eval($attrs[key])) : datepickerConfig[key];
        });

        // Watchable attributes
        angular.forEach(['minDate', 'maxDate'], function (key) {
            if ($attrs[key]) {
                $scope.$parent.$watch($parse($attrs[key]), function (value) {
                    self[key] = value ? new Date(value) : null;
                    self.refreshView();
                });
            } else {
                self[key] = datepickerConfig[key] ? new Date(datepickerConfig[key]) : null;
            }
        });

        $scope.datepickerMode = $scope.datepickerMode || datepickerConfig.datepickerMode;
        $scope.uniqueId = 'datepicker-' + $scope.$id + '-' + Math.floor(Math.random() * 10000);
        this.activeDate = angular.isDefined($attrs.initDate) ? $scope.$parent.$eval($attrs.initDate) : new Date();

        $scope.isActive = function (dateObject) {
            if (self.compare(dateObject.date, self.activeDate) === 0) {
                $scope.activeDateId = dateObject.uid;
                return true;
            }
            return false;
        };

        this.init = function (ngModelCtrl_) {
            ngModelCtrl = ngModelCtrl_;

            ngModelCtrl.$render = function () {
                self.render();
            };
        };

        this.render = function () {
            if (ngModelCtrl.$modelValue) {
                var date = new Date(ngModelCtrl.$modelValue),
                    isValid = !isNaN(date);

                if (isValid) {
                    this.activeDate = date;
                } else {
                    $log.error('Datepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
                }
                ngModelCtrl.$setValidity('date', isValid);
            }
            this.refreshView();
        };

        this.refreshView = function () {
            if (this.element) {
                this._refreshView();

                var date = ngModelCtrl.$modelValue ? new Date(ngModelCtrl.$modelValue) : null;
                ngModelCtrl.$setValidity('date-disabled', !date || (this.element && !this.isDisabled(date)));
            }
        };

        this.createDateObject = function (date, format) {
            var model = ngModelCtrl.$modelValue ? new Date(ngModelCtrl.$modelValue) : null;
            return {
                date: date,
                label: dateFilter(date, format),
                selected: model && this.compare(date, model) === 0,
                disabled: this.isDisabled(date),
                current: this.compare(date, new Date()) === 0
            };
        };

        this.isDisabled = function (date) {
            return ((this.minDate && this.compare(date, this.minDate) < 0) || (this.maxDate && this.compare(date, this.maxDate) > 0) || ($attrs.dateDisabled && $scope.dateDisabled({date: date, mode: $scope.datepickerMode})));
        };

        // Split array into smaller arrays
        this.split = function (arr, size) {
            var arrays = [];
            while (arr.length > 0) {
                arrays.push(arr.splice(0, size));
            }
            return arrays;
        };

        $scope.select = function (date) {
            if ($scope.datepickerMode === self.minMode) {
                var dt = ngModelCtrl.$modelValue ? new Date(ngModelCtrl.$modelValue) : new Date(0, 0, 0, 0, 0, 0, 0);
                dt.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                ngModelCtrl.$setViewValue(dt);
                ngModelCtrl.$render();
            } else {
                self.activeDate = date;
                $scope.datepickerMode = self.modes[ self.modes.indexOf($scope.datepickerMode) - 1 ];
            }
        };

        $scope.move = function (direction) {
            var year = self.activeDate.getFullYear() + direction * (self.step.years || 0),
                month = self.activeDate.getMonth() + direction * (self.step.months || 0);
            self.activeDate.setFullYear(year, month, 1);
            self.refreshView();
        };

        $scope.toggleMode = function (direction) {
            direction = direction || 1;

            if (($scope.datepickerMode === self.maxMode && direction === 1) || ($scope.datepickerMode === self.minMode && direction === -1)) {
                return;
            }

            $scope.datepickerMode = self.modes[ self.modes.indexOf($scope.datepickerMode) + direction ];
        };

        // Key event mapper
        $scope.keys = { 13: 'enter', 32: 'space', 33: 'pageup', 34: 'pagedown', 35: 'end', 36: 'home', 37: 'left', 38: 'up', 39: 'right', 40: 'down' };

        var focusElement = function () {
            $timeout(function () {
                self.element[0].focus();
            }, 0, false);
        };

        // Listen for focus requests from popup directive
        $scope.$on('datepicker.focus', focusElement);

        $scope.keydown = function (evt) {
            var key = $scope.keys[evt.which];

            if (!key || evt.shiftKey || evt.altKey) {
                return;
            }

            evt.preventDefault();
            evt.stopPropagation();

            if (key === 'enter' || key === 'space') {
                if (self.isDisabled(self.activeDate)) {
                    return; // do nothing
                }
                $scope.select(self.activeDate);
                focusElement();
            } else if (evt.ctrlKey && (key === 'up' || key === 'down')) {
                $scope.toggleMode(key === 'up' ? 1 : -1);
                focusElement();
            } else {
                self.handleKeyDown(key, evt);
                self.refreshView();
            }
        };
    }])

    .directive('datepicker', function () {
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/datepicker/datepicker.html',
            scope: {
                datepickerMode: '=?',
                dateDisabled: '&'
            },
            require: ['datepicker', '?^ngModel'],
            controller: 'DatepickerController',
            link: function (scope, element, attrs, ctrls) {
                var datepickerCtrl = ctrls[0], ngModelCtrl = ctrls[1];

                if (ngModelCtrl) {
                    datepickerCtrl.init(ngModelCtrl);
                }
            }
        };
    })

    .directive('daypicker', ['dateFilter', function (dateFilter) {
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/datepicker/day.html',
            require: '^datepicker',
            link: function (scope, element, attrs, ctrl) {
                scope.showWeeks = ctrl.showWeeks;

                ctrl.step = { months: 1 };
                ctrl.element = element;

                var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

                function getDaysInMonth(year, month) {
                    return ((month === 1) && (year % 4 === 0) && ((year % 100 !== 0) || (year % 400 === 0))) ? 29 : DAYS_IN_MONTH[month];
                }

                function getDates(startDate, n) {
                    var dates = new Array(n), current = new Date(startDate), i = 0;
                    current.setHours(12); // Prevent repeated dates because of timezone bug
                    while (i < n) {
                        dates[i++] = new Date(current);
                        current.setDate(current.getDate() + 1);
                    }
                    return dates;
                }

                ctrl._refreshView = function () {
                    var year = ctrl.activeDate.getFullYear(),
                        month = ctrl.activeDate.getMonth(),
                        firstDayOfMonth = new Date(year, month, 1),
                        difference = ctrl.startingDay - firstDayOfMonth.getDay(),
                        numDisplayedFromPreviousMonth = (difference > 0) ? 7 - difference : -difference,
                        firstDate = new Date(firstDayOfMonth);

                    if (numDisplayedFromPreviousMonth > 0) {
                        firstDate.setDate(-numDisplayedFromPreviousMonth + 1);
                    }

                    // 42 is the number of days on a six-month calendar
                    var days = getDates(firstDate, 42);
                    for (var i = 0; i < 42; i++) {
                        days[i] = angular.extend(ctrl.createDateObject(days[i], ctrl.formatDay), {
                            secondary: days[i].getMonth() !== month,
                            uid: scope.uniqueId + '-' + i
                        });
                    }

                    scope.labels = new Array(7);
                    for (var j = 0; j < 7; j++) {
                        scope.labels[j] = {
                            abbr: dateFilter(days[j].date, ctrl.formatDayHeader),
                            full: dateFilter(days[j].date, 'EEEE')
                        };
                    }

                    scope.title = dateFilter(ctrl.activeDate, ctrl.formatDayTitle);
                    scope.rows = ctrl.split(days, 7);

                    if (scope.showWeeks) {
                        scope.weekNumbers = [];
                        var weekNumber = getISO8601WeekNumber(scope.rows[0][0].date),
                            numWeeks = scope.rows.length;
                        while (scope.weekNumbers.push(weekNumber++) < numWeeks) {
                        }
                    }
                };

                ctrl.compare = function (date1, date2) {
                    return (new Date(date1.getFullYear(), date1.getMonth(), date1.getDate()) - new Date(date2.getFullYear(), date2.getMonth(), date2.getDate()) );
                };

                function getISO8601WeekNumber(date) {
                    var checkDate = new Date(date);
                    checkDate.setDate(checkDate.getDate() + 4 - (checkDate.getDay() || 7)); // Thursday
                    var time = checkDate.getTime();
                    checkDate.setMonth(0); // Compare with Jan 1
                    checkDate.setDate(1);
                    return Math.floor(Math.round((time - checkDate) / 86400000) / 7) + 1;
                }

                ctrl.handleKeyDown = function (key, evt) {
                    var date = ctrl.activeDate.getDate();

                    if (key === 'left') {
                        date = date - 1;   // up
                    } else if (key === 'up') {
                        date = date - 7;   // down
                    } else if (key === 'right') {
                        date = date + 1;   // down
                    } else if (key === 'down') {
                        date = date + 7;
                    } else if (key === 'pageup' || key === 'pagedown') {
                        var month = ctrl.activeDate.getMonth() + (key === 'pageup' ? -1 : 1);
                        ctrl.activeDate.setMonth(month, 1);
                        date = Math.min(getDaysInMonth(ctrl.activeDate.getFullYear(), ctrl.activeDate.getMonth()), date);
                    } else if (key === 'home') {
                        date = 1;
                    } else if (key === 'end') {
                        date = getDaysInMonth(ctrl.activeDate.getFullYear(), ctrl.activeDate.getMonth());
                    }
                    ctrl.activeDate.setDate(date);
                };

                ctrl.refreshView();
            }
        };
    }])

    .directive('monthpicker', ['dateFilter', function (dateFilter) {
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/datepicker/month.html',
            require: '^datepicker',
            link: function (scope, element, attrs, ctrl) {
                ctrl.step = { years: 1 };
                ctrl.element = element;

                ctrl._refreshView = function () {
                    var months = new Array(12),
                        year = ctrl.activeDate.getFullYear();

                    for (var i = 0; i < 12; i++) {
                        months[i] = angular.extend(ctrl.createDateObject(new Date(year, i, 1), ctrl.formatMonth), {
                            uid: scope.uniqueId + '-' + i
                        });
                    }

                    scope.title = dateFilter(ctrl.activeDate, ctrl.formatMonthTitle);
                    scope.rows = ctrl.split(months, 3);
                };

                ctrl.compare = function (date1, date2) {
                    return new Date(date1.getFullYear(), date1.getMonth()) - new Date(date2.getFullYear(), date2.getMonth());
                };

                ctrl.handleKeyDown = function (key, evt) {
                    var date = ctrl.activeDate.getMonth();

                    if (key === 'left') {
                        date = date - 1;   // up
                    } else if (key === 'up') {
                        date = date - 3;   // down
                    } else if (key === 'right') {
                        date = date + 1;   // down
                    } else if (key === 'down') {
                        date = date + 3;
                    } else if (key === 'pageup' || key === 'pagedown') {
                        var year = ctrl.activeDate.getFullYear() + (key === 'pageup' ? -1 : 1);
                        ctrl.activeDate.setFullYear(year);
                    } else if (key === 'home') {
                        date = 0;
                    } else if (key === 'end') {
                        date = 11;
                    }
                    ctrl.activeDate.setMonth(date);
                };

                ctrl.refreshView();
            }
        };
    }])

    .directive('yearpicker', ['dateFilter', function (dateFilter) {
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/datepicker/year.html',
            require: '^datepicker',
            link: function (scope, element, attrs, ctrl) {
                var range = ctrl.yearRange;

                ctrl.step = { years: range };
                ctrl.element = element;

                function getStartingYear(year) {
                    return parseInt((year - 1) / range, 10) * range + 1;
                }

                ctrl._refreshView = function () {
                    var years = new Array(range);

                    for (var i = 0, start = getStartingYear(ctrl.activeDate.getFullYear()); i < range; i++) {
                        years[i] = angular.extend(ctrl.createDateObject(new Date(start + i, 0, 1), ctrl.formatYear), {
                            uid: scope.uniqueId + '-' + i
                        });
                    }

                    scope.title = [years[0].label, years[range - 1].label].join(' - ');
                    scope.rows = ctrl.split(years, 5);
                };

                ctrl.compare = function (date1, date2) {
                    return date1.getFullYear() - date2.getFullYear();
                };

                ctrl.handleKeyDown = function (key, evt) {
                    var date = ctrl.activeDate.getFullYear();

                    if (key === 'left') {
                        date = date - 1;   // up
                    } else if (key === 'up') {
                        date = date - 5;   // down
                    } else if (key === 'right') {
                        date = date + 1;   // down
                    } else if (key === 'down') {
                        date = date + 5;
                    } else if (key === 'pageup' || key === 'pagedown') {
                        date += (key === 'pageup' ? -1 : 1) * ctrl.step.years;
                    } else if (key === 'home') {
                        date = getStartingYear(ctrl.activeDate.getFullYear());
                    } else if (key === 'end') {
                        date = getStartingYear(ctrl.activeDate.getFullYear()) + range - 1;
                    }
                    ctrl.activeDate.setFullYear(date);
                };

                ctrl.refreshView();
            }
        };
    }])

    .constant('datepickerPopupConfig', {
        datepickerPopup: 'yyyy-MM-dd',
        currentText: 'Today',
        clearText: 'Clear',
        closeText: 'Done',
        closeOnDateSelection: true,
        appendToBody: false,
        showButtonBar: true
    })

    .directive('datepickerPopup', ['$compile', '$parse', '$document', '$position', 'dateFilter', 'dateParser', 'datepickerPopupConfig',
        function ($compile, $parse, $document, $position, dateFilter, dateParser, datepickerPopupConfig) {
            return {
                restrict: 'EA',
                require: 'ngModel',
                scope: {
                    isOpen: '=?',
                    currentText: '@',
                    clearText: '@',
                    closeText: '@',
                    dateDisabled: '&'
                },
                link: function (scope, element, attrs, ngModel) {
                    var dateFormat,
                        closeOnDateSelection = angular.isDefined(attrs.closeOnDateSelection) ? scope.$parent.$eval(attrs.closeOnDateSelection) : datepickerPopupConfig.closeOnDateSelection,
                        appendToBody = angular.isDefined(attrs.datepickerAppendToBody) ? scope.$parent.$eval(attrs.datepickerAppendToBody) : datepickerPopupConfig.appendToBody;

                    scope.showButtonBar = angular.isDefined(attrs.showButtonBar) ? scope.$parent.$eval(attrs.showButtonBar) : datepickerPopupConfig.showButtonBar;

                    scope.getText = function (key) {
                        return scope[key + 'Text'] || datepickerPopupConfig[key + 'Text'];
                    };

                    attrs.$observe('datepickerPopup', function (value) {
                        dateFormat = value || datepickerPopupConfig.datepickerPopup;
                        ngModel.$render();
                    });

                    // popup element used to display calendar
                    var popupEl = angular.element('<div datepicker-popup-wrap><div datepicker></div></div>');
                    popupEl.attr({
                        'ng-model': 'date',
                        'ng-change': 'dateSelection()'
                    });

                    function cameltoDash(string) {
                        return string.replace(/([A-Z])/g, function ($1) {
                            return '-' + $1.toLowerCase();
                        });
                    }

                    // datepicker element
                    var datepickerEl = angular.element(popupEl.children()[0]);
                    if (attrs.datepickerOptions) {
                        angular.forEach(scope.$parent.$eval(attrs.datepickerOptions), function (value, option) {
                            datepickerEl.attr(cameltoDash(option), value);
                        });
                    }

                    angular.forEach(['minDate', 'maxDate'], function (key) {
                        if (attrs[key]) {
                            scope.$parent.$watch($parse(attrs[key]), function (value) {
                                scope[key] = value;
                            });
                            datepickerEl.attr(cameltoDash(key), key);
                        }
                    });
                    if (attrs.dateDisabled) {
                        datepickerEl.attr('date-disabled', 'dateDisabled({ date: date, mode: mode })');
                    }

                    function parseDate(viewValue) {
                        if (!viewValue) {
                            ngModel.$setValidity('date', true);
                            return null;
                        } else if (angular.isDate(viewValue) && !isNaN(viewValue)) {
                            ngModel.$setValidity('date', true);
                            return viewValue;
                        } else if (angular.isString(viewValue)) {
                            var date = dateParser.parse(viewValue, dateFormat) || new Date(viewValue);
                            if (isNaN(date)) {
                                ngModel.$setValidity('date', false);
                                return undefined;
                            } else {
                                ngModel.$setValidity('date', true);
                                return date;
                            }
                        } else {
                            ngModel.$setValidity('date', false);
                            return undefined;
                        }
                    }

                    ngModel.$parsers.unshift(parseDate);

                    // Inner change
                    scope.dateSelection = function (dt) {
                        if (angular.isDefined(dt)) {
                            scope.date = dt;
                        }
                        ngModel.$setViewValue(scope.date);
                        ngModel.$render();

                        if (closeOnDateSelection) {
                            scope.isOpen = false;
                            element[0].focus();
                        }
                    };

                    element.bind('input change keyup', function () {
                        scope.$apply(function () {
                            scope.date = ngModel.$modelValue;
                        });
                    });

                    // Outter change
                    ngModel.$render = function () {
                        var date = ngModel.$viewValue ? dateFilter(ngModel.$viewValue, dateFormat) : '';
                        element.val(date);
                        scope.date = parseDate(ngModel.$modelValue);
                    };

                    var documentClickBind = function (event) {
                        if (scope.isOpen && event.target !== element[0]) {
                            scope.$apply(function () {
                                scope.isOpen = false;
                            });
                        }
                    };

                    var keydown = function (evt, noApply) {
                        scope.keydown(evt);
                    };
                    element.bind('keydown', keydown);

                    scope.keydown = function (evt) {
                        if (evt.which === 27) {
                            evt.preventDefault();
                            evt.stopPropagation();
                            scope.close();
                        } else if (evt.which === 40 && !scope.isOpen) {
                            scope.isOpen = true;
                        }
                    };

                    scope.$watch('isOpen', function (value) {
                        if (value) {
                            scope.$broadcast('datepicker.focus');
                            scope.position = appendToBody ? $position.offset(element) : $position.position(element);
                            scope.position.top = scope.position.top + element.prop('offsetHeight');

                            $document.bind('click', documentClickBind);
                        } else {
                            $document.unbind('click', documentClickBind);
                        }
                    });

                    scope.select = function (date) {
                        if (date === 'today') {
                            var today = new Date();
                            if (angular.isDate(ngModel.$modelValue)) {
                                date = new Date(ngModel.$modelValue);
                                date.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
                            } else {
                                date = new Date(today.setHours(0, 0, 0, 0));
                            }
                        }
                        scope.dateSelection(date);
                    };

                    scope.close = function () {
                        scope.isOpen = false;
                        element[0].focus();
                    };

                    var $popup = $compile(popupEl)(scope);
                    if (appendToBody) {
                        $document.find('body').append($popup);
                    } else {
                        element.after($popup);
                    }

                    scope.$on('$destroy', function () {
                        $popup.remove();
                        element.unbind('keydown', keydown);
                        $document.unbind('click', documentClickBind);
                    });
                }
            };
        }])

    .directive('datepickerPopupWrap', function () {
        return {
            restrict: 'EA',
            replace: true,
            transclude: true,
            templateUrl: 'template/datepicker/popup.html',
            link: function (scope, element, attrs) {
                element.bind('click', function (event) {
                    event.preventDefault();
                    event.stopPropagation();
                });
            }
        };
    });

angular.module('ui.bootstrap.modal', [])

/**
 * A helper, internal data structure that acts as a map but also allows getting / removing
 * elements in the LIFO order
 */
    .factory('$$stackedMap', function () {
        return {
            createNew: function () {
                var stack = [];

                return {
                    add: function (key, value) {
                        stack.push({
                            key: key,
                            value: value
                        });
                    },
                    get: function (key) {
                        for (var i = 0; i < stack.length; i++) {
                            if (key == stack[i].key) {
                                return stack[i];
                            }
                        }
                    },
                    keys: function () {
                        var keys = [];
                        for (var i = 0; i < stack.length; i++) {
                            keys.push(stack[i].key);
                        }
                        return keys;
                    },
                    top: function () {
                        return stack[stack.length - 1];
                    },
                    remove: function (key) {
                        var idx = -1;
                        for (var i = 0; i < stack.length; i++) {
                            if (key == stack[i].key) {
                                idx = i;
                                break;
                            }
                        }
                        return stack.splice(idx, 1)[0];
                    },
                    removeTop: function () {
                        return stack.splice(stack.length - 1, 1)[0];
                    },
                    length: function () {
                        return stack.length;
                    }
                };
            }
        };
    })

/**
 * A helper directive for the $modal service. It creates a backdrop element.
 */
    .directive('modalBackdrop', ['$modalStack', '$timeout', function ($modalStack, $timeout) {
        return {
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/modal/backdrop.html',
            link: function (scope, element, attrs) {

                //trigger CSS transitions
                $timeout(function () {
                    scope.animate = true;
                });

                scope.close = function (evt) {
                    var modal = $modalStack.getTop();
                    if (modal && modal.value.backdrop && modal.value.backdrop != 'static') {
                        evt.preventDefault();
                        evt.stopPropagation();
                        $modalStack.dismiss(modal.key, 'backdrop click');
                    }
                };
            }
        };
    }])

    .directive('modalWindow', ['$timeout', function ($timeout) {
        return {
            restrict: 'EA',
            scope: {
                index: '@'
            },
            replace: true,
            transclude: true,
            templateUrl: 'template/modal/window.html',
            link: function (scope, element, attrs) {
                scope.windowClass = attrs.windowClass || '';

                //trigger CSS transitions
                $timeout(function () {
                    scope.animate = true;
                });
            }
        };
    }])

    .factory('$modalStack', ['$document', '$compile', '$rootScope', '$$stackedMap',
        function ($document, $compile, $rootScope, $$stackedMap) {

            var backdropjqLiteEl, backdropDomEl;
            var backdropScope = $rootScope.$new(true);
            var body = $document.find('body').eq(0);
            var openedWindows = $$stackedMap.createNew();
            var $modalStack = {};

            function backdropIndex() {
                var topBackdropIndex = -1;
                var opened = openedWindows.keys();
                for (var i = 0; i < opened.length; i++) {
                    if (openedWindows.get(opened[i]).value.backdrop) {
                        topBackdropIndex = i;
                    }
                }
                return topBackdropIndex;
            }

            $rootScope.$watch(backdropIndex, function (newBackdropIndex) {
                backdropScope.index = newBackdropIndex;
            });

            function removeModalWindow(modalInstance) {

                var modalWindow = openedWindows.get(modalInstance).value;

                //clean up the stack
                openedWindows.remove(modalInstance);

                //remove window DOM element
                modalWindow.modalDomEl.remove();

                //remove backdrop if no longer needed
                if (backdropDomEl && backdropIndex() == -1) {
                    backdropDomEl.remove();
                    backdropDomEl = undefined;
                }

                //destroy scope
                modalWindow.modalScope.$destroy();
            }

            $document.bind('keydown', function (evt) {
                var modal;

                if (evt.which === 27) {
                    modal = openedWindows.top();
                    if (modal && modal.value.keyboard) {
                        $rootScope.$apply(function () {
                            $modalStack.dismiss(modal.key);
                        });
                    }
                }
            });

            $modalStack.open = function (modalInstance, modal) {

                openedWindows.add(modalInstance, {
                    deferred: modal.deferred,
                    modalScope: modal.scope,
                    backdrop: modal.backdrop,
                    keyboard: modal.keyboard
                });

                if (backdropIndex() >= 0 && !backdropDomEl) {
                    backdropjqLiteEl = angular.element('<div modal-backdrop></div>');
                    backdropDomEl = $compile(backdropjqLiteEl)(backdropScope);
                    body.append(backdropDomEl);
                }

                var angularDomEl = angular.element('<div modal-window></div>');
                angularDomEl.attr('window-class', modal.windowClass);
                angularDomEl.attr('index', openedWindows.length() - 1);
                angularDomEl.html(modal.content);

                var modalDomEl = $compile(angularDomEl)(modal.scope);
                openedWindows.top().value.modalDomEl = modalDomEl;
                body.append(modalDomEl);

            };

            $modalStack.close = function (modalInstance, result) {
                var modal = openedWindows.get(modalInstance);
                if (modal) {
                    modal.value.deferred.resolve(result);
                    removeModalWindow(modalInstance);
                }
            };

            $modalStack.dismiss = function (modalInstance, reason) {
                var modalWindow = openedWindows.get(modalInstance).value;
                if (modalWindow) {
                    modalWindow.deferred.reject(reason);
                    removeModalWindow(modalInstance);
                }
            };

            $modalStack.getTop = function () {
                return openedWindows.top();
            };

            return $modalStack;
        }])

    .provider('$modal', function () {

        var $modalProvider = {
            options: {
                backdrop: true, //can be also false or 'static'
                keyboard: true
            },
            $get: ['$injector', '$rootScope', '$q', '$http', '$templateCache', '$controller', '$modalStack',
                function ($injector, $rootScope, $q, $http, $templateCache, $controller, $modalStack) {

                    var $modal = {};

                    function getTemplatePromise(options) {
                        return options.template ? $q.when(options.template) :
                            $http.get(options.templateUrl, {cache: $templateCache}).then(function (result) {
                                return result.data;
                            });
                    }

                    function getResolvePromises(resolves) {
                        var promisesArr = [];
                        angular.forEach(resolves, function (value, key) {
                            if (angular.isFunction(value) || angular.isArray(value)) {
                                promisesArr.push($q.when($injector.invoke(value)));
                            }
                        });
                        return promisesArr;
                    }

                    $modal.open = function (modalOptions) {

                        var modalResultDeferred = $q.defer();
                        var modalOpenedDeferred = $q.defer();

                        //prepare an instance of a modal to be injected into controllers and returned to a caller
                        var modalInstance = {
                            result: modalResultDeferred.promise,
                            opened: modalOpenedDeferred.promise,
                            close: function (result) {
                                $modalStack.close(modalInstance, result);
                            },
                            dismiss: function (reason) {
                                $modalStack.dismiss(modalInstance, reason);
                            }
                        };

                        //merge and clean up options
                        modalOptions = angular.extend({}, $modalProvider.options, modalOptions);
                        modalOptions.resolve = modalOptions.resolve || {};

                        //verify options
                        if (!modalOptions.template && !modalOptions.templateUrl) {
                            throw new Error('One of template or templateUrl options is required.');
                        }

                        var templateAndResolvePromise =
                            $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)));


                        templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {

                            var modalScope = (modalOptions.scope || $rootScope).$new();
                            modalScope.$close = modalInstance.close;
                            modalScope.$dismiss = modalInstance.dismiss;

                            var ctrlInstance, ctrlLocals = {};
                            var resolveIter = 1;

                            //controllers
                            if (modalOptions.controller) {
                                ctrlLocals.$scope = modalScope;
                                ctrlLocals.$modalInstance = modalInstance;
                                angular.forEach(modalOptions.resolve, function (value, key) {
                                    ctrlLocals[key] = tplAndVars[resolveIter++];
                                });

                                ctrlInstance = $controller(modalOptions.controller, ctrlLocals);
                            }

                            $modalStack.open(modalInstance, {
                                scope: modalScope,
                                deferred: modalResultDeferred,
                                content: tplAndVars[0],
                                backdrop: modalOptions.backdrop,
                                keyboard: modalOptions.keyboard,
                                windowClass: modalOptions.windowClass
                            });

                        }, function resolveError(reason) {
                            modalResultDeferred.reject(reason);
                        });

                        templateAndResolvePromise.then(function () {
                            modalOpenedDeferred.resolve(true);
                        }, function () {
                            modalOpenedDeferred.reject(false);
                        });

                        return modalInstance;
                    };

                    return $modal;
                }]
        };

        return $modalProvider;
    });
/**
 * @ngdoc overview
 * @name ui.bootstrap.tabs
 *
 * @description
 * AngularJS version of the tabs directive.
 */

angular.module('ui.bootstrap.tabs', [])

    .controller('TabsetController', ['$scope', function TabsetCtrl($scope) {
        var ctrl = this,
            tabs = ctrl.tabs = $scope.tabs = [];

        ctrl.select = function (selectedTab) {
            angular.forEach(tabs, function (tab) {
                if (tab.active && tab !== selectedTab) {
                    tab.active = false;
                    tab.onDeselect();
                }
            });
            selectedTab.active = true;
            selectedTab.onSelect();
        };

        ctrl.addTab = function addTab(tab) {
            tabs.push(tab);
            // we can't run the select function on the first tab
            // since that would select it twice
            if (tabs.length === 1) {
                tab.active = true;
            } else if (tab.active) {
                ctrl.select(tab);
            }
        };

        ctrl.removeTab = function removeTab(tab) {
            var index = tabs.indexOf(tab);
            //Select a new tab if the tab to be removed is selected
            if (tab.active && tabs.length > 1) {
                //If this is the last tab, select the previous tab. else, the next tab.
                var newActiveIndex = index == tabs.length - 1 ? index - 1 : index + 1;
                ctrl.select(tabs[newActiveIndex]);
            }
            tabs.splice(index, 1);
        };
    }])

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabset
 * @restrict EA
 *
 * @description
 * Tabset is the outer container for the tabs directive
 *
 * @param {boolean=} vertical Whether or not to use vertical styling for the tabs.
 * @param {boolean=} justified Whether or not to use justified styling for the tabs.
 *
 * @example
 <example module="ui.bootstrap">
 <file name="index.html">
 <tabset>
 <tab heading="Tab 1"><b>First</b> Content!</tab>
 <tab heading="Tab 2"><i>Second</i> Content!</tab>
 </tabset>
 <hr />
 <tabset vertical="true">
 <tab heading="Vertical Tab 1"><b>First</b> Vertical Content!</tab>
 <tab heading="Vertical Tab 2"><i>Second</i> Vertical Content!</tab>
 </tabset>
 <tabset justified="true">
 <tab heading="Justified Tab 1"><b>First</b> Justified Content!</tab>
 <tab heading="Justified Tab 2"><i>Second</i> Justified Content!</tab>
 </tabset>
 </file>
 </example>
 */
    .directive('tabset', function () {
        return {
            restrict: 'EA',
            transclude: true,
            replace: true,
            scope: {
                type: '@'
            },
            controller: 'TabsetController',
            templateUrl: 'template/tabs/tabset.html',
            link: function (scope, element, attrs) {
                scope.vertical = angular.isDefined(attrs.vertical) ? scope.$parent.$eval(attrs.vertical) : false;
                scope.justified = angular.isDefined(attrs.justified) ? scope.$parent.$eval(attrs.justified) : false;
            }
        };
    })

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tab
 * @restrict EA
 *
 * @param {string=} heading The visible heading, or title, of the tab. Set HTML headings with {@link ui.bootstrap.tabs.directive:tabHeading tabHeading}.
 * @param {string=} select An expression to evaluate when the tab is selected.
 * @param {boolean=} active A binding, telling whether or not this tab is selected.
 * @param {boolean=} disabled A binding, telling whether or not this tab is disabled.
 *
 * @description
 * Creates a tab with a heading and content. Must be placed within a {@link ui.bootstrap.tabs.directive:tabset tabset}.
 *
 * @example
 <example module="ui.bootstrap">
 <file name="index.html">
 <div ng-controller="TabsDemoCtrl">
 <button class="btn btn-small" ng-click="items[0].active = true">
 Select item 1, using active binding
 </button>
 <button class="btn btn-small" ng-click="items[1].disabled = !items[1].disabled">
 Enable/disable item 2, using disabled binding
 </button>
 <br />
 <tabset>
 <tab heading="Tab 1">First Tab</tab>
 <tab select="alertMe()">
 <tab-heading><i class="icon-bell"></i> Alert me!</tab-heading>
 Second Tab, with alert callback and html heading!
 </tab>
 <tab ng-repeat="item in items"
 heading="{{item.title}}"
 disabled="item.disabled"
 active="item.active">
 {{item.content}}
 </tab>
 </tabset>
 </div>
 </file>
 <file name="script.js">
 function TabsDemoCtrl($scope) {
      $scope.items = [
        { title:"Dynamic Title 1", content:"Dynamic Item 0" },
        { title:"Dynamic Title 2", content:"Dynamic Item 1", disabled: true }
      ];

      $scope.alertMe = function() {
        setTimeout(function() {
          alert("You've selected the alert tab!");
        });
      };
    };
 </file>
 </example>
 */

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabHeading
 * @restrict EA
 *
 * @description
 * Creates an HTML heading for a {@link ui.bootstrap.tabs.directive:tab tab}. Must be placed as a child of a tab element.
 *
 * @example
 <example module="ui.bootstrap">
 <file name="index.html">
 <tabset>
 <tab>
 <tab-heading><b>HTML</b> in my titles?!</tab-heading>
 And some content, too!
 </tab>
 <tab>
 <tab-heading><i class="icon-heart"></i> Icon heading?!?</tab-heading>
 That's right.
 </tab>
 </tabset>
 </file>
 </example>
 */
    .directive('tab', ['$parse', function ($parse) {
        return {
            require: '^tabset',
            restrict: 'EA',
            replace: true,
            templateUrl: 'template/tabs/tab.html',
            transclude: true,
            scope: {
                active: '=?',
                heading: '@',
                onSelect: '&select', //This callback is called in contentHeadingTransclude
                //once it inserts the tab's content into the dom
                onDeselect: '&deselect'
            },
            controller: function () {
                //Empty controller so other directives can require being 'under' a tab
            },
            compile: function (elm, attrs, transclude) {
                return function postLink(scope, elm, attrs, tabsetCtrl) {
                    scope.$watch('active', function (active) {
                        if (active) {
                            tabsetCtrl.select(scope);
                        }
                    });

                    scope.disabled = false;
                    if (attrs.disabled) {
                        scope.$parent.$watch($parse(attrs.disabled), function (value) {
                            scope.disabled = !!value;
                        });
                    }

                    scope.select = function () {
                        if (!scope.disabled) {
                            scope.active = true;
                        }
                    };

                    tabsetCtrl.addTab(scope);
                    scope.$on('$destroy', function () {
                        tabsetCtrl.removeTab(scope);
                    });

                    //We need to transclude later, once the content container is ready.
                    //when this link happens, we're inside a tab heading.
                    scope.$transcludeFn = transclude;
                };
            }
        };
    }])

    .directive('tabHeadingTransclude', [function () {
        return {
            restrict: 'A',
            require: '^tab',
            link: function (scope, elm, attrs, tabCtrl) {
                scope.$watch('headingElement', function updateHeadingElement(heading) {
                    if (heading) {
                        elm.html('');
                        elm.append(heading);
                    }
                });
            }
        };
    }])

    .directive('tabContentTransclude', function () {
        return {
            restrict: 'A',
            require: '^tabset',
            link: function (scope, elm, attrs) {
                var tab = scope.$eval(attrs.tabContentTransclude);

                //Now our tab is ready to be transcluded: both the tab heading area
                //and the tab content area are loaded.  Transclude 'em both.
                tab.$transcludeFn(tab.$parent, function (contents) {
                    angular.forEach(contents, function (node) {
                        if (isTabHeading(node)) {
                            //Let tabHeadingTransclude know.
                            tab.headingElement = node;
                        } else {
                            elm.append(node);
                        }
                    });
                });
            }
        };
        function isTabHeading(node) {
            return node.tagName && (
                node.hasAttribute('tab-heading') ||
                node.hasAttribute('data-tab-heading') ||
                node.tagName.toLowerCase() === 'tab-heading' ||
                node.tagName.toLowerCase() === 'data-tab-heading'
                );
        }
    })

;

angular.module('ui.bootstrap.timepicker', [])

    .constant('timepickerConfig', {
        hourStep: 1,
        minuteStep: 1,
        showMeridian: true,
        meridians: ['AM', 'PM'],
        readonlyInput: false,
        mousewheel: true
    })

    .directive('timepicker', ['$parse', '$log', 'timepickerConfig', function ($parse, $log, timepickerConfig) {
        return {
            restrict: 'EA',
            require: '?^ngModel',
            replace: true,
            scope: {},
            templateUrl: 'template/timepicker/timepicker.html',
            link: function (scope, element, attrs, ngModel) {
                if (!ngModel) {
                    return; // do nothing if no ng-model
                }

                var selected = new Date(), meridians = timepickerConfig.meridians;

                var hourStep = timepickerConfig.hourStep;
                if (attrs.hourStep) {
                    scope.$parent.$watch($parse(attrs.hourStep), function (value) {
                        hourStep = parseInt(value, 10);
                    });
                }

                var minuteStep = timepickerConfig.minuteStep;
                if (attrs.minuteStep) {
                    scope.$parent.$watch($parse(attrs.minuteStep), function (value) {
                        minuteStep = parseInt(value, 10);
                    });
                }

                // 12H / 24H mode
                scope.showMeridian = timepickerConfig.showMeridian;
                if (attrs.showMeridian) {
                    scope.$parent.$watch($parse(attrs.showMeridian), function (value) {
                        scope.showMeridian = !!value;

                        if (ngModel.$error.time) {
                            // Evaluate from template
                            var hours = getHoursFromTemplate(), minutes = getMinutesFromTemplate();
                            if (angular.isDefined(hours) && angular.isDefined(minutes)) {
                                selected.setHours(hours);
                                refresh();
                            }
                        } else {
                            updateTemplate();
                        }
                    });
                }

                // Get scope.hours in 24H mode if valid
                function getHoursFromTemplate() {
                    var hours = parseInt(scope.hours, 10);
                    var valid = ( scope.showMeridian ) ? (hours > 0 && hours < 13) : (hours >= 0 && hours < 24);
                    if (!valid) {
                        return undefined;
                    }

                    if (scope.showMeridian) {
                        if (hours === 12) {
                            hours = 0;
                        }
                        if (scope.meridian === meridians[1]) {
                            hours = hours + 12;
                        }
                    }
                    return hours;
                }

                function getMinutesFromTemplate() {
                    var minutes = parseInt(scope.minutes, 10);
                    return ( minutes >= 0 && minutes < 60 ) ? minutes : undefined;
                }

                function pad(value) {
                    return ( angular.isDefined(value) && value.toString().length < 2 ) ? '0' + value : value;
                }

                // Input elements
                var inputs = element.find('input'), hoursInputEl = inputs.eq(0), minutesInputEl = inputs.eq(1);

                // Respond on mousewheel spin
                var mousewheel = (angular.isDefined(attrs.mousewheel)) ? scope.$eval(attrs.mousewheel) : timepickerConfig.mousewheel;
                if (mousewheel) {

                    var isScrollingUp = function (e) {
                        if (e.originalEvent) {
                            e = e.originalEvent;
                        }
                        //pick correct delta variable depending on event
                        var delta = (e.wheelDelta) ? e.wheelDelta : -e.deltaY;
                        return (e.detail || delta > 0);
                    };

                    hoursInputEl.bind('mousewheel wheel', function (e) {
                        scope.$apply((isScrollingUp(e)) ? scope.incrementHours() : scope.decrementHours());
                        e.preventDefault();
                    });

                    minutesInputEl.bind('mousewheel wheel', function (e) {
                        scope.$apply((isScrollingUp(e)) ? scope.incrementMinutes() : scope.decrementMinutes());
                        e.preventDefault();
                    });
                }

                scope.readonlyInput = (angular.isDefined(attrs.readonlyInput)) ? scope.$eval(attrs.readonlyInput) : timepickerConfig.readonlyInput;
                if (!scope.readonlyInput) {

                    var invalidate = function (invalidHours, invalidMinutes) {
                        ngModel.$setViewValue(null);
                        ngModel.$setValidity('time', false);
                        if (angular.isDefined(invalidHours)) {
                            scope.invalidHours = invalidHours;
                        }
                        if (angular.isDefined(invalidMinutes)) {
                            scope.invalidMinutes = invalidMinutes;
                        }
                    };

                    scope.updateHours = function () {
                        var hours = getHoursFromTemplate();

                        if (angular.isDefined(hours)) {
                            selected.setHours(hours);
                            refresh('h');
                        } else {
                            invalidate(true);
                        }
                    };

                    hoursInputEl.bind('blur', function (e) {
                        if (!scope.validHours && scope.hours < 10) {
                            scope.$apply(function () {
                                scope.hours = pad(scope.hours);
                            });
                        }
                    });

                    scope.updateMinutes = function () {
                        var minutes = getMinutesFromTemplate();

                        if (angular.isDefined(minutes)) {
                            selected.setMinutes(minutes);
                            refresh('m');
                        } else {
                            invalidate(undefined, true);
                        }
                    };

                    minutesInputEl.bind('blur', function (e) {
                        if (!scope.invalidMinutes && scope.minutes < 10) {
                            scope.$apply(function () {
                                scope.minutes = pad(scope.minutes);
                            });
                        }
                    });
                } else {
                    scope.updateHours = angular.noop;
                    scope.updateMinutes = angular.noop;
                }

                ngModel.$render = function () {
                    var date = ngModel.$modelValue ? new Date(ngModel.$modelValue) : null;

                    if (isNaN(date)) {
                        ngModel.$setValidity('time', false);
                        $log.error('Timepicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
                    } else {
                        if (date) {
                            selected = date;
                        }
                        makeValid();
                        updateTemplate();
                    }
                };

                // Call internally when we know that model is valid.
                function refresh(keyboardChange) {
                    makeValid();
                    ngModel.$setViewValue(new Date(selected));
                    updateTemplate(keyboardChange);
                }

                function makeValid() {
                    ngModel.$setValidity('time', true);
                    scope.invalidHours = false;
                    scope.invalidMinutes = false;
                }

                function updateTemplate(keyboardChange) {
                    var hours = selected.getHours(), minutes = selected.getMinutes();

                    if (scope.showMeridian) {
                        hours = ( hours === 0 || hours === 12 ) ? 12 : hours % 12; // Convert 24 to 12 hour system
                    }
                    scope.hours = keyboardChange === 'h' ? hours : pad(hours);
                    scope.minutes = keyboardChange === 'm' ? minutes : pad(minutes);
                    scope.meridian = selected.getHours() < 12 ? meridians[0] : meridians[1];
                }

                function addMinutes(minutes) {
                    var dt = new Date(selected.getTime() + minutes * 60000);
                    selected.setHours(dt.getHours(), dt.getMinutes());
                    refresh();
                }

                scope.incrementHours = function () {
                    addMinutes(hourStep * 60);
                };
                scope.decrementHours = function () {
                    addMinutes(-hourStep * 60);
                };
                scope.incrementMinutes = function () {
                    addMinutes(minuteStep);
                };
                scope.decrementMinutes = function () {
                    addMinutes(-minuteStep);
                };
                scope.toggleMeridian = function () {
                    addMinutes(12 * 60 * (( selected.getHours() < 12 ) ? 1 : -1));
                };
            }
        };
    }]);


angular.module('ui.bootstrap.typeahead', ['ui.bootstrap.position', 'ui.bootstrap.bindHtml'])

/**
 * A helper service that can parse typeahead's syntax (string provided by users)
 * Extracted to a separate service for ease of unit testing
 */
    .factory('typeaheadParser', ['$parse', function ($parse) {

        //                      00000111000000000000022200000000000000003333333333333330000000000044000
        var TYPEAHEAD_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+(.*)$/;

        return {
            parse: function (input) {

                var match = input.match(TYPEAHEAD_REGEXP), modelMapper, viewMapper, source;
                if (!match) {
                    throw new Error(
                            "Expected typeahead specification in form of '_modelValue_ (as _label_)? for _item_ in _collection_'" +
                            " but got '" + input + "'.");
                }

                return {
                    itemName: match[3],
                    source: $parse(match[4]),
                    viewMapper: $parse(match[2] || match[1]),
                    modelMapper: $parse(match[1])
                };
            }
        };
    }])

    .directive('typeahead', ['$compile', '$parse', '$q', '$timeout', '$document', '$position', 'typeaheadParser',
        function ($compile, $parse, $q, $timeout, $document, $position, typeaheadParser) {

            var HOT_KEYS = [9, 13, 27, 38, 40];

            return {
                require: 'ngModel',
                link: function (originalScope, element, attrs, modelCtrl) {

                    //SUPPORTED ATTRIBUTES (OPTIONS)

                    //minimal no of characters that needs to be entered before typeahead kicks-in
                    var minSearch = originalScope.$eval(attrs.typeaheadMinLength) || 1;

                    //minimal wait time after last character typed before typehead kicks-in
                    var waitTime = originalScope.$eval(attrs.typeaheadWaitMs) || 0;

                    //should it restrict model values to the ones selected from the popup only?
                    var isEditable = originalScope.$eval(attrs.typeaheadEditable) !== false;

                    //binding to a variable that indicates if matches are being retrieved asynchronously
                    var isLoadingSetter = $parse(attrs.typeaheadLoading).assign || angular.noop;

                    //a callback executed when a match is selected
                    var onSelectCallback = $parse(attrs.typeaheadOnSelect);

                    var inputFormatter = attrs.typeaheadInputFormatter ? $parse(attrs.typeaheadInputFormatter) : undefined;

                    //INTERNAL VARIABLES

                    //model setter executed upon match selection
                    var $setModelValue = $parse(attrs.ngModel).assign;

                    //expressions used by typeahead
                    var parserResult = typeaheadParser.parse(attrs.typeahead);

                    var hasFocus;

                    //pop-up element used to display matches
                    var popUpEl = angular.element('<div typeahead-popup></div>');
                    popUpEl.attr({
                        matches: 'matches',
                        active: 'activeIdx',
                        select: 'select(activeIdx)',
                        query: 'query',
                        position: 'position'
                    });
                    //custom item template
                    if (angular.isDefined(attrs.typeaheadTemplateUrl)) {
                        popUpEl.attr('template-url', attrs.typeaheadTemplateUrl);
                    }

                    //create a child scope for the typeahead directive so we are not polluting original scope
                    //with typeahead-specific data (matches, query etc.)
                    var scope = originalScope.$new();
                    originalScope.$on('$destroy', function () {
                        scope.$destroy();
                    });

                    var resetMatches = function () {
                        scope.matches = [];
                        scope.activeIdx = -1;
                    };

                    var getMatchesAsync = function (inputValue) {

                        var locals = {$viewValue: inputValue};
                        isLoadingSetter(originalScope, true);
                        $q.when(parserResult.source(originalScope, locals)).then(function (matches) {

                            //it might happen that several async queries were in progress if a user were typing fast
                            //but we are interested only in responses that correspond to the current view value
                            if (inputValue === modelCtrl.$viewValue && hasFocus) {
                                if (matches.length > 0) {

                                    scope.activeIdx = 0;
                                    scope.matches.length = 0;

                                    //transform labels
                                    for (var i = 0; i < matches.length; i++) {
                                        locals[parserResult.itemName] = matches[i];
                                        scope.matches.push({
                                            label: parserResult.viewMapper(scope, locals),
                                            model: matches[i]
                                        });
                                    }

                                    scope.query = inputValue;
                                    //position pop-up with matches - we need to re-calculate its position each time we are opening a window
                                    //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
                                    //due to other elements being rendered
                                    scope.position = $position.position(element);
                                    scope.position.top = scope.position.top + element.prop('offsetHeight');

                                } else {
                                    resetMatches();
                                }
                                isLoadingSetter(originalScope, false);
                            }
                        }, function () {
                            resetMatches();
                            isLoadingSetter(originalScope, false);
                        });
                    };

                    resetMatches();

                    //we need to propagate user's query so we can higlight matches
                    scope.query = undefined;

                    //Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later 
                    var timeoutPromise;

                    //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
                    //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue
                    modelCtrl.$parsers.unshift(function (inputValue) {

                        hasFocus = true;

                        if (inputValue && inputValue.length >= minSearch) {
                            if (waitTime > 0) {
                                if (timeoutPromise) {
                                    $timeout.cancel(timeoutPromise);//cancel previous timeout
                                }
                                timeoutPromise = $timeout(function () {
                                    getMatchesAsync(inputValue);
                                }, waitTime);
                            } else {
                                getMatchesAsync(inputValue);
                            }
                        } else {
                            isLoadingSetter(originalScope, false);
                            resetMatches();
                        }

                        if (isEditable) {
                            return inputValue;
                        } else {
                            if (!inputValue) {
                                // Reset in case user had typed something previously.
                                modelCtrl.$setValidity('editable', true);
                                return inputValue;
                            } else {
                                modelCtrl.$setValidity('editable', false);
                                return undefined;
                            }
                        }
                    });

                    modelCtrl.$formatters.push(function (modelValue) {

                        var candidateViewValue, emptyViewValue;
                        var locals = {};

                        if (inputFormatter) {

                            locals['$model'] = modelValue;
                            return inputFormatter(originalScope, locals);

                        } else {

                            //it might happen that we don't have enough info to properly render input value
                            //we need to check for this situation and simply return model value if we can't apply custom formatting
                            locals[parserResult.itemName] = modelValue;
                            candidateViewValue = parserResult.viewMapper(originalScope, locals);
                            locals[parserResult.itemName] = undefined;
                            emptyViewValue = parserResult.viewMapper(originalScope, locals);

                            return candidateViewValue !== emptyViewValue ? candidateViewValue : modelValue;
                        }
                    });

                    scope.select = function (activeIdx) {
                        //called from within the $digest() cycle
                        var locals = {};
                        var model, item;

                        locals[parserResult.itemName] = item = scope.matches[activeIdx].model;
                        model = parserResult.modelMapper(originalScope, locals);
                        $setModelValue(originalScope, model);
                        modelCtrl.$setValidity('editable', true);

                        onSelectCallback(originalScope, {
                            $item: item,
                            $model: model,
                            $label: parserResult.viewMapper(originalScope, locals)
                        });

                        resetMatches();

                        //return focus to the input element if a mach was selected via a mouse click event
                        element[0].focus();
                    };

                    //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
                    element.bind('keydown', function (evt) {

                        //typeahead is open and an "interesting" key was pressed
                        if (scope.matches.length === 0 || HOT_KEYS.indexOf(evt.which) === -1) {
//          if (evt.which === 13) {
//            evt.preventDefault();
//          }
                            return;
                        }

                        evt.preventDefault();

                        if (evt.which === 40) {
                            scope.activeIdx = (scope.activeIdx + 1) % scope.matches.length;
                            scope.$digest();

                        } else if (evt.which === 38) {
                            scope.activeIdx = (scope.activeIdx ? scope.activeIdx : scope.matches.length) - 1;
                            scope.$digest();

                        } else if (evt.which === 13 || evt.which === 9) {
                            scope.$apply(function () {
                                scope.select(scope.activeIdx);
                            });

                        } else if (evt.which === 27) {
                            evt.stopPropagation();

                            resetMatches();
                            scope.$digest();
                        }
                    });

                    element.bind('blur', function (evt) {
                        hasFocus = false;
                    });

                    // Keep reference to click handler to unbind it.
                    var dismissClickHandler = function (evt) {
                        if (element[0] !== evt.target) {
                            resetMatches();
                            scope.$digest();
                        }
                    };

                    $document.bind('click', dismissClickHandler);

                    originalScope.$on('$destroy', function () {
                        $document.unbind('click', dismissClickHandler);
                    });

                    element.after($compile(popUpEl)(scope));
                }
            };

        }])

    .directive('typeaheadPopup', function () {
        return {
            restrict: 'EA',
            scope: {
                matches: '=',
                query: '=',
                active: '=',
                position: '=',
                select: '&'
            },
            replace: true,
            templateUrl: 'template/typeahead/typeahead-popup.html',
            link: function (scope, element, attrs) {

                scope.templateUrl = attrs.templateUrl;

                scope.isOpen = function () {
                    return scope.matches.length > 0;
                };

                scope.isActive = function (matchIdx) {
                    return scope.active == matchIdx;
                };

                scope.selectActive = function (matchIdx) {
                    scope.active = matchIdx;
                };

                scope.selectMatch = function (activeIdx) {
                    scope.select({activeIdx: activeIdx});
                };
            }
        };
    })

    .directive('typeaheadMatch', ['$http', '$templateCache', '$compile', '$parse', function ($http, $templateCache, $compile, $parse) {
        return {
            restrict: 'EA',
            scope: {
                index: '=',
                match: '=',
                query: '='
            },
            link: function (scope, element, attrs) {
                var tplUrl = $parse(attrs.templateUrl)(scope.$parent) || 'template/typeahead/typeahead-match.html';
                $http.get(tplUrl, {cache: $templateCache}).success(function (tplContent) {
                    element.replaceWith($compile(tplContent.trim())(scope));
                });
            }
        };
    }])

    .filter('typeaheadHighlight', function () {

        function escapeRegexp(queryToEscape) {
            return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
        }

        return function (matchItem, query) {
            return query ? matchItem.replace(new RegExp(escapeRegexp(query), 'gi'), '<strong>$&</strong>') : matchItem;
        };
    });

angular.module("template/datepicker/datepicker.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/datepicker/datepicker.html",
            "<div ng-switch=\"datepickerMode\" role=\"application\" ng-keydown=\"keydown($event)\">\n" +
            "  <daypicker ng-switch-when=\"day\" tabindex=\"0\"></daypicker>\n" +
            "  <monthpicker ng-switch-when=\"month\" tabindex=\"0\"></monthpicker>\n" +
            "  <yearpicker ng-switch-when=\"year\" tabindex=\"0\"></yearpicker>\n" +
            "</div>");
}]);

angular.module("template/datepicker/day.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/datepicker/day.html",
            "<table role=\"grid\" aria-labelledby=\"{{uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
            "  <thead>\n" +
            "    <tr>\n" +
            "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
            "      <th colspan=\"{{5 + showWeeks}}\"><button id=\"{{uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm\" ng-click=\"toggleMode()\" tabindex=\"-1\" style=\"width:100%;\"><strong>{{title}}</strong></button></th>\n" +
            "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
            "    </tr>\n" +
            "    <tr>\n" +
            "      <th ng-show=\"showWeeks\" class=\"text-center\"></th>\n" +
            "      <th ng-repeat=\"label in labels track by $index\" class=\"text-center\"><small aria-label=\"{{label.full}}\">{{label.abbr}}</small></th>\n" +
            "    </tr>\n" +
            "  </thead>\n" +
            "  <tbody>\n" +
            "    <tr ng-repeat=\"row in rows track by $index\">\n" +
            "      <td ng-show=\"showWeeks\" class=\"text-center h6\"><em>{{ weekNumbers[$index] }}</em></td>\n" +
            "      <td ng-repeat=\"dt in row track by dt.date\" class=\"text-center\" role=\"gridcell\" id=\"{{dt.uid}}\" aria-disabled=\"{{!!dt.disabled}}\">\n" +
            "        <button type=\"button\" style=\"width:100%;\" class=\"btn btn-default btn-sm\" ng-class=\"{'btn-info': dt.selected, active: isActive(dt)}\" ng-click=\"select(dt.date)\" ng-disabled=\"dt.disabled\" tabindex=\"-1\"><span ng-class=\"{'text-muted': dt.secondary, 'text-info': dt.current}\">{{dt.label}}</span></button>\n" +
            "      </td>\n" +
            "    </tr>\n" +
            "  </tbody>\n" +
            "</table>\n" +
            "");
}]);

angular.module("template/datepicker/month.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/datepicker/month.html",
            "<table role=\"grid\" aria-labelledby=\"{{uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
            "  <thead>\n" +
            "    <tr>\n" +
            "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
            "      <th><button id=\"{{uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm\" ng-click=\"toggleMode()\" tabindex=\"-1\" style=\"width:100%;\"><strong>{{title}}</strong></button></th>\n" +
            "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
            "    </tr>\n" +
            "  </thead>\n" +
            "  <tbody>\n" +
            "    <tr ng-repeat=\"row in rows track by $index\">\n" +
            "      <td ng-repeat=\"dt in row track by dt.date\" class=\"text-center\" role=\"gridcell\" id=\"{{dt.uid}}\" aria-disabled=\"{{!!dt.disabled}}\">\n" +
            "        <button type=\"button\" style=\"width:100%;\" class=\"btn btn-default\" ng-class=\"{'btn-info': dt.selected, active: isActive(dt)}\" ng-click=\"select(dt.date)\" ng-disabled=\"dt.disabled\" tabindex=\"-1\"><span ng-class=\"{'text-info': dt.current}\">{{dt.label}}</span></button>\n" +
            "      </td>\n" +
            "    </tr>\n" +
            "  </tbody>\n" +
            "</table>\n" +
            "");
}]);

angular.module("template/datepicker/popup.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/datepicker/popup.html",
            "<ul class=\"dropdown-menu\" ng-style=\"{display: (isOpen && 'block') || 'none', top: position.top+'px', left: position.left+'px'}\" ng-keydown=\"keydown($event)\">\n" +
            "	<li ng-transclude></li>\n" +
            "	<li ng-if=\"showButtonBar\" style=\"padding:10px 9px 2px\">\n" +
            "		<span class=\"btn-group\">\n" +
            "			<button type=\"button\" class=\"btn btn-sm btn-info\" ng-click=\"select('today')\">{{ getText('current') }}</button>\n" +
            "			<button type=\"button\" class=\"btn btn-sm btn-danger\" ng-click=\"select(null)\">{{ getText('clear') }}</button>\n" +
            "		</span>\n" +
            "		<button type=\"button\" class=\"btn btn-sm btn-success pull-right\" ng-click=\"close()\">{{ getText('close') }}</button>\n" +
            "	</li>\n" +
            "</ul>\n" +
            "");
}]);

angular.module("template/datepicker/year.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/datepicker/year.html",
            "<table role=\"grid\" aria-labelledby=\"{{uniqueId}}-title\" aria-activedescendant=\"{{activeDateId}}\">\n" +
            "  <thead>\n" +
            "    <tr>\n" +
            "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-left\" ng-click=\"move(-1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-left\"></i></button></th>\n" +
            "      <th colspan=\"3\"><button id=\"{{uniqueId}}-title\" role=\"heading\" aria-live=\"assertive\" aria-atomic=\"true\" type=\"button\" class=\"btn btn-default btn-sm\" ng-click=\"toggleMode()\" tabindex=\"-1\" style=\"width:100%;\"><strong>{{title}}</strong></button></th>\n" +
            "      <th><button type=\"button\" class=\"btn btn-default btn-sm pull-right\" ng-click=\"move(1)\" tabindex=\"-1\"><i class=\"glyphicon glyphicon-chevron-right\"></i></button></th>\n" +
            "    </tr>\n" +
            "  </thead>\n" +
            "  <tbody>\n" +
            "    <tr ng-repeat=\"row in rows track by $index\">\n" +
            "      <td ng-repeat=\"dt in row track by dt.date\" class=\"text-center\" role=\"gridcell\" id=\"{{dt.uid}}\" aria-disabled=\"{{!!dt.disabled}}\">\n" +
            "        <button type=\"button\" style=\"width:100%;\" class=\"btn btn-default\" ng-class=\"{'btn-info': dt.selected, active: isActive(dt)}\" ng-click=\"select(dt.date)\" ng-disabled=\"dt.disabled\" tabindex=\"-1\"><span ng-class=\"{'text-info': dt.current}\">{{dt.label}}</span></button>\n" +
            "      </td>\n" +
            "    </tr>\n" +
            "  </tbody>\n" +
            "</table>\n" +
            "");
}]);

angular.module("template/modal/backdrop.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/modal/backdrop.html",
        "<div class=\"modal-backdrop fade\" ng-class=\"{in: animate}\" ng-style=\"{'z-index': 1040 + index*10}\" ng-click=\"close($event)\"></div>");
}]);

angular.module("template/modal/window.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/modal/window.html",
        "<div class=\"modal fade {{ windowClass }}\" ng-class=\"{in: animate}\" ng-style=\"{'z-index': 1050 + index*10}\" ng-transclude></div>");
}]);

angular.module("template/tabs/tab.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/tabs/tab.html",
            "<li ng-class=\"{active: active, disabled: disabled}\">\n" +
            "  <a ng-click=\"select()\" tab-heading-transclude>{{heading}}</a>\n" +
            "</li>\n" +
            "");
}]);

angular.module("template/tabs/tabset.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/tabs/tabset.html",
            "<div>\n" +
            "    <ul class=\"nav nav-{{type || 'tabs'}}\" ng-class=\"{'nav-stacked': vertical, 'nav-justified': justified}\" ng-transclude></ul>\n" +
            "    <div class=\"tab-content\">\n" +
            "        <div class=\"tab-pane\" ng-repeat=\"tab in tabs\" ng-class=\"{active: tab.active}\" tab-content-transclude=\"tab\"></div>\n" +
            "    </div>\n" +
            "</div>");
}]);

angular.module("template/timepicker/timepicker.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/timepicker/timepicker.html",
            "<table class=\"form-inline\">\n" +
            "	<tr class=\"text-center\">\n" +
            "		<td><a ng-click=\"incrementHours()\" class=\"btn btn-link\"><i class=\"icon-chevron-up\"></i></a></td>\n" +
            "		<td>&nbsp;</td>\n" +
            "		<td><a ng-click=\"incrementMinutes()\" class=\"btn btn-link\"><i class=\"icon-chevron-up\"></i></a></td>\n" +
            "		<td ng-show=\"showMeridian\"></td>\n" +
            "	</tr>\n" +
            "	<tr>\n" +
            "		<td class=\"control-group\" ng-class=\"{'error': invalidHours}\"><input type=\"text\" ng-model=\"hours\" ng-change=\"updateHours()\" class=\"span1 text-center\" ng-mousewheel=\"incrementHours()\" ng-readonly=\"readonlyInput\" maxlength=\"2\"></td>\n" +
            "		<td>:</td>\n" +
            "		<td class=\"control-group\" ng-class=\"{'error': invalidMinutes}\"><input type=\"text\" ng-model=\"minutes\" ng-change=\"updateMinutes()\" class=\"span1 text-center\" ng-readonly=\"readonlyInput\" maxlength=\"2\"></td>\n" +
            "		<td ng-show=\"showMeridian\"><button type=\"button\" ng-click=\"toggleMeridian()\" class=\"btn text-center\">{{meridian}}</button></td>\n" +
            "	</tr>\n" +
            "	<tr class=\"text-center\">\n" +
            "		<td><a ng-click=\"decrementHours()\" class=\"btn btn-link\"><i class=\"icon-chevron-down\"></i></a></td>\n" +
            "		<td>&nbsp;</td>\n" +
            "		<td><a ng-click=\"decrementMinutes()\" class=\"btn btn-link\"><i class=\"icon-chevron-down\"></i></a></td>\n" +
            "		<td ng-show=\"showMeridian\"></td>\n" +
            "	</tr>\n" +
            "</table>\n" +
            "");
}]);

angular.module("template/typeahead/typeahead-match.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/typeahead/typeahead-match.html",
        "<a tabindex=\"-1\" bind-html-unsafe=\"match.label | typeaheadHighlight:query\"></a>");
}]);

angular.module("template/typeahead/typeahead-popup.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/typeahead/typeahead-popup.html",
            "<ul class=\"typeahead dropdown-menu\" ng-style=\"{display: isOpen()&&'block' || 'none', top: position.top+'px', left: position.left+'px'}\">\n" +
            "    <li ng-repeat=\"match in matches\" ng-class=\"{active: isActive($index) }\" ng-mouseenter=\"selectActive($index)\" ng-click=\"selectMatch($index)\">\n" +
            "        <div typeahead-match index=\"$index\" match=\"match\" query=\"query\" template-url=\"templateUrl\"></div>\n" +
            "    </li>\n" +
            "</ul>");
}]);
