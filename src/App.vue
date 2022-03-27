<template>
  <div id="app">
    <el-dialog
      visible
      :close-on-click-modal="false"
      :show-close="false"
      title="Imgpond"
    >
      <Imgpond />
    </el-dialog>
  </div>
</template>
<script>
import Imgpond from "./components/Imgpond.vue";
export default {
  components: {
    Imgpond,
  },
};
</script>
<style lang="css" scoped>
::v-deep .el-dialog {
  min-width: 600px;
}
</style>
