import { useState, useCallback } from 'react'

export function useDragDrop(onFileDrop, accept = '.csv') {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback(e => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(e => {
    e.preventDefault()
    e.stopPropagation()
    // Solo salir si el cursor realmente sale del elemento raíz
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback(e => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(e => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    // Validar extensión
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (accept && !accept.split(',').map(s => s.trim().toLowerCase()).includes(ext)) return
    onFileDrop(file)
  }, [onFileDrop, accept])

  return {
    isDragging,
    dropProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver:  handleDragOver,
      onDrop:      handleDrop,
    }
  }
}
