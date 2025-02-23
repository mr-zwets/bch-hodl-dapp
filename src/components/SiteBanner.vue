<template>
  <header style="margin-bottom: 25px">
    <div style="display: flex; align-items: center;" >
      <RouterLink class="siteName" to="/">
        <h1>BCH Hodl Dapp 💎</h1>
      </RouterLink>
      <div style="margin-left: 200px;">
        <nav style="display: flex; gap: 20px;">
          <RouterLink to="/">All Contracts</RouterLink>
          <RouterLink to="/my-contracts">User Contracts</RouterLink>
        </nav>
      </div>
    </div>
    <h3>Fully compatible with the Electron-Cash Plugin!</h3>
  </header>
</template>

<style scoped>
a {
  color: black;
  padding: 0;
}
</style>