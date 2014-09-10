'use strict';

beforeEach(function () {
    this.addMatchers({
        toBeDisplayNone: function () {
            var elem = this.actual;
            return jasmine.getEnv().equals_(elem.css('display'), ('none'));
        },

        //determines visibillity based on display none for now irrespective of attachement to the document
        toBeVisible: function () {
            var element = this.actual;
            if (!element || !angular.isFunction(element.parent)) {
                return false;
            }
            var lastParent = element;
            do {
                if (lastParent.length === 0 || lastParent.css('display') === 'none' || lastParent.hasClass('ng-hide')) {
                    return false;
                }
                lastParent = lastParent.parent();
            } while (lastParent.length > 0);
            return true;
        },
        toContainReference: function (val) {
            return this.actual.any(function (item) {
                return val === item;
            });
        },

        toBeDisabled: function () {
            var disabled = this.actual.attr('disabled');
            return disabled === true || disabled === 'true' || disabled === 'disabled';
        },

        toContainAny: function (val) {
            return angular.isFunction(this.actual.any) && this.actual.any(val);
        },

        toContainAll: function (val) {
            return angular.isFunction(this.actual.all) && this.actual.all(val);
        },

        toBeAFunction: function () {
            return angular.isFunction(this.actual);
        },

        toBeAnObject: function () {
            return angular.isObject(this.actual);
        },

        toBeAnArray: function () {
            return angular.isArray(this.actual);
        },
        toBeAString: function () {
            return angular.isString(this.actual);
        },
        toBeNully: function () {
            return this.actual === undefined || this.actual === null;
        }
    });
});

