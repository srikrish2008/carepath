import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

describe('Module K — Accessibility & ARIA Tests (8 tests)', () => {
  it('1. verifies Modal contains role="dialog" and aria-modal="true"', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Accessible Modal">
        <p>Modal content</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('2. verifies Modal title is linked via aria-labelledby', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Unique Title Header">
        <p>Modal content</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(screen.getByText('Unique Title Header')).toHaveAttribute('id', 'modal-title');
  });

  it('3. verifies Modal close button has accessible descriptive label', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Close Test">
        <p>Body</p>
      </Modal>
    );

    const closeBtn = screen.getByLabelText(/Close dialog/i);
    expect(closeBtn).toBeInTheDocument();
  });

  it('4. verifies Modal dismisses when Escape key is pressed', () => {
    let closed = false;
    render(
      <Modal isOpen={true} onClose={() => { closed = true; }} title="Escape Test">
        <p>Body</p>
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closed).toBe(true);
  });

  it('5. verifies status badges communicate meaning via text & icons, never color alone', () => {
    const { container: verifiedContainer } = render(<Badge type="verified">Verified Status</Badge>);
    expect(screen.getByText('Verified Status')).toBeInTheDocument();
    // Non-color icon present
    expect(verifiedContainer.querySelector('svg')).toBeInTheDocument();

    const { container: conflictContainer } = render(<Badge type="conflict">Conflict Detected</Badge>);
    expect(screen.getByText('Conflict Detected')).toBeInTheDocument();
    expect(conflictContainer.querySelector('svg')).toBeInTheDocument();
  });

  it('6. verifies buttons include focus visible classes for keyboard navigation', () => {
    render(<Button variant="primary">Keyboard Navigable Button</Button>);
    const button = screen.getByRole('button', { name: /Keyboard Navigable Button/i });
    expect(button.className).toContain('focus-visible:ring-2');
  });

  it('7. verifies disabled buttons communicate disabled state to assistive technologies', () => {
    render(<Button disabled>Disabled Action</Button>);
    const button = screen.getByRole('button', { name: /Disabled Action/i });
    expect(button).toBeDisabled();
    expect(button.className).toContain('disabled:cursor-not-allowed');
  });

  it('8. verifies loading state button displays accessible loading indicator', () => {
    render(<Button isLoading>Submitting Request</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Submitting Request')).toBeInTheDocument();
  });
});
