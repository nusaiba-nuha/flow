import { describe, expect, it } from 'vitest'

import { fromOpenApi, OPENAPI_ORIGIN } from '../openapi.js'

const SPEC = `
openapi: 3.1.0
info:
  title: Shop API
paths:
  /orders:
    get:
      tags: [Orders]
      responses:
        '200':
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Order' }
    post:
      tags: [Orders]
      requestBody:
        content:
          application/json:
            schema: { $ref: '#/components/schemas/NewOrder' }
  /orders/{id}:
    get: { tags: [Orders] }
    delete: { tags: [Orders] }
  /health:
    get: {}
components:
  schemas:
    Order:
      properties:
        id: { type: string }
        customer: { $ref: '#/components/schemas/Customer' }
        lines:
          type: array
          items: { $ref: '#/components/schemas/Line' }
    NewOrder:
      properties:
        customer: { $ref: '#/components/schemas/Customer' }
    Customer:
      properties:
        id: { type: string }
        email: { type: string }
    Line:
      properties:
        sku: { type: string }
`

describe('fromOpenApi', () => {
  it('groups operations by tag, or by first path segment without one', () => {
    const { document, warnings } = fromOpenApi(SPEC)

    expect(warnings).toEqual([])
    expect(document.title).toBe('Shop API')

    const groups = document.nodes.filter((node) => node.type === 'process')
    expect(groups.map((node) => node.name)).toEqual(['Orders', 'health'])
    expect(groups[0].data.description).toBe(
      'GET /orders, POST /orders, GET /orders/{id}, and 1 more',
    )
  })

  it('draws schemas as data, with the fields they carry', () => {
    const { document } = fromOpenApi(SPEC)
    const customer = document.nodes.find((node) => node.name === 'Customer')

    expect(customer).toMatchObject({ type: 'data', data: { description: 'id, email' } })
    expect(document.nodes.every((node) => node.data.origin === OPENAPI_ORIGIN)).toBe(true)
  })

  it('connects a group to the schemas it uses, and a schema to those it refers to', () => {
    const { document } = fromOpenApi(SPEC)
    const edges = document.edges.map((edge) => `${edge.source}->${edge.target}`)

    expect(edges).toEqual([
      'api-Orders->schema-Order',
      'api-Orders->schema-NewOrder',
      'schema-Order->schema-Customer',
      'schema-Order->schema-Line',
      'schema-NewOrder->schema-Customer',
    ])
  })

  it('reads Swagger 2 definitions and JSON too', () => {
    const { document } = fromOpenApi(
      JSON.stringify({
        swagger: '2.0',
        paths: {
          '/pets': { get: { responses: { 200: { schema: { $ref: '#/definitions/Pet' } } } } },
        },
        definitions: { Pet: { properties: { name: {} } } },
      }),
    )

    expect(document.nodes.map((node) => node.name)).toEqual(['pets', 'Pet'])
    expect(document.edges).toHaveLength(1)
  })

  it('says when the text is not a spec', () => {
    expect(fromOpenApi('{ nope').warnings[0].message).toMatch(/neither valid yaml nor json/i)
    expect(fromOpenApi('info: {}').warnings[0].message).toMatch(/no `paths:`/i)
  })
})
