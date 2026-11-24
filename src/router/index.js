import { createRouter, createWebHistory } from 'vue-router'
import { readHasStoredProjects, resolveDefaultPath } from '../utils/routerEntry.js'
import { applyRouteSiteMeta } from '../utils/siteMeta.js'
import { TEMPLATE_SCENE_SLUGS } from '../content/templateSceneSeo.js'

const HomeView = () => import('../views/HomeView.vue')
const TemplatesView = () => import('../views/TemplatesView.vue')
const HelpView = () => import('../views/HelpView.vue')
const EditorView = () => import('../views/EditorView.vue')
const SeoStaticView = () => import('../views/SeoStaticView.vue')
const NotFoundView = () => import('../views/NotFoundView.vue')

export function createAppRouter() {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      { path: '/en', name: 'en', component: SeoStaticView },
      {
        path: '/templates/:sceneSlug',
        name: 'template-scene',
        component: SeoStaticView,
        beforeEnter: (to) => {
          if (!TEMPLATE_SCENE_SLUGS.includes(String(to.params.sceneSlug))) {
            return { name: 'not-found' }
          }
        }
      },
      { path: '/templates', name: 'templates', component: TemplatesView },
      { path: '/help', name: 'help', component: HelpView },
      { path: '/help/excel-import', name: 'help-excel', component: SeoStaticView },
      { path: '/help/barcodes', name: 'help-barcodes', component: SeoStaticView },
      { path: '/help/ai-layout', name: 'help-ai', component: SeoStaticView },
      { path: '/help/pdf-export', name: 'help-pdf', component: SeoStaticView },
      { path: '/help/local-storage', name: 'help-storage', component: SeoStaticView },
      { path: '/help/field-mapping', name: 'help-field-map', component: SeoStaticView },
      { path: '/help/preflight', name: 'help-preflight', component: SeoStaticView },
      { path: '/help/paper-layout', name: 'help-paper', component: SeoStaticView },
      { path: '/privacy', name: 'privacy', component: SeoStaticView },
      { path: '/use-cases/price-tag', name: 'uc-price', component: SeoStaticView },
      { path: '/use-cases/shipping-label', name: 'uc-ship', component: SeoStaticView },
      { path: '/use-cases/asset-tag', name: 'uc-asset', component: SeoStaticView },
      { path: '/use-cases/shelf-barcode', name: 'uc-shelf', component: SeoStaticView },
      { path: '/use-cases/clothing-hangtag', name: 'uc-apparel', component: SeoStaticView },
      { path: '/app', name: 'app', component: EditorView },
      { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
    ],
    scrollBehavior(to, _from, savedPosition) {
      if (savedPosition) return savedPosition
      if (to.hash) {
        return { el: to.hash, behavior: 'smooth', top: 88 }
      }
      return { left: 0, top: 0 }
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

  router.afterEach((to) => {
    applyRouteSiteMeta(to.path)
  })

  return router
}

export default createAppRouter
