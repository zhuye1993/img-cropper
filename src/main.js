import Vue from "vue";
import App from "./App.vue";
import ElementUI from "element-ui";
import "element-ui/lib/theme-chalk/index.css";
// import Imgpond from "./components/index";
// 图片预览
import "viewerjs/dist/viewer.css";
import VueViewer from "v-viewer";

Vue.use(ElementUI);
Vue.use(VueViewer);
// Vue.use(Imgpond);
Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount("#app");
