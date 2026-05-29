/** 应用入口：挂载 Vue、Pinia、路由、Element Plus 全局组件 */
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'

import 'element-plus/theme-chalk/src/index.scss'

const app = createApp(App)

app.use(createPinia())
app.use(ElementPlus)
app.use(router)

app.mount('#app')
