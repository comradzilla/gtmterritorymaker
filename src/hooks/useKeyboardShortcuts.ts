import { useEffect, useCallback, useRef } from 'react'

interface ShortcutConfig {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  handler: () => void
  preventDefault?: boolean
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean
}

/**
 * Hook for handling global keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: ShortcutConfig[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled = true } = options
  const shortcutsRef = useRef(shortcuts)

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Allow Escape in input fields to blur them
        if (e.key === 'Escape') {
          target.blur()
          return
        }
        return
      }

      for (const shortcut of shortcutsRef.current) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey
        const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey

        // On Mac, use Meta (Cmd), on Windows/Linux use Ctrl
        const modifierMatch =
          (shortcut.ctrl || shortcut.meta) &&
          (e.ctrlKey || e.metaKey) &&
          shiftMatch

        const exactMatch = keyMatch && ctrlMatch && metaMatch && shiftMatch

        if (exactMatch || (keyMatch && modifierMatch)) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault()
          }
          shortcut.handler()
          return
        }
      }
    },
    []
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}

/**
 * Common shortcut definitions
 */
export function createShortcuts(handlers: {
  onUndo?: () => void
  onRedo?: () => void
  onEscape?: () => void
  onSearch?: () => void
}): ShortcutConfig[] {
  const shortcuts: ShortcutConfig[] = []

  if (handlers.onUndo) {
    shortcuts.push({
      key: 'z',
      meta: true,
      handler: handlers.onUndo,
    })
  }

  if (handlers.onRedo) {
    // Cmd+Shift+Z
    shortcuts.push({
      key: 'z',
      meta: true,
      shift: true,
      handler: handlers.onRedo,
    })
    // Cmd+Y (alternative)
    shortcuts.push({
      key: 'y',
      meta: true,
      handler: handlers.onRedo,
    })
  }

  if (handlers.onEscape) {
    shortcuts.push({
      key: 'Escape',
      handler: handlers.onEscape,
    })
  }

  if (handlers.onSearch) {
    // Slash key for vim-style search
    shortcuts.push({
      key: '/',
      handler: handlers.onSearch,
    })
    // Cmd+F
    shortcuts.push({
      key: 'f',
      meta: true,
      handler: handlers.onSearch,
    })
  }

  return shortcuts
}
