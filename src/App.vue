<script setup lang="ts">
import SiteBanner from './components/SiteBanner.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <SiteBanner/>
  <main>
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </main>
</template>