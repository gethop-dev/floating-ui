import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {useCallback, useLayoutEffect, useState} from 'react';

import {
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
} from '../../src';
import {isElement} from '../../src/utils/is';

describe('positionReference', () => {
  test('sets separate refs', () => {
    function App() {
      const {refs} = useFloating<HTMLDivElement>();

      return (
        <>
          <div ref={refs.setReference} data-testid="reference" />
          <div
            ref={refs.setPositionReference}
            data-testid="position-reference"
          />
          <div data-testid="reference-text">
            {String(refs.domReference.current?.getAttribute('data-testid'))}
          </div>
          <div data-testid="position-reference-text">
            {String(isElement(refs.reference.current))}
          </div>
        </>
      );
    }

    const {getByTestId, rerender} = render(<App />);

    expect(getByTestId('reference-text').textContent).toBe('reference');
    expect(getByTestId('position-reference-text').textContent).toBe('false');

    rerender(<App />);

    expect(getByTestId('reference-text').textContent).toBe('reference');
    expect(getByTestId('position-reference-text').textContent).toBe('false');
  });

  test('handles unstable reference prop', () => {
    function App() {
      const {refs} = useFloating<HTMLDivElement>();

      return (
        <>
          <div
            ref={(node) => refs.setReference(node)}
            data-testid="reference"
          />
          <div
            ref={refs.setPositionReference}
            data-testid="position-reference"
          />
          <div data-testid="reference-text">
            {String(refs.domReference.current?.getAttribute('data-testid'))}
          </div>
          <div data-testid="position-reference-text">
            {String(isElement(refs.reference.current))}
          </div>
        </>
      );
    }

    const {getByTestId, rerender} = render(<App />);

    expect(getByTestId('reference-text').textContent).toBe('reference');
    expect(getByTestId('position-reference-text').textContent).toBe('false');

    rerender(<App />);

    expect(getByTestId('reference-text').textContent).toBe('reference');
    expect(getByTestId('position-reference-text').textContent).toBe('false');
  });

  test('handles real virtual element', () => {
    function App() {
      const {refs} = useFloating();

      useLayoutEffect(() => {
        refs.setPositionReference({
          getBoundingClientRect: () => ({
            x: 218,
            y: 0,
            width: 0,
            height: 0,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }),
        });
      }, [refs]);

      return (
        <>
          <div
            ref={(node) => refs.setReference(node)}
            data-testid="reference"
          />
          <div data-testid="reference-text">
            {String(refs.domReference.current?.getAttribute('data-testid'))}
          </div>
          <div data-testid="position-reference-text">
            {refs.reference.current?.getBoundingClientRect().x}
          </div>
        </>
      );
    }

    const {getByTestId, rerender} = render(<App />);

    expect(getByTestId('reference-text').textContent).toBe('reference');
    expect(getByTestId('position-reference-text').textContent).toBe('218');

    rerender(<App />);

    expect(getByTestId('reference-text').textContent).toBe('reference');
    expect(getByTestId('position-reference-text').textContent).toBe('218');
  });
});

describe('#2129: interactions.getFloatingProps as a dep does not cause setState loop', () => {
  function App() {
    const {refs, context} = useFloating({
      open: true,
    });

    const interactions = useInteractions([
      useHover(context),
      useClick(context),
      useFocus(context),
      useDismiss(context),
    ]);

    const Tooltip = useCallback(() => {
      return (
        <div
          data-testid="floating"
          ref={refs.setFloating}
          {...interactions.getFloatingProps()}
        />
      );
    }, [refs, interactions]);

    return (
      <>
        <div ref={refs.setReference} {...interactions.getReferenceProps()} />
        <Tooltip />
      </>
    );
  }

  render(<App />);

  expect(screen.queryByTestId('floating')).toBeInTheDocument();
});

test('domReference refers to externally synchronized `reference`', async () => {
  function App() {
    const [referenceEl, setReferenceEl] = useState<Element | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const {refs, context} = useFloating({
      open: isOpen,
      onOpenChange: setIsOpen,
      elements: {reference: referenceEl},
    });

    const hover = useHover(context);

    const {getReferenceProps, getFloatingProps} = useInteractions([hover]);

    return (
      <>
        <button ref={setReferenceEl} {...getReferenceProps()} />
        {isOpen && (
          <div role="dialog" ref={refs.setFloating} {...getFloatingProps()} />
        )}
      </>
    );
  }

  render(<App />);

  await userEvent.hover(screen.getByRole('button'));
  await act(async () => {});

  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
