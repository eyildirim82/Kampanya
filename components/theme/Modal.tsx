'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Card from './Card';
import Icon from './Icon';

export interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    ariaDescribedBy?: string;
    ariaLabelledBy?: string;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
    );
}

export function Modal({
    open,
    onClose,
    title,
    children,
    footer,
    ariaDescribedBy,
    ariaLabelledBy,
}: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!open) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
            if (e.key !== 'Tab' || !contentRef.current) return;
            const focusable = getFocusableElements(contentRef.current);
            if (focusable.length === 0) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        },
        [open, onClose]
    );

    useEffect(() => {
        if (!open) return;
        previousActiveElement.current = document.activeElement as HTMLElement | null;
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            previousActiveElement.current?.focus();
        };
    }, [open, handleKeyDown]);

    useEffect(() => {
        if (open && contentRef.current) {
            const focusable = getFocusableElements(contentRef.current);
            if (focusable.length > 0) focusable[0].focus();
        }
    }, [open]);

    if (!open) return null;

    const titleId = title ? 'modal-title' : undefined;
    const content = (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledBy ?? titleId}
            aria-describedby={ariaDescribedBy}
            onClick={(e) => e.target === overlayRef.current && onClose()}
        >
            <Card
                ref={contentRef}
                variant="default"
                padding="none"
                className="w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
                    {title && (
                        <h2 id={titleId} className="text-lg font-bold text-gray-900 dark:text-white">
                            {title}
                        </h2>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Kapat"
                    >
                        <Icon name="close" size="md" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">{children}</div>
                {footer != null && (
                    <div className="p-4 border-t border-gray-100 dark:border-white/10 flex justify-end gap-2">
                        {footer}
                    </div>
                )}
            </Card>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(content, document.body);
    }
    return content;
}

Modal.displayName = 'Modal';
