import { defineStore } from 'pinia'
import { api, commonUtil, emitter, logger, translate, useSolrSearch } from '@common'

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
      const filteredProductIds = productIds.filter(
        (productId: any) => !cachedProductIds.includes(productId)
      );

      if (filteredProductIds.length === 0) return;

      const resp = await useSolrSearch().searchProducts({
        filters: {
          productId: { value: filteredProductIds }
        },
        viewSize: filteredProductIds.length
      })

      if (resp.products.length) {
        resp.products.forEach((product: any) => {
          this.cached[product.productId] = product
        });
      } else {
        logger.error('Something went wrong')
      }
      return resp;
    },
    async findProduct(payload: any) {
      if (payload.viewIndex === 0) emitter.emit("presentLoader");
      let resp;
      try {
        resp = await useSolrSearch().searchProducts({
          filters: {
            isVirtual: { value: 'true' },
            isVariant: { value: 'false' }
          },
          viewSize: payload.viewSize,
          viewIndex: payload.viewIndex,
          keyword: payload.queryString,
        })

        if (resp.products.length) {
          let products = resp.products;
          const total = resp.total;
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
          commonUtil.showToast(translate("Products not found"));
        }
      } catch (error) {
        logger.error(error)
        this.products = {
          list: [],
          total: 0,
          queryString: ''
        }
        commonUtil.showToast(translate("Something went wrong"));
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
      try {
        resp = await useSolrSearch().searchProducts({
          filters: {
            groupId: { value: payload.productId }
          },
          viewSize: 50,
        })

        if (resp.products.length) {
          let variants = resp.products;
          if (!isProductCached) {
            product = resp.products.find((product: any) => product.productId === payload.productId);
            variants = resp.products.filter((product: any) => product.productId !== payload.productId);
          }
          product['variants'] = variants;
          this.current = product;
          this.cached[product.productId] = product;
        } else {
          commonUtil.showToast(translate("Product not found"));
        }
      } catch (error) {
        logger.error(error)
        commonUtil.showToast(translate("Something went wrong"));
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
        resp = await api({
          url: `/oms/dataDocumentView`,
          method: "post",
          data: {
            customParametersMap: {
              productId,
              pageIndex: 0,
              pageSize: 100
            },
            dataDocumentId: "ProductComponent",
            filterByDate: true
          }
        })
        if (!commonUtil.hasError(resp)) {
          const productComponents = resp.data.entityValueList
          const componentProductIds = productComponents.map((productComponent: any) => productComponent.productIdTo)
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
