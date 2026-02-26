import { defineStore } from 'pinia'
import { ProductService } from "@/services/ProductService";
import { showToast } from '@/utils'
import { hasError } from '@/adapter'
import { translate } from '@hotwax/dxp-components'
import emitter from '@/event-bus'
import logger from "@/logger";

export const useProductStore = defineStore('product', {
  state: () => ({
    current: {} as any,
    cached: {} as any,
    products: {
      list: [] as any,
      total: 0,
      queryString: ''
    }
  }),
  getters: {
    getCurrent: (state) => state.current,
    getProduct: (state) => (productId: string) => state.cached[productId] ? state.cached[productId] : {},
    getProducts: (state) => state.products,
    isScrollable: (state) => state.products.list.length > 0 && state.products.list.length < state.products.total,
    getQueryString: (state) => state.products.queryString
  },
  actions: {
    async fetchProducts({ productIds }: { productIds: any }) {
      const cachedProductIds = Object.keys(this.cached);
      const productIdFilter = productIds.reduce((filter: string, productId: any) => {
        if (cachedProductIds.includes(productId)) {
          return filter;
        } else {
          if (filter !== '') filter += ' OR '
          return filter += productId;
        }
      }, '');

      if (productIdFilter === '') return;

      const resp = await ProductService.fetchProducts({
        "filters": ['productId: (' + productIdFilter + ')'],
        "viewSize": productIds.length
      })
      if (resp.status === 200 && resp.data.response && !hasError(resp)) {
        const products = resp.data.response.docs;
        if (resp.data) {
          products.forEach((product: any) => {
            this.cached[product.productId] = product
          });
        }
      } else {
        logger.error('Something went wrong')
      }
      return resp;
    },
    async findProduct(payload: any) {
      if (payload.viewIndex === 0) emitter.emit("presentLoader");
      let resp;
      try {
        resp = await ProductService.findProducts({
          "viewSize": payload.viewSize,
          "viewIndex": payload.viewIndex,
          "keyword": payload.queryString,
          "filters": ['isVirtual: true', 'isVariant: false'],
        })
        if (resp.status === 200 && !hasError(resp) && resp.data.response?.numFound) {
          let products = resp.data.response.docs;
          const total = resp.data.response?.numFound;
          if (payload.viewIndex && payload.viewIndex > 0) products = this.products.list.concat(products)
          this.products = {
            list: products,
            total: total,
            queryString: payload.queryString
          }
        } else {
          this.products = {
            list: [],
            total: 0,
            queryString: payload.queryString
          }
          showToast(translate("Products not found"));
        }
      } catch (error) {
        logger.error(error)
        this.products = {
          list: [],
          total: 0,
          queryString: ''
        }
        showToast(translate("Something went wrong"));
      }
      if (payload.viewIndex === 0) emitter.emit("dismissLoader");
      return resp;
    },
    addProductToCache(payload: any) {
      if (!this.cached[payload.productId]) {
        this.cached[payload.productId] = payload
      }
    },
    async setCurrent(payload: any) {
      let product = this.cached[payload.productId] ? JSON.parse(JSON.stringify(this.cached[payload.productId])) : {}
      const isProductCached = Object.keys(product).length;
      if (isProductCached && product.variants?.length) {
        this.current = product;
        return;
      }

      emitter.emit("presentLoader");
      let resp;
      let productFilterCondition: any = `groupId: ${payload.productId}`;
      if (!isProductCached) productFilterCondition = `${productFilterCondition} OR productId: ${payload.productId}`;
      try {
        resp = await ProductService.findProducts({
          "filters": [productFilterCondition],
          "viewSize": 50,
        })
        if (resp.status === 200 && !hasError(resp) && resp.data.response?.numFound) {
          let variants = resp.data.response.docs;
          if (!isProductCached) {
            product = resp.data.response.docs.find((product: any) => product.productId === payload.productId);
            variants = resp.data.response.docs.filter((product: any) => product.productId !== payload.productId);
          }
          product['variants'] = variants;
          this.current = product;
          this.cached[product.productId] = product;
        } else {
          showToast(translate("Product not found"));
        }
      } catch (error) {
        logger.error(error)
        showToast(translate("Something went wrong"));
      }
      emitter.emit("dismissLoader");
      return resp;
    },
    clearProducts() {
      this.products = {
        list: [],
        total: 0,
        queryString: ''
      }
    },
    async fetchProductComponents({ productId }: { productId: any }) {
      if (productId === '') return;

      const cachedProductIds = Object.keys(this.cached);
      if (!cachedProductIds.includes(productId)) {
        await this.fetchProducts({ productIds: [productId] })
      }
      const product = this.cached[productId]
      if (product.productComponents && product.productComponents.length > 0) {
        return;
      }

      let resp;
      try {
        resp = await ProductService.fetchProductComponents({
          "entityName": "ProductAssoc",
          "inputFields": {
            "productId": productId,
            "productTypeId": "PRODUCT_COMPONENT"
          },
          "fieldList": ["productId", "productIdTo", "productAssocTypeId"],
          "viewIndex": 0,
          "viewSize": 250,
          "distinct": "Y",
          "noConditionFind": "Y",
          "filterByDate": "Y"
        })
        if (!hasError(resp)) {
          const productComponents = resp.data.docs;
          const componentProductIds = productComponents.map((productComponent: any) => productComponent.productIdTo);
          await this.fetchProducts({ productIds: componentProductIds })

          product["productComponents"] = productComponents;
          this.cached[product.productId] = product;
        } else {
          throw resp.data
        }
      } catch (err) {
        logger.error('Failed to fetch product components information', err)
      }
      return resp;
    }
  },
  persist: true
})
