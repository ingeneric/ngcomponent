import {
  bootstrap,
  element,
  IControllerConstructor,
  Injectable,
  IScope,
  module,
} from 'angular';
import { $compile, $rootScope } from 'ngimport';
import NgComponent from './ngcomponent.js';

interface Props {
  a: number;
  b: string;
}

interface State {
  c: boolean;
}

describe('Component', () => {
  describe('#$onChanges', () => {
    test('should call #render if any prop has changed', () => {
      class A extends NgComponent<Props, State> {
        override render() {}
      }

      const a = new A();

      // call #1
      a.$onChanges({
        a: {
          currentValue: 42,
          previousValue: undefined,
          isFirstChange: () => true,
        },
        b: {
          currentValue: undefined,
          previousValue: undefined,
          isFirstChange: () => true,
        },
      });
      expect(a.props).toEqual({ a: 42, b: undefined });

      // call #2
      a.$onChanges({
        a: { currentValue: 60, previousValue: 42, isFirstChange: () => false },
        b: {
          currentValue: 'foo',
          previousValue: undefined,
          isFirstChange: () => false,
        },
      });
      expect(a.props).toEqual({ a: 60, b: 'foo' });

      // call #3
      a.$onChanges({
        b: {
          currentValue: 'bar',
          previousValue: 'foo',
          isFirstChange: () => false,
        },
      });
      expect(a.props).toEqual({ a: 60, b: 'bar' });

      // call #4
      a.$onChanges({
        a: { currentValue: -10, previousValue: 60, isFirstChange: () => false },
      });
      expect(a.props).toEqual({ a: -10, b: 'bar' });
    });
    test('should call #render even if props were not initialized to undefined by angular', () => {
      class A extends NgComponent<Props, State> {
        override render() {}
      }

      const a = new A();
      a.$onChanges({});
      jest.spyOn(a, 'render');
      a.$onChanges({
        a: { currentValue: 42, previousValue: 42, isFirstChange: () => false },
      });
      expect(a.render).toHaveBeenCalledWith();
    });
    test('should not call #render if no props have changed', () => {
      let counter = 0;

      class A extends NgComponent<Props, NonNullable<unknown>> {
        override render() {
          counter++;
        }
      }

      const a = new A();

      // call #1
      a.$onChanges({
        a: {
          currentValue: 42,
          previousValue: undefined,
          isFirstChange: () => true,
        },
        b: {
          currentValue: undefined,
          previousValue: undefined,
          isFirstChange: () => true,
        },
      });
      expect(counter).toBe(1);

      // call #2
      a.$onChanges({
        a: { currentValue: 42, previousValue: 42, isFirstChange: () => false },
        b: {
          currentValue: undefined,
          previousValue: undefined,
          isFirstChange: () => false,
        },
      });
      expect(counter).toBe(1);
    });
  });

  describe('lifecycle hooks', () => {
    describe('#componentWillMount', () => {
      test('should get called when the component mounts', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {}
        }

        const spy = jest.spyOn(A.prototype, 'componentWillMount');
        renderComponent(A);
        expect(spy).toHaveBeenCalledWith();
      });
    });

    describe('#componentDidMount', () => {
      test('should get called when the component mounts', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {}
        }

        const spy = jest.spyOn(A.prototype, 'componentDidMount');
        renderComponent(A);
        expect(spy).toHaveBeenCalledWith();
      });
    });

    describe('#componentWillReceiveProps', () => {
      test('should not get called on initial render', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {}
        }

        const spy = jest.spyOn(A.prototype, 'componentWillReceiveProps');
        renderComponent(A);
        expect(spy).not.toHaveBeenCalled();
      });
      test('should get called when props update', (done) => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {}

          override componentWillReceiveProps(props: Props) {
            expect(props).toEqual({ a: 20, b: 'foo' });
            expect(this.props).not.toEqual(props);
            done();
          }
        }

        const { parentScope } = renderComponent(A);
        parentScope.$apply(() => (parentScope.a = 20));
      });
    });

    describe('#shouldComponentUpdate', () => {
      test('should not get called on the initial render', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {}
        }

        const spy = jest.spyOn(A.prototype, 'shouldComponentUpdate');
        // tslint:disable-next-line:no-unused-variable
        const a = new A();
        a.$onChanges({
          a: { currentValue: 42, previousValue: 10, isFirstChange: () => true },
          b: {
            currentValue: 'foo',
            previousValue: undefined,
            isFirstChange: () => true,
          },
        });
        expect(spy).not.toHaveBeenCalled();
      });
      test('should render even if false on initial render', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override shouldComponentUpdate() {
            return false;
          }

          override render() {}
        }

        const spy = jest.spyOn(A.prototype, 'render');
        // tslint:disable-next-line:no-unused-variable
        const a = new A();
        a.$onChanges({
          a: { currentValue: 42, previousValue: 10, isFirstChange: () => true },
          b: {
            currentValue: 'foo',
            previousValue: undefined,
            isFirstChange: () => true,
          },
        });
        expect(spy).toHaveBeenCalled();
      });
      test('should get called on subsequent renders', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          constructor() {
            super();
            this.state = { c: false };
          }

          override render() {}
        }

        const spy = jest.spyOn(A.prototype, 'shouldComponentUpdate');
        const a = new A();
        // first render
        a.$onChanges({
          a: {
            currentValue: 10,
            previousValue: undefined,
            isFirstChange: () => true,
          },
          b: {
            currentValue: undefined,
            previousValue: undefined,
            isFirstChange: () => true,
          },
        });
        // subsequent render
        a.$onChanges({
          a: { currentValue: 42, previousValue: 10, isFirstChange: () => true },
          b: {
            currentValue: 'foo',
            previousValue: undefined,
            isFirstChange: () => true,
          },
        });
        expect(spy).toHaveBeenCalledWith({ a: 42, b: 'foo' }, { c: false });
      });
      test('should accept a custom comparator', () => {
        let counter = 0;

        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {
            counter++;
          }

          override shouldComponentUpdate(nextProps: Props): boolean {
            return Boolean(this.props.a && nextProps.a > this.props.a);
          }
        }

        const a = new A();

        // call #1
        a.$onChanges({
          a: { currentValue: 42, previousValue: 10, isFirstChange: () => true },
          b: {
            currentValue: 'foo',
            previousValue: undefined,
            isFirstChange: () => true,
          },
        });
        expect(counter).toBe(1);
        expect(a.props).toEqual({ a: 42, b: 'foo' });

        // call #2
        a.$onChanges({
          a: { currentValue: 30, previousValue: 42, isFirstChange: () => true },
          b: {
            currentValue: 'bar',
            previousValue: 'foo',
            isFirstChange: () => true,
          },
        });
        expect(counter).toBe(1);

        // call #3
        a.$onChanges({
          a: { currentValue: 31, previousValue: 30, isFirstChange: () => true },
          b: {
            currentValue: 'bar',
            previousValue: 'foo',
            isFirstChange: () => true,
          },
        });
        expect(counter).toBe(2);
        expect(a.props).toEqual({ a: 31, b: 'bar' });
      });
    });

    describe('#componentWillUpdate', () => {
      test('should not get called on initial render', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {}
        }

        const spy = jest.spyOn(A.prototype, 'componentWillUpdate');
        renderComponent(A);
        expect(spy).not.toHaveBeenCalled();
      });
      test('should get called before the component renders', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {}

          override componentWillUpdate() {}
        }

        const { parentScope, scope } = renderComponent(A);
        const spy = jest.spyOn(scope.$ctrl, 'componentWillUpdate');
        parentScope.$apply(() => (parentScope.a = 20));
        expect(spy).toHaveBeenCalledWith({ a: 20, b: 'foo' }, {});
      });
    });

    describe('#componentDidUpdate', () => {
      test('should not get called on initial render', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {}
        }

        const spy = jest.spyOn(A.prototype, 'componentDidUpdate');
        renderComponent(A);
        expect(spy).not.toHaveBeenCalled();
      });
      test('should get called after the component renders', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {}

          override componentDidUpdate() {}
        }

        const { parentScope, scope } = renderComponent(A);
        const spy = jest.spyOn(scope.$ctrl, 'componentDidUpdate');
        parentScope.$apply(() => (parentScope.a = 20));
        expect(spy).toHaveBeenCalledWith({ a: 20, b: 'foo' }, {});
      });
    });

    describe('#componentWillUnmount', () => {
      test('should get called when the component unmounts', () => {
        class A extends NgComponent<Props, NonNullable<unknown>> {
          override render() {}

          override componentWillUnmount() {}
        }

        const { parentScope, scope } = renderComponent(A);
        const spy = jest.spyOn(scope.$ctrl, 'componentWillUnmount');
        parentScope.$destroy();
        expect(spy).toHaveBeenCalledWith();
      });
    });
  });

  describe('overall lifecycle', () => {
    test('should be called in correct order', () => {
      const events: string[] = [];

      class A extends NgComponent<Props, NonNullable<unknown>> {
        override componentWillMount() {
          events.push('componentWillMount');
        }

        override componentDidMount() {
          events.push('componentDidMount');
        }

        override shouldComponentUpdate(nextProps: Props) {
          events.push('shouldComponentUpdate');
          return nextProps.a === 42;
        }

        override componentWillUpdate() {
          events.push('componentWillUpdate');
        }

        override render() {
          events.push('render');
        }

        override componentDidUpdate() {
          events.push('componentDidUpdate');
        }

        override componentWillUnmount() {
          events.push('componentWillUnmount');
        }
      }

      const { parentScope } = renderComponent(A);
      parentScope.$apply(() => (parentScope.a = 42)); // update
      parentScope.$apply(() => (parentScope.a = 21)); // no update
      parentScope.$destroy();
      expect(events).toEqual([
        'componentWillMount',
        'render',
        'componentDidMount',
        'shouldComponentUpdate',
        'componentWillUpdate',
        'render',
        'componentDidUpdate',
        'shouldComponentUpdate',
        'componentWillUnmount',
      ]);
    });
  });
});

// helpers

interface Scope extends IScope {
  a: number;
  b: string;
  $ctrl: NgComponent<Props>;
}

function renderComponent(controller: Injectable<IControllerConstructor>) {
  module('test', ['bcherny/ngimport']).component('myComponent', {
    bindings: {
      a: '<',
      b: '<',
    },
    controller,
    template: `{{a}}`,
  });

  bootstrap(div(), ['test']);

  const el = element('<my-component a="a" b="b"></my-component>');
  const parentScope = Object.assign($rootScope.$new(true), {
    a: 10,
    b: 'foo',
  });
  $compile(el)(parentScope);
  parentScope.$apply();
  const scope = el.isolateScope() as Scope;
  return {
    parentScope,
    scope,
  };
}

function div() {
  return element(document.createElement('div'));
}
