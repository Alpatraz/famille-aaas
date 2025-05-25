import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

export default function Modal({ 
  title, 
  onClose, 
  children,
  size = 'medium',
  showClose = true,
  preventClose = false
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    // Store previously focused element
    previousActiveElement.current = document.activeElement;
    
    // Focus the modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !preventClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      // Restore body scroll
      document.body.style.overflow = 'auto';
      
      // Remove escape handler
      document.removeEventListener('keydown', handleEscape);
      
      // Restore previous focus
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [onClose, preventClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !preventClose) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className={`modal-content modal-${size}`}
        tabIndex="-1"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          {showClose && (
            <button 
              className="modal-close"
              onClick={onClose}
              aria-label="Fermer"
            >
              ×
            </button>
          )}
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}