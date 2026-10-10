import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
  cardClassName?: string;
  backdropClassName?: string;
  disableClose?: boolean;
  id?: string;
  cardId?: string;
  ariaLabel?: string;
}

// Reference counter so multiple modals never conflict on body scroll lock
let activeModalCount = 0;
let savedBodyOverflow = '';
let savedBodyPaddingRight = '';

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (activeModalCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    savedBodyPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  activeModalCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (activeModalCount === 0) {
    document.body.style.overflow = savedBodyOverflow;
    document.body.style.paddingRight = savedBodyPaddingRight;
  }
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const ModalPortal: React.FC<ModalPortalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidthClass = 'max-w-2xl',
  cardClassName = '',
  backdropClassName = '',
  disableClose = false,
  id,
  cardId,
  ariaLabel,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Lock background page scroll while modal is open & manage focus restoration
  useEffect(() => {
    if (!isOpen) return;
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    lockBodyScroll();

    // Move focus into the modal if nothing inside is focused yet
    const focusTimer = window.setTimeout(() => {
      if (!cardRef.current) return;
      if (cardRef.current.contains(document.activeElement)) return;
      const focusable = cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        cardRef.current.focus();
      }
    }, 30);

    return () => {
      window.clearTimeout(focusTimer);
      unlockBodyScroll();
      if (
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function'
      ) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  // Close on Escape key & trap Tab focus within the modal dialog
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableClose) {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && cardRef.current) {
        const focusable = Array.from(
          cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null);

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl || !cardRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl || !cardRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, disableClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !disableClose) {
      onClose();
    }
  };

  return createPortal(
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fadeIn ${backdropClassName}`}
    >
      <div
        id={cardId}
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClass} max-h-[calc(100dvh-1.25rem)] sm:max-h-[90vh] my-auto flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden transition-all outline-none ${cardClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
