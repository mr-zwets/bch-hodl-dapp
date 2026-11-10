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
  <footer class="siteFooter">
    <div>
      Interoperable with the
      <a href="https://github.com/mainnet-pat/hodl_ec_plugin" target="_blank" rel="noopener">Electron Cash HODL plugin</a>
    </div>
    <div>
      <a href="https://github.com/mr-zwets/bch-hodl-dapp" target="_blank" rel="noopener">Source code on GitHub</a>
    </div>
  </footer>
</template>

<style scoped>
.siteFooter {
  margin-top: 60px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px 30px;
  font-size: 14px;
}
</style>