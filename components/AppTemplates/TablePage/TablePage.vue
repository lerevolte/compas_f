<template>
    <AppVirtualTable :items="dataJSON" rowKey="id" />
</template>

<script setup>
    import AppVirtualTable from '@AppComponents/VirtualTable/VirtualTable.vue';
    
    // Тестовые данные (ты подставишь свой JSON)
    const dataJSON = Array.from({ length: 100 }, (_, rowIndex) => ({
        id: rowIndex + 1,
        name: rowIndex % 3 === 0
            ? `Очень длинное имя для строки ${rowIndex + 1}, которое займёт несколько строк и будет растягивать высоту`
            : `Имя ${rowIndex + 1}`,
        age: 20 + (rowIndex % 50),
        active: true,
        city: `Город ${rowIndex + 1}`
    }))
</script>
