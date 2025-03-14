/**
 * @jest-environment jsdom
 */
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';

import {
  arrow,
  flip,
  hide,
  limitShift,
  offset,
  shift,
  size,
  useFloating,
} from '../src';

test('middleware is always fresh and does not cause an infinite loop', async () => {
  function InlineMiddleware() {
    const arrowRef = useRef(null);
    const {refs} = useFloating({
      placement: 'right',
      middleware: [
        offset(),
        offset(10),
        offset(() => 5),
        offset(() => ({crossAxis: 10})),
        offset({crossAxis: 10, mainAxis: 10}),

        flip({fallbackPlacements: ['top', 'bottom']}),

        shift(),
        shift({crossAxis: true}),
        shift({boundary: document.createElement('div')}),
        shift({boundary: [document.createElement('div')]}),
        shift({limiter: limitShift()}),
        shift({limiter: limitShift({offset: 10})}),
        shift({limiter: limitShift({offset: {crossAxis: 10}})}),
        shift({limiter: limitShift({offset: () => 5})}),
        shift({limiter: limitShift({offset: () => ({crossAxis: 10})})}),

        arrow({element: arrowRef}),

        hide(),

        size({
          apply({availableHeight, elements}) {
            Object.assign(elements.floating.style, {
              maxHeight: `${availableHeight}px`,
            });
          },
        }),
      ],
    });

    return (
      <>
        <div ref={refs.setReference} />
        <div ref={refs.setFloating} />
      </>
    );
  }

  function StateMiddleware() {
    const arrowRef = useRef(null);
    const [middleware, setMiddleware] = useState([
      offset(),
      offset(10),
      offset(() => 5),
      offset(() => ({crossAxis: 10})),
      offset({crossAxis: 10, mainAxis: 10}),

      // should also test `autoPlacement.allowedPlacements`
      // can't have both `flip` and `autoPlacement` in the same middleware
      // array, or multiple `flip`s
      flip({fallbackPlacements: ['top', 'bottom']}),

      shift(),
      shift({crossAxis: true}),
      shift({boundary: document.createElement('div')}),
      shift({boundary: [document.createElement('div')]}),
      shift({limiter: limitShift()}),
      shift({limiter: limitShift({offset: 10})}),
      shift({limiter: limitShift({offset: {crossAxis: 10}})}),
      shift({limiter: limitShift({offset: () => 5})}),
      shift({limiter: limitShift({offset: () => ({crossAxis: 10})})}),

      arrow({element: arrowRef}),

      hide(),

      size({
        apply({availableHeight, elements}) {
          Object.assign(elements.floating.style, {
            maxHeight: `${availableHeight}px`,
          });
        },
      }),
    ]);
    const {x, y, refs} = useFloating({
      placement: 'right',
      middleware,
    });

    return (
      <>
        <div ref={refs.setReference} />
        <div ref={refs.setFloating} />
        <button
          data-testid="step1"
          onClick={() => setMiddleware([offset(10)])}
        />
        <button
          data-testid="step2"
          onClick={() => setMiddleware([offset(() => 5)])}
        />
        <button data-testid="step3" onClick={() => setMiddleware([])} />
        <button data-testid="step4" onClick={() => setMiddleware([flip()])} />
        <div data-testid="x">{x}</div>
        <div data-testid="y">{y}</div>
      </>
    );
  }

  render(<InlineMiddleware />);

  const {getByTestId} = render(<StateMiddleware />);
  fireEvent.click(getByTestId('step1'));

  await act(async () => {});

  expect(getByTestId('x').textContent).toBe('10');

  fireEvent.click(getByTestId('step2'));

  await act(async () => {});

  expect(getByTestId('x').textContent).toBe('5');

  // No `expect` as this test will fail if a render loop occurs
  fireEvent.click(getByTestId('step3'));
  fireEvent.click(getByTestId('step4'));

  await act(async () => {});
});

describe('whileElementsMounted', () => {
  test('is called a single time when both elements mount', () => {
    const spy = jest.fn();

    function App() {
      const {refs} = useFloating({whileElementsMounted: spy});
      return (
        <>
          <button ref={refs.setReference} />
          <div ref={refs.setFloating} />
        </>
      );
    }

    render(<App />);
    expect(spy).toHaveBeenCalledTimes(1);
    cleanup();
  });

  test('is called a single time after floating mounts conditionally', () => {
    const spy = jest.fn();

    function App() {
      const [open, setOpen] = useState(false);
      const {refs} = useFloating({whileElementsMounted: spy});
      return (
        <>
          <button ref={refs.setReference} onClick={() => setOpen(true)} />
          {open && <div ref={refs.setFloating} />}
        </>
      );
    }

    render(<App />);
    expect(spy).toHaveBeenCalledTimes(0);
    fireEvent.click(screen.getByRole('button'));
    expect(spy).toHaveBeenCalledTimes(1);

    cleanup();
  });

  test('is called a single time after reference mounts conditionally', () => {
    const spy = jest.fn();

    function App() {
      const [open, setOpen] = useState(false);
      const {refs} = useFloating({whileElementsMounted: spy});
      return (
        <>
          {open && <button ref={refs.setReference} />}
          <div
            role="tooltip"
            ref={refs.setFloating}
            onClick={() => setOpen(true)}
          />
        </>
      );
    }

    render(<App />);
    expect(spy).toHaveBeenCalledTimes(0);
    fireEvent.click(screen.getByRole('tooltip'));
    expect(spy).toHaveBeenCalledTimes(1);

    cleanup();
  });

  test('is called a single time both elements mount conditionally', () => {
    const spy = jest.fn();

    function App() {
      const [open, setOpen] = useState(false);
      const {refs} = useFloating({whileElementsMounted: spy});

      useEffect(() => {
        setOpen(true);
      }, []);

      return (
        <>
          {open && <button ref={refs.setReference} />}
          {open && <div role="tooltip" ref={refs.setFloating} />}
        </>
      );
    }

    render(<App />);
    expect(spy).toHaveBeenCalledTimes(1);

    cleanup();
  });

  test('calls the cleanup function', () => {
    const cleanupSpy = jest.fn();
    const spy = jest.fn(() => cleanupSpy);

    function App() {
      const [open, setOpen] = useState(true);
      const {refs} = useFloating({whileElementsMounted: spy});

      useEffect(() => {
        setOpen(false);
      }, []);

      return (
        <>
          {open && <button ref={refs.setReference} />}
          {open && <div role="tooltip" ref={refs.setFloating} />}
        </>
      );
    }

    render(<App />);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);

    // Does not get called again post-cleanup
    expect(spy).toHaveBeenCalledTimes(1);

    cleanup();
  });
});

test('unstable callback refs', async () => {
  function App() {
    const {refs} = useFloating();

    return (
      <>
        <div ref={(node) => refs.setReference(node)} />
        <div ref={(node) => refs.setFloating(node)} />
      </>
    );
  }

  render(<App />);

  await act(async () => {});

  cleanup();
});

test('isPositioned', async () => {
  const spy = jest.fn();

  function App() {
    const [open, setOpen] = useState(false);
    const {refs, isPositioned} = useFloating({
      open,
    });

    useLayoutEffect(() => {
      spy(isPositioned);
    }, [isPositioned]);

    return (
      <>
        <button ref={refs.setReference} onClick={() => setOpen((v) => !v)} />
        {open && <div ref={refs.setFloating} />}
      </>
    );
  }

  const {getByRole} = render(<App />);

  fireEvent.click(getByRole('button'));

  expect(spy.mock.calls[0][0]).toBe(false);

  await act(async () => {});

  expect(spy.mock.calls[1][0]).toBe(true);

  fireEvent.click(getByRole('button'));

  expect(spy.mock.calls[2][0]).toBe(false);

  fireEvent.click(getByRole('button'));
  await act(async () => {});

  expect(spy.mock.calls[3][0]).toBe(true);

  fireEvent.click(getByRole('button'));
  expect(spy.mock.calls[4][0]).toBe(false);
});

test('external elements sync', async () => {
  function App() {
    const [referenceEl, setReferenceEl] = useState<HTMLElement | null>(null);
    const [floatingEl, setFloatingEl] = useState<HTMLElement | null>(null);
    const {x, y, refs} = useFloating();

    useLayoutEffect(() => {
      refs.setReference(referenceEl);
    }, [refs, referenceEl]);

    useLayoutEffect(() => {
      refs.setFloating(floatingEl);
    }, [refs, floatingEl]);

    return (
      <>
        <div ref={setReferenceEl} />
        <div ref={setFloatingEl} />
        <div data-testid="value">{`${x},${y}`}</div>
      </>
    );
  }

  const {getByTestId} = render(<App />);

  await act(async () => {});

  expect(getByTestId('value').textContent).toBe('0,0');
});

test('external reference element sync', async () => {
  function App() {
    const [referenceEl, setReferenceEl] = useState<HTMLElement | null>(null);
    const {x, y, refs} = useFloating({
      elements: {
        reference: referenceEl,
      },
    });

    return (
      <>
        <div data-testid="reference" ref={setReferenceEl} />
        <div ref={refs.setFloating} />
        <div data-testid="value">{`${x},${y}`}</div>
      </>
    );
  }

  const {getByTestId} = render(<App />);
  const mockBoundingClientRect = jest.fn(() => ({
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    top: 0,
    right: 50,
    bottom: 50,
    left: 0,
    toJSON: () => {},
  }));
  const reference = getByTestId('reference');
  reference.getBoundingClientRect = mockBoundingClientRect;

  await act(async () => {});

  expect(getByTestId('value').textContent).toBe('25,50');
});

test('external floating element sync', async () => {
  function App() {
    const [floatingEl, setFloatingEl] = useState<HTMLElement | null>(null);
    const {x, y, refs} = useFloating({
      elements: {
        floating: floatingEl,
      },
    });

    return (
      <>
        <div data-testid="reference" ref={refs.setReference} />
        <div ref={setFloatingEl} />
        <div data-testid="value">{`${x},${y}`}</div>
      </>
    );
  }

  const {getByTestId} = render(<App />);
  const mockBoundingClientRect = jest.fn(() => ({
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    top: 0,
    right: 50,
    bottom: 50,
    left: 0,
    toJSON: () => {},
  }));
  const reference = getByTestId('reference');
  reference.getBoundingClientRect = mockBoundingClientRect;

  await act(async () => {});

  expect(getByTestId('value').textContent).toBe('25,50');
});

test('external elements sync', async () => {
  function App() {
    const [referenceEl, setReferenceEl] = useState<HTMLElement | null>(null);
    const [floatingEl, setFloatingEl] = useState<HTMLElement | null>(null);
    const {x, y} = useFloating({
      elements: {
        reference: referenceEl,
        floating: floatingEl,
      },
    });

    return (
      <>
        <div data-testid="reference" ref={setReferenceEl} />
        <div ref={setFloatingEl} />
        <div data-testid="value">{`${x},${y}`}</div>
      </>
    );
  }

  const {getByTestId} = render(<App />);
  const mockBoundingClientRect = jest.fn(() => ({
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    top: 0,
    right: 50,
    bottom: 50,
    left: 0,
    toJSON: () => {},
  }));
  const reference = getByTestId('reference');
  reference.getBoundingClientRect = mockBoundingClientRect;

  await act(async () => {});

  expect(getByTestId('value').textContent).toBe('25,50');
});

test('external elements sync update', async () => {
  function App() {
    const [referenceEl, setReferenceEl] = useState<HTMLElement | null>(null);
    const [floatingEl, setFloatingEl] = useState<HTMLElement | null>(null);
    const {x, y} = useFloating({
      elements: {
        reference: referenceEl,
        floating: floatingEl,
      },
    });

    return (
      <>
        <div data-testid="reference" ref={setReferenceEl} />
        <div ref={setFloatingEl} />
        <div data-testid="value">{`${x},${y}`}</div>
      </>
    );
  }

  const {getByTestId} = render(<App />);
  await act(async () => {});

  expect(getByTestId('value').textContent).toBe('0,0');
});

test('floatingStyles no transform', async () => {
  function App() {
    const {refs, floatingStyles} = useFloating({
      transform: false,
    });

    return (
      <>
        <div data-testid="reference" ref={refs.setReference} />
        <div
          data-testid="floating"
          ref={refs.setFloating}
          style={floatingStyles}
        />
      </>
    );
  }

  const {getByTestId} = render(<App />);

  const mockBoundingClientRect = jest.fn(() => ({
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    top: 0,
    right: 50,
    bottom: 50,
    left: 0,
    toJSON: () => {},
  }));
  const reference = getByTestId('reference');
  reference.getBoundingClientRect = mockBoundingClientRect;

  expect(getByTestId('floating').style.position).toBe('absolute');
  expect(getByTestId('floating').style.top).toBe('0px');
  expect(getByTestId('floating').style.left).toBe('0px');

  await act(async () => {});

  expect(getByTestId('floating').style.position).toBe('absolute');
  expect(getByTestId('floating').style.top).toBe('50px');
  expect(getByTestId('floating').style.left).toBe('25px');
});

test('floatingStyles default', async () => {
  function App() {
    const {refs, floatingStyles} = useFloating();

    return (
      <>
        <div data-testid="reference" ref={refs.setReference} />
        <div
          data-testid="floating"
          ref={refs.setFloating}
          style={floatingStyles}
        />
      </>
    );
  }

  const {getByTestId} = render(<App />);

  const mockBoundingClientRect = jest.fn(() => ({
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    top: 0,
    right: 50,
    bottom: 50,
    left: 0,
    toJSON: () => {},
  }));
  const reference = getByTestId('reference');
  reference.getBoundingClientRect = mockBoundingClientRect;

  expect(getByTestId('floating').style.position).toBe('absolute');
  expect(getByTestId('floating').style.top).toBe('0px');
  expect(getByTestId('floating').style.left).toBe('0px');
  expect(getByTestId('floating').style.transform).toBe('translate(0px, 0px)');

  await act(async () => {});

  expect(getByTestId('floating').style.position).toBe('absolute');
  expect(getByTestId('floating').style.top).toBe('0px');
  expect(getByTestId('floating').style.left).toBe('0px');
  expect(getByTestId('floating').style.transform).toBe('translate(25px, 50px)');
});
