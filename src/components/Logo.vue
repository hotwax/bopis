<template>
  <figure>
    <img class="light" src="../assets/images/LogoLight.png"/>
    <img class="dark" src="../assets/images/LogoDark.png"/>
  </figure>
</template>

<script setup lang="ts">
</script>

<style scoped>
.dark {
  display: none;
}

@media (prefers-color-scheme: dark) {
  .dark {
    display: unset;
  }
  
  .light {
    display: none;
  }
}
</style>