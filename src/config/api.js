/**
 * API Configuration
 * Handles environment-based backend URLs for deployment.
 */

// Use VITE_API_BASE_URL if set, otherwise fallback to localhost for development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
