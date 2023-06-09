import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Login from '@/views/Login.vue'
import store from '@/store'
import Tabs from '@/views/Tabs.vue'
import OrderDetail from '@/views/OrderDetail.vue'
import ProductDetail from '@/views/ProductDetail.vue'
import Shopify from '@/views/Shopify.vue'

import { hasPermission } from '@/authorization';
import { showToast } from '@/utils'
import { translate } from '@/i18n'

import 'vue-router'

// Defining types for the meta values
declare module 'vue-router' {
  interface RouteMeta {
    permissionId?: string;
  }
}


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
        component: () => import('@/views/Orders.vue'),
        meta: {
          permissionId: "APP_ORDERS_VIEW"
        }
      },
      {
        path: 'catalog',
        component: () => import('@/views/Catalog.vue'),
        meta: {
          permissionId: "APP_CATALOG_VIEW"
        }
      },
       {
        path: 'settings',
        component: () => import('@/views/Settings.vue')
      },
      {
        path: 'ship-to-store-orders',
        component: () => import('@/views/ShipToStoreOrders.vue')
      },
    ],
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
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
    props: true,
    meta: {
      permissionId: "APP_ORDER_DETAIL_VIEW"
    }
  },
  {
    path: "/product-detail/:productId",
    name: "ProductDetail",
    component: ProductDetail,
    beforeEnter: authGuard,
    meta: {
      permissionId: "APP_PRODUCT_DETAIL_VIEW"
    }
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

router.beforeEach((to, from) => {
  if (to.meta.permissionId && !hasPermission(to.meta.permissionId)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/tabs/settings";
    else {
      showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }
})

export default router
