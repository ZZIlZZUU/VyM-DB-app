import { useState, useCallback } from 'react'

// useConfirm — maneja el estado del ConfirmDialog
// Uso:
//   const { confirmProps, confirm } = useConfirm()
//   await confirm({ title: '...', message: '...' })   // resuelve true/false
//   <ConfirmDialog {...confirmProps} />

export function useConfirm() {
  const [state, setState] = useState({
    open: false, title: '', message: '', danger: false, resolve: null,
  })

  const confirm = useCallback(({ title, message = '', danger = false }) => {
    return new Promise(resolve => {
      setState({ open: true, title, message, danger, resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolve?.(true)
    setState(s => ({ ...s, open: false }))
  }, [state])

  const handleCancel = useCallback(() => {
    state.resolve?.(false)
    setState(s => ({ ...s, open: false }))
  }, [state])

  return {
    confirm,
    confirmProps: {
      open:      state.open,
      title:     state.title,
      message:   state.message,
      danger:    state.danger,
      onConfirm: handleConfirm,
      onCancel:  handleCancel,
    },
  }
}