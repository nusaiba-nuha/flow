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
        // A route, not a flag: the URL owns which node is open.
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
