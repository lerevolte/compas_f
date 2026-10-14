const KEYS = ['userStore', 'menuStore']

export default defineNuxtPlugin(() => {
    if (typeof window === 'undefined') return

    const cookies = Object.fromEntries(
        document.cookie.split(';').map(part => {
            const [name, ...rest] = part.trim().split('=')
            return [name, rest.join('=')]
        })
    )

    for (const key of KEYS) {
        const raw = cookies[key]
        if (raw === undefined) continue

        try {
            if (!window.localStorage.getItem(key)) {
                const value = decodeURIComponent(raw)
                JSON.parse(value)
                window.localStorage.setItem(key, value)
            }
        } catch (e) {}

        document.cookie = `${key}=; Max-Age=0; path=/`
        document.cookie = `${key}=; Max-Age=0; path=/; domain=${location.hostname}`
    }
})
