import { useState, useCallback } from 'react'

// useConfirm — maneja el estado del ConfirmDialog
// Uso:
//   const { confirmProps, confirm } = useConfirm()
//   await confirm({ title: '...', message: '...' })   // resuelve true/false
//   <ConfirmDialog {...confirmProps} />

export function useConfirm() {
  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    danger: false,
    resolve: null,
    handled: false,
  })

  const confirm = useCallback(({ title, message = '', danger = false }) => {
    return new Promise(resolve => {
      setState({
        open: true,
        title,
        message,
        danger,
        resolve,
        handled: false,
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setState(prev => {
      if (!prev.open || prev.handled) return prev
      prev.resolve?.(true)
      return {
        ...prev,
        open: false,
        handled: true,
        resolve: null,
      }
    })
  }, [])

  const handleCancel = useCallback(() => {
    setState(prev => {
      if (!prev.open || prev.handled) return prev
      prev.resolve?.(false)
      return {
        ...prev,
        open: false,
        handled: true,
        resolve: null,
      }
    })
  }, [])

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