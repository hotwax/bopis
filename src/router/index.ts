import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Login from '@/views/Login.vue'
import Settings from "@/views/Settings.vue"
import store from '@/store'
import Tabs from '@/views/Tabs.vue'
import OrderDetail from '@/views/OrderDetail.vue'


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
        path: 'more',
        component: () => import('@/views/More.vue')
      },
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    beforeEnter: loginGuard
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
    beforeEnter: authGuard
  },{
    path: "/orderdetail/:sku",
    name: "orderdetail",
    component: OrderDetail,
    beforeEnter: authGuard,
    props:true
    
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
