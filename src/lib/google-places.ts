// Google Places API types and utilities

export interface PlacePrediction {
  placeId: string
  mainText: string
  secondaryText: string
  fullText: string
  types: string[]
  matchedSubstrings: Array<{
    offset: number
    length: number
  }>
}

export interface LocationSearchResponse {
  success: boolean
  predictions: PlacePrediction[]
  error?: string
  cacheHit?: boolean
}

export interface GooglePlacesAutocompleteRequest {
  input: string
  componentRestrictions?: {
    country: string | string[]
  }
  types?: string[]
  sessionToken?: string
  language?: string
}

export interface GooglePlacesAutocompleteResponse {
  predictions: Array<{
    place_id: string
    main_text: string
    secondary_text: string
    description: string
    matched_substrings: Array<{
      offset: number
      length: number
    }>
    types: string[]
  }>
  status: string
}

// Constants
export const GOOGLE_PLACES_API_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json'

export const DEFAULT_COUNTRY = 'TR'
export const DEFAULT_TYPES = ['geocode', 'establishment']
export const DEFAULT_LANGUAGE = 'tr'

// Debounce delay in milliseconds
export const AUTOCOMPLETE_DEBOUNCE_MS = 400

// Min characters required before search
export const AUTOCOMPLETE_MIN_LENGTH = 2

// Max suggestions to show
export const AUTOCOMPLETE_MAX_SUGGESTIONS = 5

// Cache configuration
export const CACHE_TTL_SECONDS = 3600 // 1 hour
export const CACHE_MAX_SIZE = 1000

// Rate limiting configuration
export const RATE_LIMIT_REQUESTS = 60
export const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute

export function formatPlacePrediction(
  prediction: GooglePlacesAutocompleteResponse['predictions'][0]
): PlacePrediction {
  return {
    placeId: prediction.place_id,
    mainText: prediction.main_text,
    secondaryText: prediction.secondary_text,
    fullText: prediction.description,
    types: prediction.types,
    matchedSubstrings: prediction.matched_substrings || [],
  }
}
