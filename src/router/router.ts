import { createRouter, createWebHistory } from 'vue-router'
import AllContractsView from '../views/AllContracts.vue'
import UserContractsView from '../views/UserContracts.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: AllContractsView,
      meta: {
        title: 'All Contracts | BCH Hodl Dapp',
      }
    },
    {
      path: '/my-contracts',
      name: 'my-contracts',
      component: UserContractsView,
      meta: {
        title: 'My Contracts | BCH Hodl Dapp',
      }
    },
  ]
})

export default router
