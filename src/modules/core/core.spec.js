describe('grid-core', function () {
    var helper = require('@grid/grid-spec-helper')();
    var $ = require('jquery');
    var grid;
    beforeEach(function () {
        grid = require('@grid/core')();
    });

    it('should have the right models', function () {
        expect(grid).toHaveField('eventLoop');
        expect(grid).toHaveField('decorators');
        expect(grid).toHaveField('cellClasses');
        expect(grid).toHaveField('rowModel');
        expect(grid).toHaveField('colModel');
        expect(grid).toHaveField('dataModel');
        expect(grid).toHaveField('virtualPixelCellModel');
        expect(grid).toHaveField('cellScrollModel');
        expect(grid).toHaveField('navigationModel');
        expect(grid).toHaveField('viewLayer');
        expect(grid).toHaveField('pixelScrollModel');
    });

    it('should have a main build function', function () {
        var viewBuild = spyOn(grid.viewLayer, 'build');
        var loopBuild = spyOn(grid.eventLoop, 'setContainer');
        grid.build(helper.container);
        expect(viewBuild).toHaveBeenCalled();
        expect(loopBuild).toHaveBeenCalled();
    });

    function spyOnDraw() {
        return spyOn(grid.viewLayer, 'draw');
    }

    it('should let me request a redraw', function () {
        var draw = spyOn(grid.viewLayer, 'draw');
        grid.requestDraw();
        expect(draw).toHaveBeenCalled();
    });

    it('should not draw on request if in event loop but should draw after', function () {
        var draw = spyOnDraw();
        grid.eventLoop.addInterceptor(inLoopFn);
        grid.eventLoop.fire({});
        function inLoopFn() {
            grid.requestDraw();
            expect(draw).not.toHaveBeenCalled();
        }

        expect(draw).toHaveBeenCalled();
    });

    function findTextArea() {
        return $(helper.container).find('textarea');
    }

    it('should have a focusable text area on build', function () {
        grid.build(helper.container);
        expect(findTextArea()).toBeAnElement();
    });

    it('should add a class to the container on focus', function () {
        grid.build(helper.container);
        $(helper.container).find('textarea').focus();
        expect(helper.container).toHaveClass('focus');
    });

    it('should not change the containers tabindex if it already has a value', function () {
        helper.container.tabIndex = 1;
        grid.build(helper.container);
        expect(helper.container.tabIndex).toBe(1);
    });

    it('should give the container a tabindex if it doesnt already have one', function () {
        grid.build(helper.container);
        expect(helper.container.tabIndex).toBe(0);
    });

    it('should focus the text area if the grid is focused', function () {
        grid.build(helper.container);
        $(helper.container).focus();
        expect(document.activeElement).toEqual(findTextArea()[0]);
    });

});