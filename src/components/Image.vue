<template>
  <img :src="imageUrl"/>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import logger from "@/logger";
import defaultImage from "@/assets/images/defaultImage.png"

const props = defineProps(['src'])

const resourceUrl = ref(process.env.VUE_APP_RESOURCE_URL || '')
const imageUrl = ref(defaultImage)

onMounted(() => {
  setImageUrl();
})

watch(() => props.src, () => {
  setImageUrl();
})

function checkIfImageExists(src: string) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function () {
      resolve(true);
    }
    img.onerror = function () {
      reject(false);
    }
    img.src = src;
  })
}

function setImageUrl() {
  if (props.src) {
    if (props.src.indexOf('assets/') != -1) {
      // Assign directly in case of assets
      imageUrl.value = props.src;
    } else if (props.src.startsWith('http')) {
      // If starts with http, it is web url check for existence and assign
      checkIfImageExists(props.src).then(() => {
        imageUrl.value = props.src;
      }).catch(() => {
        logger.error("Image doesn't exist");
      })
    } else {
      // Image is from resource server, hence append to base resource url, check for existence and assign
      const fullUrl = resourceUrl.value.concat(props.src)
      checkIfImageExists(fullUrl).then(() => {
        imageUrl.value = fullUrl;
      }).catch(() => {
        logger.error("Image doesn't exist");
      })
    }
  } else {
    imageUrl.value = require("@/assets/images/defaultImage.png")
  }
}
</script>
