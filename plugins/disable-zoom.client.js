export default defineNuxtPlugin(() => {
    document.addEventListener('gesturestart', e => e.preventDefault())
    document.addEventListener('gesturechange', e => e.preventDefault())
    document.addEventListener('gestureend', e => e.preventDefault())

    document.addEventListener('touchmove', e => {
        if (e.scale !== undefined && e.scale !== 1 && !e.target.closest('.leaflet-container')) {
            e.preventDefault()
        }
    }, { passive: false })
})
