export default defineNuxtPlugin(() => {
    // Ограничиваем зум ТОЛЬКО на мобильных (порог проекта 990px). На десктопе
    // масштабирование разрешено — pinch по тачпаду / ctrl+колесо (8660).
    // gesturestart/gesturechange в Safari срабатывают и на десктопном тачпаде,
    // поэтому вешаем их лишь на мобиле, иначе блокировали бы зум и на десктопе.
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 990px)').matches) return

    // В nuxt.config viewport оставлен без ограничений (чтобы десктоп мог зумить),
    // на мобиле возвращаем запрет зума через сам viewport.
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
