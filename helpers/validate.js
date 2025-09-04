export default {
    // Проверка текста
    checkEmptyValue(value) {
        return value != null && value != undefined && value.length > 0
    },

    // Проверка на соответствие маске
    checkMask(value, mask) {
        return mask.test(value)
    },

    // Проверка почты
    checkMail(value) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return this.checkMask(value, emailRegex)
    },

    // Проверка телефона
    checkPhone(value) {
        const phoneRegex = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
        return this.checkMask(value, phoneRegex)
    }
}