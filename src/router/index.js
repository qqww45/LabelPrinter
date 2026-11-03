import { createRouter, createWebHistory } from 'vue-router'
import { readHasStoredProjects, resolveDefaultPath } from '../utils/routerEntry.js'

const HomeView = () => import('../views/HomeView.vue')
const TemplatesView = () => import('../views/TemplatesView.vue')
const HelpView = () => import('../views/HelpView.vue')
const EditorView = () => import('../views/EditorView.vue')

export function createAppRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/templates', name: 'templates', component: TemplatesView },
      { path: '/help', name: 'help', component: HelpView },
      { path: '/app', name: 'app', component: EditorView }
    ],
    scrollBehavior(to) {
      if (to.hash) {
        return { el: to.hash, behavior: 'smooth', top: 72 }
      }
      return { top: 0 }
    }
  })

  router.beforeEach((to, _from, next) => {
    const redirect = resolveDefaultPath({
      hasProjects: readHasStoredProjects(),
      path: to.path,
      query: to.query
    })
    if (redirect && redirect !== to.path) {
      next({ path: redirect, query: to.query, hash: to.hash, replace: true })
      return
    }
    next()
  })

  return router
}

export default createAppRouter
