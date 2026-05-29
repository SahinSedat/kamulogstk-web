import { useState, useCallback, useEffect, useRef } from 'react'
import { PlacePrediction, AUTOCOMPLETE_DEBOUNCE_MS, AUTOCOMPLETE_MIN_LENGTH } from '@/lib/google-places'
import { debounce } from '@/lib/utils'

interface UseLocationAutocompleteOptions {
  debounceMs?: number
  countryCodes?: string[]
  types?: string[]
}

export function useLocationAutocomplete(
  initialQuery: string = '',
  options: UseLocationAutocompleteOptions = {}
) {
  const {
    debounceMs = AUTOCOMPLETE_DEBOUNCE_MS,
    countryCodes,
    types,
  } = options

  const [query, setQuery] = useState(initialQuery)
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // Cache for recent searches
  const cacheRef = useRef<Map<string, PlacePrediction[]>>(new Map())

  // Debounced search function
  const performSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < AUTOCOMPLETE_MIN_LENGTH) {
        setSuggestions([])
        setError(null)
        setIsOpen(false)
        return
      }

      // Check cache first
      if (cacheRef.current.has(searchQuery)) {
        setSuggestions(cacheRef.current.get(searchQuery) || [])
        setError(null)
        setIsOpen(true)
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          q: searchQuery,
          ...(countryCodes && { countryCodes: countryCodes.join(',') }),
          ...(types && { types: types.join(',') }),
        })

        const response = await fetch(`/api/locations/search?${params.toString()}`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          setError(data.error || 'Arama yapılırken hata oluştu')
          setSuggestions([])
          setIsOpen(false)
          setLoading(false)
          return
        }

        const results = data.predictions || []

        // Cache the results
        cacheRef.current.set(searchQuery, results)

        // Keep cache size reasonable (max 20 queries)
        if (cacheRef.current.size > 20) {
          const firstKey = cacheRef.current.keys().next().value
          if (firstKey) {
            cacheRef.current.delete(firstKey)
          }
        }

        setSuggestions(results)
        setError(null)
        setIsOpen(results.length > 0)
        setSelectedIndex(-1)
      } catch (err) {
        console.error('Autocomplete search error:', err)
        setError('Arama yapılırken hata oluştu')
        setSuggestions([])
        setIsOpen(false)
      } finally {
        setLoading(false)
      }
    }, debounceMs),
    [countryCodes, types, debounceMs]
  )

  // Handle query change
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery)
    setSelectedIndex(-1)

    if (!newQuery.trim()) {
      setSuggestions([])
      setIsOpen(false)
      setError(null)
      return
    }

    performSearch(newQuery.trim())
  }, [performSearch])

  // Handle suggestion selection
  const selectSuggestion = useCallback((prediction: PlacePrediction) => {
    setQuery(prediction.fullText)
    setSuggestions([])
    setIsOpen(false)
    setSelectedIndex(-1)
    return prediction
  }, [])

  // Handle keyboard navigation
  const moveSelection = useCallback((direction: 'up' | 'down') => {
    setSelectedIndex((prevIndex) => {
      let newIndex = prevIndex
      if (direction === 'down') {
        newIndex = prevIndex < suggestions.length - 1 ? prevIndex + 1 : prevIndex
      } else {
        newIndex = prevIndex > 0 ? prevIndex - 1 : -1
      }
      return newIndex
    })
  }, [suggestions.length])

  // Get selected suggestion
  const getSelectedSuggestion = useCallback((): PlacePrediction | null => {
    if (selectedIndex < 0 || selectedIndex >= suggestions.length) {
      return null
    }
    return suggestions[selectedIndex]
  }, [selectedIndex, suggestions])

  // Open dropdown
  const openDropdown = useCallback(() => {
    if (query.length >= AUTOCOMPLETE_MIN_LENGTH && suggestions.length > 0) {
      setIsOpen(true)
    }
  }, [query, suggestions])

  // Close dropdown
  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setSelectedIndex(-1)
  }, [])

  // Clear input
  const clear = useCallback(() => {
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
    setError(null)
    setSelectedIndex(-1)
  }, [])

  return {
    query,
    setQuery: handleQueryChange,
    suggestions,
    loading,
    error,
    isOpen,
    openDropdown,
    closeDropdown,
    selectedIndex,
    moveSelection,
    selectSuggestion,
    getSelectedSuggestion,
    clear,
  }
}
