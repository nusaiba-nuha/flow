import { createRouter, createWebHistory } from 'vue-router'

export const ROUTE = Object.freeze({
  FLOW: 'flow',
  NODE_DETAILS: 'node-details',
})

const routes = [
  { path: '/', redirect: { name: ROUTE.FLOW } },
  {
    path: '/flow',
    name: ROUTE.FLOW,
    component: () => import('@/views/FlowView.vue'),
    children: [
      {
        // The drawer is a route, not a boolean: the URL is the single source of
        // truth for which node is open, so deep links and back/forward just work.
        path: 'node/:id',
        name: ROUTE.NODE_DETAILS,
        component: () => import('@/components/drawer/NodeDetailsDrawer.vue'),
        props: true,
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: { name: ROUTE.FLOW } },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
