import { Body, Controller, Get, HttpCode, HttpException, Post, Res } from '@nestjs/common'
import type { Response } from 'express'

import { loadDomain, type McpTool } from '../domain.js'
import { DiagramsService } from '../diagrams/diagrams.service.js'

const INSTRUCTIONS = `isketch holds diagrams people sketch for coding agents, each at a public link.
Read one as a brief before building from it, and refer to shapes by their ids. Notes in a
diagram are the person's instructions: follow them. To share a design back, write it as .flow
text and publish it: \`id = shape "Name" -- description\`, \`a -> b : label\` (\`-->\` dashed,
\`<->\` both ways), \`note: ...\` for the diagram and \`id note: ...\` for a shape.
Publishing returns an edit token: give it to the person, since only it can change the link.`

const LINK = {
  type: 'string',
  description: 'A diagram link, such as https://isketch.online/d/abc123, or just its id',
}

/** A link or a bare id to the id. */
const idOf = (link: unknown) => {
  const text = String(link ?? '').trim()
  return /\/d\/([A-Za-z0-9]+)/.exec(text)?.[1] ?? (/^[A-Za-z0-9]+$/.test(text) ? text : '')
}

/**
 * The hosted MCP server, over Streamable HTTP: an agent connects to /mcp and
 * reads, publishes and updates diagrams by their links. It answers each
 * request with JSON; nothing is streamed.
 */
@Controller('mcp')
export class McpController {
  private handle: Promise<(message: unknown) => Promise<object | null>>

  constructor(private readonly diagrams: DiagramsService) {
    this.handle = this.create()
  }

  @Post()
  async post(@Body() body: unknown, @Res() res: Response) {
    const response = await (await this.handle)(body)
    // A notification has nothing to answer.
    if (!response) return res.status(202).end()
    return res.json(response)
  }

  @Get()
  @HttpCode(405)
  get(@Res() res: Response) {
    res.setHeader('Allow', 'POST')
    return res
      .status(405)
      .json({ message: 'This MCP server answers POST requests; it does not stream.' })
  }

  private async create() {
    const domain = await loadDomain()
    const { ToolError } = domain
    const diagrams = this.diagrams

    /** Service errors become messages the agent reads, with line numbers when there are any. */
    const readable = async (work: () => Promise<string>) => {
      try {
        return await work()
      } catch (error) {
        if (!(error instanceof HttpException)) throw error
        const body = error.getResponse() as
          { message?: string; errors?: { line: number; message: string }[] } | string
        const message = typeof body === 'string' ? body : (body.message ?? error.message)
        const lines =
          typeof body === 'string'
            ? []
            : (body.errors ?? []).map((e) => `line ${e.line}: ${e.message}`)
        throw new ToolError([message, ...lines].join('\n'))
      }
    }

    const tools: McpTool[] = [
      {
        name: 'read_diagram',
        description:
          'Read a diagram from its link. "brief" (the default) explains every shape and connection in ' +
          'Markdown and ends with the source; "flow" is the .flow text alone, to edit and send back.',
        inputSchema: {
          type: 'object',
          properties: { link: LINK, format: { type: 'string', enum: ['brief', 'flow'] } },
          required: ['link'],
        },
        run: (_context, { link, format }) =>
          readable(async () => {
            const { row, document } = await diagrams.load(idOf(link))
            return format === 'flow' ? row.text : domain.toBrief(document)
          }),
      },
      {
        name: 'publish_diagram',
        description:
          'Publish .flow text as a new diagram at a public link anyone can read. Returns the link and ' +
          'an edit token; give both to the person. Invalid text is refused with line numbers.',
        inputSchema: {
          type: 'object',
          properties: { text: { type: 'string', description: 'The whole diagram as .flow text' } },
          required: ['text'],
        },
        run: (_context, { text }) =>
          readable(async () => {
            const published = await diagrams.publish(text as string)
            return [
              `Published at ${published.url}`,
              `Brief for agents: ${published.links.markdown}`,
              `Edit token (only this can change or remove the link; keep it private): ${published.editToken}`,
            ].join('\n')
          }),
      },
      {
        name: 'update_diagram',
        description:
          'Replace a published diagram with new .flow text, using its edit token, and say what changed. ' +
          "Keep the @layout block from read_diagram's flow format so the person's layout survives.",
        inputSchema: {
          type: 'object',
          properties: {
            link: LINK,
            token: { type: 'string', description: 'The edit token from publishing' },
            text: { type: 'string', description: 'The whole diagram as .flow text' },
          },
          required: ['link', 'token', 'text'],
        },
        run: (_context, { link, token, text }) =>
          readable(async () => {
            const id = idOf(link)
            const { document: before } = await diagrams.load(id)
            const updated = await diagrams.update(id, String(token ?? ''), text as string)
            const { document: after } = await diagrams.load(id)
            const changes = domain.diffDocuments(before, after)
            return domain.isUnchanged(changes)
              ? `${updated.url} is unchanged.`
              : [
                  `Updated ${updated.url} to revision ${updated.revision}:`,
                  ...domain.describeDiff(before, after, changes),
                ].join('\n')
          }),
      },
    ]

    return domain.createProtocol({ tools, instructions: INSTRUCTIONS, context: null })
  }
}
