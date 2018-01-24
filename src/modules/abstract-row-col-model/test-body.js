function testAbstractModel(modelCreatorFn, name, lengthName, defaultLength) {
  require('../grid-spec-helper')();
  var model;
  var grid;

  beforeEach(function () {
    grid = this.buildSimpleGrid();
    model = modelCreatorFn(grid, name, lengthName, defaultLength);
  });


  it('should let me add multiple', function () {
    var ob1 = {};
    var ob2 = {};
    model.add([ob1, ob2]);
    expect(model.get(0)).toBe(ob1);
    expect(model.get(1)).toBe(ob2);
  });

  it('should be dirty on add', function () {
    this.resetAllDirties();
    model.add({});
    expect(model).toBeDirty();
  });

  it('should tell you the number of ' + name + 's', function () {
    model.add({});
    model.add({});
    expect(model.length()).toBe(2);
  });

  it('should be able to tell you a default ' + name + ' ' + lengthName, function () {
    model.add({});
    expect(model.sizeOf(0)).toBeANumber();
  });

  it('should have a settable default', function () {
    model.add({});
    model.defaultSize = 20;
    expect(model.sizeOf(0)).toBe(20);
  });

  it('should be able to clear', function () {
    model.add({});
    model.clear();
    expect(model.length()).toBe(0);
  });

  it('should not clear headers by default', function () {
    model.add({});
    model.addHeaders({});
    model.clear();
    expect(model.length(true)).toBe(1);
  });

  it('should clear headers with flag', function () {
    model.add({});
    model.addHeaders({});
    model.clear();
    expect(model.length()).toBe(0);
  });

  it('should let you remove a descriptor', function () {
    var descriptor = {};
    model.add(descriptor);
    model.remove(descriptor);
    expect(model.length()).toBe(0);
  });

  it('should update numFixed on remove', function () {
    var descriptor = {
      fixed: true
    };
    model.add(descriptor);
    model.remove(descriptor);
    expect(model.numFixed()).toBe(0);
  });

  it('should update numHeaders on remove', function () {
    var descriptor = {};
    model.addHeaders(descriptor);
    model.remove(descriptor);
    expect(model.numHeaders()).toBe(0);
  });

  it('should be able to tell you a few specified ' + name + ' ' + lengthName + 's', function () {
    var weirdLength = 311;
    var descriptor = {};
    descriptor[lengthName] = weirdLength;
    model.add(descriptor);
    expect(model.sizeOf(0)).toEqual(weirdLength);

    var weirdLength2 = 105;
    var descriptor2 = {};
    descriptor2[lengthName] = weirdLength2;
    model.add(descriptor2);
    expect(model.sizeOf(1)).toBe(weirdLength2);
  });

  it('should notify listeners if ' + name + 's are added', function () {
    var spy = jasmine.createSpy();
    grid.eventLoop.bind('grid-' + name + '-change', spy);
    var descriptor = {};
    model.add(descriptor);
    expect(spy).toHaveBeenCalled();
    expect(spy.calls.argsFor(0)[0].action).toBe('add');
    expect(spy.calls.argsFor(0)[0].descriptors).toEqual([descriptor]);
  });

  it('should tell you there are 0 fixed ' + name + 's by default', function () {
    model.add({});
    expect(model.numFixed()).toEqual(0);
  });

  it('should let you add a fixed ' + name + '', function () {
    model.add({
      fixed: true
    });
    expect(model.numFixed()).toEqual(1);
  });

  it('should not let you add a fixed ' + name + ' after unfixed ones', function () {
    model.add({});
    expect(function () {
      model.add({
        fixed: true
      });
    }).toThrow();
  });

  it('should handle weird queries', function () {
    expect(model.sizeOf(-1)).toBeNaN();
    expect(model.sizeOf(10000)).toBeNaN();
    expect(model.sizeOf(undefined)).toBeNaN();
  });


  describe('move', function () {
    beforeEach(function () {
      model.add({});
      model.add({});
    });

    it('should allow me to move a descriptor to a new index', function () {
      var orig = model.get(0);
      model.move(0, 1);
      expect(model.get(1)).toBe(orig);
    });

    describe('multiple', function () {

      beforeEach(function () {
        model.add({});
        model.add({});
      });

      it('array of one right', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([0], 1);
        this.results = [orig1, orig, orig2, orig3];
      });

      it('array of one left', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([1], 0);
        this.results = [orig1, orig, orig2, orig3];
      });

      it('array of one left multiple', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([2], 0);
        this.results = [orig2, orig, orig1, orig3];
      });

      it('connected indices before', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([2, 3], 0);
        this.results = [orig2, orig3, orig, orig1];
      });

      it('connected indices after', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([2, 3], 0, true);
        this.results = [orig, orig2, orig3, orig1];
      });

      it('separated indices after', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([0, 3], 1, true);
        this.results = [orig1, orig, orig3, orig2];
      });

      it('separated indices before', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([0, 3], 1);
        this.results = [orig, orig3, orig1, orig2];
      });

      it('separated indices many before', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([0, 1, 3], 2);
        this.results = [orig, orig1, orig3, orig2];
      });

      it('separated indices many after', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([0, 2, 3], 1, true);
        this.results = [orig1, orig, orig2, orig3];
      });

      it('indices to one of the moved positions', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([1, 2], 2, true);
        this.results = [orig, orig1, orig2, orig3];
      });

      it('separated indices to one of the moved positions', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([1, 3], 3, true);
        this.results = [orig, orig2, orig1, orig3];
      });

      it('indices to one of the moved positions when moving from 0', function () {
        var orig = model.get(0);
        var orig1 = model.get(1);
        var orig2 = model.get(2);
        var orig3 = model.get(3);
        model.move([0, 1], 1, true);
        this.results = [orig, orig1, orig2, orig3];
      });

      afterEach(function () {
        this.results.forEach(function (result, i) {
          expect(model.get(i)).toBe(result);
        })
      });
    });



    it('should fire change on move', function () {
      var spy = jasmine.createSpy();
      grid.eventLoop.bind('grid-' + name + '-change', spy);
      model.move(0, 1);
      expect(spy).toHaveBeenCalled();
      expect(spy.calls.argsFor(0)[0].action).toBe('move');
      expect(spy.calls.argsFor(0)[0].descriptors).toContain(model.get(0));
      expect(spy.calls.argsFor(0)[0].descriptors).toContain(model.get(1));
      expect(model.isDirty()).toBe(true);
    });
  });

  describe('headers', function () {

    it('headers should be considered fixed', function () {
      var descriptor = model.create();
      descriptor.header = true;
      expect(descriptor.fixed).toBe(true);
    });

    it('should be able to add a header', function () {
      var descriptor = model.create();
      model.addHeaders(descriptor);
      expect(model.header(0)).toBe(descriptor);
    });

    it('should tell me the number of headers', function () {
      var descriptor = model.create();
      model.addHeaders(descriptor);
      expect(model.numHeaders()).toBe(1);
    });

    it('should tell me length of all descriptors including headers', function () {
      model.addHeaders(model.create());
      model.add(model.create());
      expect(model.length(true)).toBe(2);
    });

    it('should add headers at the beginning', function () {
      var descriptor = model.create();
      model.addHeaders(descriptor);
      expect(model.get(0)).toBe(descriptor);
    });

    it('should add headers after previous headers but before the rest of the cols', function () {
      model.addHeaders(model.create());
      model.add(model.create());
      var descriptor = model.create();
      model.addHeaders(descriptor);
      expect(model.get(1)).toBe(descriptor);
    });

    it('should be included in num fixed', function () {
      model.addHeaders(model.create());
      expect(model.numFixed()).toBe(1);
    });

    it('should get me back ' + name + 's', function () {
      model.addHeaders(model.create());
      var descriptor = model.create();
      model.add(descriptor);
      expect(model.get(0, true)).toBe(descriptor);
    });

    it('should select disregarding headers', function () {
      model.addHeaders(model.create());
      var descriptor = model.create();
      model.add(descriptor);
      model.select(0);
      expect(descriptor.selected).toBe(true);
      model.deselect(0);
      expect(descriptor.selected).toBe(false);
    });

    it('should let me convert from virtual to data', function () {
      model.addHeaders(model.create());
      expect(model.toData(0)).toBe(-1);
      expect(model.toData(1)).toBe(0);
    });

    it('should let me convert from data to virtual', function () {
      model.addHeaders(model.create());
      expect(model.toVirtual(0)).toBe(1);
    });

  });


  describe('descriptor', function () {
    describe('should satisfy', function () {
      var ctx = {};
      beforeEach(function () {
        ctx.obj = model.create();
        ctx.dirtyObjs = [model];
        ctx.props = [lengthName];
      });

      require('../dirty-props/test-body')(ctx);
    });

    it('should fire change on ' + lengthName + ' set', function () {
      var descriptor = model.create();
      model.add(descriptor);
      var spy = jasmine.createSpy();
      grid.eventLoop.bind('grid-' + name + '-change', spy);
      model.get(0)[lengthName] = 5;
      expect(spy).toHaveBeenCalled();
      expect(spy.calls.argsFor(0)[0].action).toBe('size');
      expect(spy.calls.argsFor(0)[0].descriptors).toEqual([descriptor]);
    });

    it('should be able to get its index', function () {
      var descriptor = model.create();
      model.add(descriptor);
      expect(descriptor.index).toBe(0);
    });

    it('should set the datamodel dirty if its data changes', () => {
      var descriptor = model.create();
      model.add(descriptor);
      descriptor.data = [{
        formatted: 'blah'
      }];
      expect(grid.dataModel).toBeDirty();
    })
  });

  describe('selection', function () {
    beforeEach(function () {
      model.add(model.create());
      model.add(model.create());
    });

    it('should be able to select ' + name + 's', function () {
      model.select(0);
      expect(model.getSelected()).toEqual([0]);
    });

    it('should be idempotent', function () {
      model.select(0);
      model.select(0);
      expect(model.getSelected()).toEqual([0]);
    });

    it('should be able to clear', function () {
      model.select(0);
      model.clearSelected();
      expect(model.getSelected()).toEqual([]);
    });

    it('should be able to deselect', function () {
      model.select(0);
      model.deselect(0);
      expect(model.getSelected()).toEqual([]);
    });

    it('should be able to toggle select', function () {
      model.toggleSelect(0);
      expect(model.getSelected()).toEqual([0]);
      model.toggleSelect(0);
      expect(model.getSelected()).toEqual([]);
    });

    it('should set a selected flag on the descriptor', function () {
      model.select(0);
      expect(model.get(0).selected).toBe(true);
    });

    describe(' event', function () {
      beforeEach(function () {
        this.spy = jasmine.createSpy('selection change');
        grid.eventLoop.bind('grid-' + name + '-selection-change', this.spy);
      });

      it('select', function () {
        model.select(0);
        model.select(1);
      });

      it('deselect', function () {
        model.select(0, true);
        model.deselect(0);
      });

      it('multiple select', function () {
        model.select([0, 1]);
        expect(model.getSelected()).toEqual([0, 1]);
      });

      it('multiple deselect', function () {
        model.select([0, 1], true);
        model.deselect([0, 1]);
        expect(model.getSelected()).toEqual([]);
      });

      it('toggle select', function () {
        model.toggleSelect(0);
      });

      it('clear selected', function () {
        model.select([0, 1], true);
        model.clearSelected();
      });

      afterEach(function (cb) {
        setTimeout(function () {
          expect(this.spy).toHaveBeenCalled();
          expect(this.spy.calls.count()).toBe(1);
          cb();
        }.bind(this), 2)
      });
    });
  });

  describe('dom builder', function () {

    it('should let me create a dom builder', function () {
      var render = function () {};
      var update = function () {};
      var builder = model.createBuilder(render, update);
      expect(builder).toBeDefined();
      expect(builder.render).toBe(render);
      expect(builder.update).toBe(update);
    });

    it('should be able to be passed to col create', function () {
      var builder = model.createBuilder(function () {});
      var descriptor = model.create(builder);
      expect(descriptor.builder).toBe(builder);
    });

    it('should default to pass through functions', function () {
      var builder = model.createBuilder(function () {});
      expect(builder.render).toBeAFunction();
      expect(builder.update).toBeAFunction();
      expect(builder.update(8)).toBe(8);
    });
  });

  it('should be dirty on col add', function () {
    var descriptor = model.create(model.createBuilder(function () {}));
    this.resetAllDirties();
    model.add(descriptor);
    expect(model.areBuildersDirty()).toBe(true);
  });

  it('should be dirty on set later', function () {
    var descriptor = model.create();
    model.add(descriptor);
    this.resetAllDirties();
    model.get(0).builder = model.createBuilder(function () {});
    expect(model.areBuildersDirty()).toBe(true);
  });

  describe('hidden', function () {
    it('should return ' + lengthName + ' 0', function () {
      var descriptor = model.create();
      model.add(descriptor);
      descriptor.hidden = true;
      expect(model.sizeOf(0)).toBe(0);
    });

    it('should be dirty on change', function () {
      var descriptor = model.create();
      model.add(descriptor);
      this.resetAllDirties();
      descriptor.hidden = true;
      expect(model.isDirty()).toBe(true);
    });
  });

  describe('expansion', function () {

  });

}

module.exports = testAbstractModel;