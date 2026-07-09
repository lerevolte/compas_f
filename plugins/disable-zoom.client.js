export default defineNuxtPlugin(() => {
    if (typeof window === 'undefined') return
    if (!window.matchMedia('(hover: none) and (pointer: coarse)').matches) return

    const vp = document.querySelector('meta[name="viewport"]')
    if (vp) {
        vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    }

    document.addEventListener('gesturestart', e => e.preventDefault())
    document.addEventListener('gesturechange', e => e.preventDefault())
    document.addEventListener('gestureend', e => e.preventDefault())

    document.addEventListener('touchmove', e => {
        if (e.scale !== undefined && e.scale !== 1 && !e.target.closest('.leaflet-container')) {
            e.preventDefault()
        }
    }, { passive: false })
})
