import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import Tabs from '@/views/Tabs.vue'
import OrderDetail from '@/views/OrderDetail.vue'
import ProductDetail from '@/views/ProductDetail.vue'
import ShipToStoreOrders from '@/views/ShipToStoreOrders.vue'
import Notifications from '@/views/Notifications.vue'

import { translate, commonUtil, ShopifyLogin, ShopifyAppInstall, Login } from '@common'
import { useAuth } from "@common/composables/useAuth";
import { useUserStore } from '@/store/user'
import { versionInfoUtil } from '@common/utils/versionInfoUtil'

const authGuard = async (to: any, from: any, next: any) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated.value) {
    if (commonUtil.isAppEmbedded()) {
      next('/shopify-login')
    } else {
      next('/login');
    }
  } else {
    next()
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
          permissionId: ""
        }
      },
      {
        path: 'catalog',
        component: () => import('@/views/Catalog.vue'),
        meta: {
          permissionId: ""
        }
      },
      {
        path: 'settings',
        component: () => import('@/views/Settings.vue')
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
    component: Login
  },
  {
    path: "/orderdetail/:orderType/:orderId/:shipGroupSeqId",
    name: "OrderDetail",
    component: OrderDetail,
    beforeEnter: authGuard,
    props: true,
    meta: {
      permissionId: ""
    }
  },
  {
    path: "/product-detail/:productId",
    name: "ProductDetail",
    component: ProductDetail,
    beforeEnter: authGuard,
    meta: {
      permissionId: ""
    }
  },
  {
    path: '/ship-to-store-orders',
    name: "ShipToStoreOrders",
    component: ShipToStoreOrders,
    beforeEnter: authGuard,
  },
  {
    path: '/notifications',
    name: "Notifications",
    component: Notifications,
    beforeEnter: authGuard,
  },
  {
    path: '/shopify-app-install',
    name: 'ShopifyAppInstall',
    component: ShopifyAppInstall
  },
  {
    path: '/shopify-login',
    name: 'ShopifyLogin',
    component: ShopifyLogin
  },
]

const appVersion = window.location.pathname.split('/').slice(0, 2)[1];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routes as any
})

router.beforeEach((to, from) => {
  console.log('appVersion.split(".")', appVersion.split("."))
  if(appVersion.split(".")?.length === 3) {
    if(useUserStore().appVersion && useUserStore().appVersion !== appVersion) {
      console.log('replacing app version')
      window.location.replace(window.location.pathname.replace(appVersion, useUserStore().appVersion))
    } else if(appVersion) {
      console.log('updated versions', appVersion)
      useUserStore().updateAppVersion(appVersion)
    }
  }

  if (to.meta.permissionId && !useUserStore().hasPermission(to.meta.permissionId as any)) {
    let redirectToPath = from.path;
    // If the user has navigated from Login page or if it is page load, redirect user to settings page without showing any toast
    if (redirectToPath == "/login" || redirectToPath == "/") redirectToPath = "/tabs/settings";
    else {
      commonUtil.showToast(translate('You do not have permission to access this page'));
    }
    return {
      path: redirectToPath,
    }
  }
})

export default router
