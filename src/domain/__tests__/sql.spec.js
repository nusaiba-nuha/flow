import { describe, expect, it } from 'vitest'

import { fromSql, SQL_ORIGIN } from '../sql.js'

const DDL = `
-- Customers first.
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

/* Orders point at customers,
   inline and by name. */
create table "orders" (
  id bigserial,
  customer_id uuid not null references customers(id),
  total numeric(10, 2) check (total >= 0),
  billing_id uuid,
  CONSTRAINT orders_pk PRIMARY KEY (id),
  CONSTRAINT orders_billing_fk FOREIGN KEY (billing_id) REFERENCES customers (id)
);

CREATE TABLE \`order_lines\` (
  order_id bigint,
  sku text,
  PRIMARY KEY (order_id, sku)
);

CREATE INDEX orders_customer ON orders (customer_id);
ALTER TABLE ONLY order_lines ADD CONSTRAINT lines_order_fk FOREIGN KEY (order_id) REFERENCES orders (id);
ALTER TABLE order_lines ADD FOREIGN KEY (sku) REFERENCES products (sku);
`

describe('fromSql', () => {
  it('draws each table with its columns, keys marked', () => {
    const { document } = fromSql(DDL)

    expect(document.nodes.map((node) => [node.id, node.type, node.name])).toEqual([
      ['table-customers', 'table', 'customers'],
      ['table-orders', 'table', 'orders'],
      ['table-order_lines', 'table', 'order_lines'],
    ])
    const describe = Object.fromEntries(
      document.nodes.map((node) => [node.name, node.data.description]),
    )
    expect(describe.customers).toBe('id PK, email, created_at')
    // `numeric(10, 2)` is one column, not two.
    expect(describe.orders).toBe('id PK, customer_id FK, total, billing_id FK')
    expect(describe.order_lines).toBe('order_id PK FK, sku PK')
    expect(document.nodes.every((node) => node.data.origin === SQL_ORIGIN)).toBe(true)
  })

  it('draws each foreign key as an edge to the table it points at, labelled with the column', () => {
    const { document } = fromSql(DDL)

    expect(document.edges.map((edge) => [edge.source, edge.target, edge.label])).toEqual([
      ['table-orders', 'table-customers', 'customer_id, billing_id'],
      ['table-order_lines', 'table-orders', 'order_id'],
    ])
  })

  it('reports a reference to a table it was not given, on its line', () => {
    const { warnings } = fromSql(DDL)
    expect(warnings).toEqual([
      { line: 28, message: 'order_lines.sku refers to products, which is not defined here.' },
    ])
  })

  it('says when there is no table to draw', () => {
    expect(fromSql('SELECT 1;').document).toBeNull()
    expect(fromSql('').warnings[0].message).toMatch(/no create table/i)
  })
})
