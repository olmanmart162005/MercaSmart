import React from 'react'
import Modal from './Modal'
import { AlertTriangle, HelpCircle, Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'danger' | 'primary'
  loading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-2 w-full justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary text-sm"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={confirmVariant === 'danger' ? 'btn-danger text-sm' : 'btn-primary text-sm'}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{confirmLabel}</span>
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-2xl flex-shrink-0 ${
            confirmVariant === 'danger'
              ? 'bg-rose-500/10 text-rose-500'
              : 'bg-sky-500/10 text-sky-500'
          }`}
        >
          {confirmVariant === 'danger' ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <HelpCircle className="w-6 h-6" />
          )}
        </div>
        <div className="flex-1 text-sm text-slate-600 dark:text-slate-300 pt-1 leading-relaxed">
          {message}
        </div>
      </div>
    </Modal>
  )
}
