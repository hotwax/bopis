import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Login from '@/views/Login.vue'
import store from '@/store'
import Tabs from '@/views/Tabs.vue'
import OrderDetail from '@/views/OrderDetail.vue'
import ProductDetail from '@/views/ProductDetail.vue'
import Shopify from '@/views/Shopify.vue'


const authGuard = (to: any, from: any, next: any) => {
  if (store.getters['user/isAuthenticated']) {
      next()
  } else {
    next("/login")
  }
};

const loginGuard = (to: any, from: any, next: any) => {
  if (!store.getters['user/isAuthenticated']) {
      next()
  } else {
    next("/")
  }
};

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/orders'
  },
  {
    path: '/tabs',
    component: Tabs,
    children: [
      {
        path: '',
        redirect: '/orders'
      },
      {
        path: 'orders',
        component: () => import('@/views/Orders.vue')
      },
      {
        path: 'catalog',
        component: () => import('@/views/Catalog.vue')
      },
       {
        path: 'settings',
        component: () => import('@/views/Settings.vue')
      },
    ],
    beforeEnter: authGuard
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    beforeEnter: loginGuard
  },
  {
    path: "/orderdetail/:orderId/:orderPartSeqId",
    name: "OrderDetail",
    component: OrderDetail,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: "/productdetail/:productId",
    name: "ProductDetail",
    component: ProductDetail,
    beforeEnter: authGuard,
    props: true
  },
  {
    path: '/shopify',
    name: 'Shopify',
    component: Shopify
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
