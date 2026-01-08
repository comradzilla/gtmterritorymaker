import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import type { StateLookupMaps } from '../hooks/useGeoJson'

interface StateSearchProps {
  lookupMaps: StateLookupMaps
  onSelectState: (code: string, lat: number, lng: number) => void
  centroids: Record<string, { lat: number; lng: number }>
}

export interface StateSearchHandle {
  focus: () => void
}

interface SearchResult {
  code: string
  name: string
  matchType: 'code' | 'name'
}

const StateSearch = forwardRef<StateSearchHandle, StateSearchProps>(
  function StateSearch({ lookupMaps, onSelectState, centroids }, ref) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Expose focus method to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus()
      },
    }))

    // Search logic
    useEffect(() => {
      if (!query.trim()) {
        setResults([])
        setIsOpen(false)
        return
      }

      const lowerQuery = query.toLowerCase()
      const matches: SearchResult[] = []

      // Search by code first (exact or prefix)
      lookupMaps.allCodes.forEach((code) => {
        if (code.toLowerCase().startsWith(lowerQuery)) {
          matches.push({
            code,
            name: lookupMaps.codeToName[code] || code,
            matchType: 'code',
          })
        }
      })

      // Search by name (contains)
      Object.entries(lookupMaps.nameToCode).forEach(([name, code]) => {
        if (
          name.includes(lowerQuery) &&
          !matches.some((m) => m.code === code)
        ) {
          matches.push({
            code,
            name: lookupMaps.codeToName[code] || name,
            matchType: 'name',
          })
        }
      })

      // Sort: exact code matches first, then by name
      matches.sort((a, b) => {
        if (a.matchType === 'code' && b.matchType !== 'code') return -1
        if (b.matchType === 'code' && a.matchType !== 'code') return 1
        return a.name.localeCompare(b.name)
      })

      setResults(matches.slice(0, 10))
      setIsOpen(matches.length > 0)
      setSelectedIndex(0)
    }, [query, lookupMaps])

    // Click outside to close
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (result: SearchResult) => {
      const centroid = centroids[result.code]
      if (centroid) {
        onSelectState(result.code, centroid.lat, centroid.lng)
      }
      setQuery('')
      setIsOpen(false)
      inputRef.current?.blur()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          inputRef.current?.blur()
          break
      }
    }

    const highlightMatch = (text: string) => {
      const lowerQuery = query.toLowerCase()
      const lowerText = text.toLowerCase()
      const index = lowerText.indexOf(lowerQuery)

      if (index === -1) return text

      return (
        <>
          {text.slice(0, index)}
          <span className="font-semibold text-blue-600">
            {text.slice(index, index + query.length)}
          </span>
          {text.slice(index + query.length)}
        </>
      )
    }

    return (
      <div ref={containerRef} className="relative">
        <div className="flex items-center bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <svg
            className="w-4 h-4 ml-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.trim() && results.length > 0 && setIsOpen(true)}
            placeholder="Search states... (press /)"
            className="w-48 px-2 py-2 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              className="px-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-50">
            {results.map((result, index) => (
              <button
                key={result.code}
                onClick={() => handleSelect(result)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                  index === selectedIndex
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-mono text-xs text-gray-500 w-8">
                  {result.code}
                </span>
                <span>{highlightMatch(result.name)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }
)

export default StateSearch
