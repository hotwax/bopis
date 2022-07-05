<template>
  <ion-page>
    {{productDetail}}
  </ion-page>
</template>

<script lang="ts">
import { IonPage } from "@ionic/vue"
import { defineComponent } from 'vue'
import { mapGetters, useStore } from "vuex"
export default defineComponent({
  name: "ProductDetail",
  components: {
    IonPage
  },
  data() {
    return {
      productDetail: {}
    }
  },
  computed: {
    ...mapGetters({
      getProduct: 'product/getProduct'
    })
  },
  methods: {
    async getProductDetail(productId: any) {
      await this.store.dispatch('product/fetchProduct', productId)
      .then(() => { 
        this.productDetail = this.getProduct(this.$route.params.productId)
      })
    }
  },
  mounted() {
    this.getProductDetail(this.$route.params)
  },
  setup() {
    const store = useStore();
    
    return {
      store
    }
  }
})
</script>

<style scoped>
</style> 