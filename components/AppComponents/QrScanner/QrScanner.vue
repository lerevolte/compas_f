<template>
    <button class="qr-scan__button" type="button" title="Сканировать QR-код" @click="open">
        <span class="icon-action">
            <IconQrScan />
        </span>
    </button>

    <teleport to="#menu__overlay" v-if="scanner.state">
        <dialog class="modal modal_warning qr-scan__modal" open>
            <div class="modal__background" @click="close"></div>
            <div class="modal__content">
                <IconClose class="modal__close" @click="close" />
                <AppH2>Сканирование QR-кода</AppH2>
                <div class="qr-scan__video-wrap">
                    <video ref="videoRef" class="qr-scan__video" autoplay playsinline muted></video>
                    <div class="qr-scan__frame"></div>
                </div>
                <p class="qr-scan__hint" v-if="!scanner.error">Наведите камеру на QR-код объекта</p>
                <p class="qr-scan__error" v-else>{{ scanner.error }}</p>
            </div>
        </dialog>
    </teleport>
</template>

<script setup>
    import './QrScanner.scss'

    import IconQrScan from '@AppIcons/QrScan.vue'
    import IconClose from '@AppIcons/Close.vue'
    import AppH2 from '@AppComponents/Headers/H2/H2.vue'

    const videoRef = ref(null)
    const scanner = ref({
        state: false,
        error: null
    })

    let stream = null
    let rafId = null
    let stopped = true
    let lastErrorAt = 0

    const open = async () => {
        scanner.value = { state: true, error: null }
        stopped = false
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            })
        } catch (e) {
            scanner.value.error = 'Не удалось получить доступ к камере. Разрешите доступ в настройках браузера.'
            return
        }
        if (stopped) {
            stream.getTracks().forEach(track => track.stop())
            stream = null
            return
        }
        await nextTick()
        const video = videoRef.value
        if (!video) return
        video.srcObject = stream
        try {
            await video.play()
        } catch (e) {}

        let jsQR = null
        try {
            jsQR = (await import('jsqr')).default
        } catch (e) {
            scanner.value.error = 'Не удалось загрузить модуль сканирования'
            return
        }

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })

        const tick = () => {
            if (stopped) return
            if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                context.drawImage(video, 0, 0, canvas.width, canvas.height)
                const image = context.getImageData(0, 0, canvas.width, canvas.height)
                const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })
                if (code && code.data && handleResult(code.data)) {
                    return
                }
            }
            rafId = requestAnimationFrame(tick)
        }
        rafId = requestAnimationFrame(tick)
    }

    const handleResult = (text) => {
        let url = null
        try {
            url = new URL(text)
        } catch (e) {}
        if (url && url.origin === window.location.origin) {
            close()
            window.location.href = url.href
            return true
        }
        const now = Date.now()
        if (now - lastErrorAt > 1500) {
            lastErrorAt = now
            scanner.value.error = 'QR-код не распознан как ссылка портала'
            setTimeout(() => {
                if (!stopped) {
                    scanner.value.error = null
                }
            }, 2000)
        }
        return false
    }

    const close = () => {
        stopped = true
        if (rafId) {
            cancelAnimationFrame(rafId)
            rafId = null
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            stream = null
        }
        scanner.value.state = false
    }

    onUnmounted(close)
</script>
