'use client'

import { useRef, useEffect, forwardRef } from 'react'
import { X, Loader2, AlertCircle, MapPin } from 'lucide-react'
import { useLocationAutocomplete } from '@/hooks/useLocationAutocomplete'
import { PlacePrediction } from '@/lib/google-places'

interface LocationAutocompleteProps {
  value: string
  onChange: (location: string, placeId?: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  countryCodes?: string[]
  types?: string[]
}

export const LocationAutocomplete = forwardRef<
  HTMLInputElement,
  LocationAutocompleteProps
>(
  (
    {
      value,
      onChange,
      placeholder = 'Şehir, İlçe, Dernek Merkezi vb.',
      error,
      disabled = false,
      countryCodes = ['TR'],
      types = ['geocode', 'establishment'],
    },
    ref
  ) => {
    const {
      query,
      setQuery,
      suggestions,
      loading,
      error: searchError,
      isOpen,
      openDropdown,
      closeDropdown,
      selectedIndex,
      moveSelection,
      selectSuggestion,
      getSelectedSuggestion,
      clear,
    } = useLocationAutocomplete(value, { countryCodes, types })

    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Use external ref if provided
    useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(inputRef.current)
        } else {
          ref.current = inputRef.current
        }
      }
    }, [ref])

    // Handle outside clicks
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current &&
          !inputRef.current.contains(event.target as Node)
        ) {
          closeDropdown()
        }
      }

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
          document.removeEventListener('mousedown', handleClickOutside)
        }
      }
    }, [isOpen, closeDropdown])

    // Handle keyboard events
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' && query.length > 0) {
          e.preventDefault()
          openDropdown()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          moveSelection('down')
          break
        case 'ArrowUp':
          e.preventDefault()
          moveSelection('up')
          break
        case 'Enter':
          e.preventDefault()
          const selected = getSelectedSuggestion()
          if (selected) {
            handleSelectSuggestion(selected)
          }
          break
        case 'Escape':
          e.preventDefault()
          closeDropdown()
          break
        default:
          break
      }
    }

    const handleSelectSuggestion = (prediction: PlacePrediction) => {
      selectSuggestion(prediction)
      onChange(prediction.fullText, prediction.placeId)
      closeDropdown()
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
    }

    const handleClear = () => {
      clear()
      onChange('')
    }

    const handleFocus = () => {
      if (query.length > 0 && suggestions.length > 0) {
        openDropdown()
      }
    }

    // Highlight matching text in suggestions
    const highlightMatch = (text: string, matches: Array<{ offset: number; length: number }>) => {
      if (!matches || matches.length === 0) {
        return <span>{text}</span>
      }

      let lastIndex = 0
      const parts: React.ReactNode[] = []

      matches.forEach((match) => {
        if (match.offset > lastIndex) {
          parts.push(text.substring(lastIndex, match.offset))
        }
        parts.push(
          <span key={match.offset} className="font-semibold text-emerald-600 dark:text-emerald-400">
            {text.substring(match.offset, match.offset + match.length)}
          </span>
        )
        lastIndex = match.offset + match.length
      })

      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex))
      }

      return <>{parts}</>
    }

    const displayError = error || searchError

    return (
      <div className="relative w-full">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Toplantı Yeri
        </label>

        <div className="relative">
          {/* Input field */}
          <div
            className={`relative flex items-center px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 transition-colors ${
              displayError
                ? 'border-red-500 dark:border-red-500'
                : 'border-slate-300 dark:border-slate-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 mr-2" />

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              className="flex-1 bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
              aria-label="Toplantı Yeri"
              aria-describedby={displayError ? 'location-error' : undefined}
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls="location-dropdown"
            />

            {loading && (
              <Loader2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-spin" />
            )}

            {query && !loading && (
              <button
                type="button"
                onClick={handleClear}
                disabled={disabled}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded transition-colors"
                aria-label="Clear"
              >
                <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </button>
            )}
          </div>

          {/* Error message */}
          {displayError && (
            <div
              id="location-error"
              className="mt-1 flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
            >
              <AlertCircle className="w-4 h-4" />
              {displayError}
            </div>
          )}

          {/* Dropdown */}
          {isOpen && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              id="location-dropdown"
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto"
              role="listbox"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  onClick={() => handleSelectSuggestion(suggestion)}
                  onMouseEnter={() => {
                    // Visual feedback on hover would go here
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-slate-200 dark:border-slate-600 last:border-b-0 transition-colors ${
                    index === selectedIndex
                      ? 'bg-emerald-50 dark:bg-emerald-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-white text-sm">
                        {highlightMatch(suggestion.mainText, suggestion.matchedSubstrings)}
                      </div>
                      {suggestion.secondaryText && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {suggestion.secondaryText}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {isOpen && !loading && suggestions.length === 0 && query.length >= 2 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-50 px-4 py-3 text-center"
            >
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sonuç bulunamadı
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }
)

LocationAutocomplete.displayName = 'LocationAutocomplete'
