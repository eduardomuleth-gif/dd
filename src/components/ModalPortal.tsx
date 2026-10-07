import React, { useEffect } from 'react';
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
}) => {
  // Lock background page scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !disableClose) {
        e.stopPropagation();
        onClose();
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
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-[9999] flex items-center justify-center px-3 py-4 sm:px-6 sm:py-6 bg-slate-950/80 backdrop-blur-sm overflow-hidden animate-fadeIn ${backdropClassName}`}
    >
      <div
        id={cardId}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClass} max-h-[90vh] my-auto flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden transition-all ${cardClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
