import { createRouter, createWebHistory } from 'vue-router'
import UserContractsView from '../views/UserContracts.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: UserContractsView,
      meta: {
        title: 'My Contracts | BCH Hodl Dapp',
      }
    },
  ]
})

export default router
