import { NextRequest, NextResponse } from 'next/server'
import { getAuthCookie, verifyToken } from '@/lib/auth'
import {
  GOOGLE_PLACES_API_URL,
  DEFAULT_COUNTRY,
  DEFAULT_TYPES,
  DEFAULT_LANGUAGE,
  AUTOCOMPLETE_MIN_LENGTH,
  AUTOCOMPLETE_MAX_SUGGESTIONS,
  CACHE_TTL_SECONDS,
  CACHE_MAX_SIZE,
  RATE_LIMIT_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  formatPlacePrediction,
  LocationSearchResponse,
} from '@/lib/google-places'

// Simple in-memory cache
const searchCache = new Map<string, {
  results: any[]
  timestamp: number
}>()

// Rate limiting store: userId -> { count, resetTime }
const rateLimitStore = new Map<string, {
  count: number
  resetTime: number
}>()

// Helper: Clean expired cache entries
function cleanExpiredCache() {
  const now = Date.now() / 1000
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_SECONDS) {
      searchCache.delete(key)
    }
  }
  // Also clean if cache size exceeds max
  if (searchCache.size > CACHE_MAX_SIZE) {
    const entriesToDelete = searchCache.size - CACHE_MAX_SIZE
    let deleted = 0
    for (const [key] of searchCache.entries()) {
      if (deleted >= entriesToDelete) break
      searchCache.delete(key)
      deleted++
    }
  }
}

// Helper: Check rate limit
function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(userId)

  if (!record || now > record.resetTime) {
    // New window
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    })
    return true
  }

  if (record.count >= RATE_LIMIT_REQUESTS) {
    return false
  }

  record.count++
  return true
}

// Helper: Create cache key
function getCacheKey(query: string, types?: string[], countryCodes?: string[]): string {
  const typeStr = types?.sort().join(',') || DEFAULT_TYPES.join(',')
  const countryStr = countryCodes?.sort().join(',') || DEFAULT_COUNTRY
  return `${query.toLowerCase()}|${typeStr}|${countryStr}`
}

export async function GET(request: NextRequest) {
  try {
    // 1. Check authentication
    const token = await getAuthCookie()
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // 2. Check rate limit
    if (!checkRateLimit(payload.userId)) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait before searching again.' },
        { status: 429 }
      )
    }

    // 3. Validate and get query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const typesParam = searchParams.get('types')
    const countriesParam = searchParams.get('countryCodes')

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    if (query.length < AUTOCOMPLETE_MIN_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Minimum ${AUTOCOMPLETE_MIN_LENGTH} characters required` },
        { status: 400 }
      )
    }

    const types = typesParam?.split(',').filter(t => t.trim()) || DEFAULT_TYPES
    const countryCodes = countriesParam?.split(',').filter(c => c.trim()) || [DEFAULT_COUNTRY]

    // 4. Check cache
    cleanExpiredCache()
    const cacheKey = getCacheKey(query, types, countryCodes)
    const cached = searchCache.get(cacheKey)

    if (cached) {
      return NextResponse.json({
        success: true,
        predictions: cached.results,
        cacheHit: true,
      })
    }

    // 5. Call Google Places API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      console.error('Google Places API key not configured')
      return NextResponse.json(
        { success: false, error: 'Location search is not configured' },
        { status: 500 }
      )
    }

    const params = new URLSearchParams({
      input: query,
      key: apiKey,
      language: DEFAULT_LANGUAGE,
      components: `country:${countryCodes.join('|')}`,
      ...(types.length > 0 && { types: types.join('|') }),
    })

    const apiUrl = `${GOOGLE_PLACES_API_URL}?${params.toString()}`
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Google Places API error:', response.status, response.statusText)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API status:', data.status)
      return NextResponse.json(
        { success: false, error: 'Failed to search locations' },
        { status: 500 }
      )
    }

    // 6. Format results
    const predictions = (data.predictions || [])
      .slice(0, AUTOCOMPLETE_MAX_SUGGESTIONS)
      .map(formatPlacePrediction)

    // 7. Cache the result
    searchCache.set(cacheKey, {
      results: predictions,
      timestamp: Date.now() / 1000,
    })

    return NextResponse.json({
      success: true,
      predictions,
    } as LocationSearchResponse)
  } catch (error) {
    console.error('Location search error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred while searching' },
      { status: 500 }
    )
  }
}
