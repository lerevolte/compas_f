const STORAGE_KEY = 'analytics_active_range'

export const readAnalyticsRange = () => {
    if (typeof window === 'undefined') return null
    try {
        const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null')
        if (!Array.isArray(stored) || stored.length < 2) return null
        return stored.every(day => /^\d{4}-\d{2}-\d{2}/.test(String(day))) ? stored : null
    } catch (e) {
        return null
    }
}

export const writeAnalyticsRange = (value) => {
    if (typeof window === 'undefined' || !Array.isArray(value) || value.length < 2) return
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch (e) {}
}
