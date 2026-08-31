#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_ANON_KEY
const token = process.env.HOYLOG_TOKEN

if (!url || !key) {
  console.error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

const server = new McpServer({
  name: 'hoylog',
  version: '0.2.3',
})

server.tool(
  'log_progress',
  'Guarda un avance diario en Hoylog. Una idea por llamada. occurred_on es YYYY-MM-DD; si se omite, usa hoy en America/Mexico_City.',
  {
    body: z.string().min(1).describe('Texto del avance'),
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Fecha del avance'),
    title: z.string().optional(),
    color: z.enum(['yellow', 'pink', 'mint', 'lilac', 'peach']).optional(),
  },
  async ({ body, occurred_on, title, color }) => {
    if (!token || token.startsWith('PEGA_')) {
      return { content: [{ type: 'text', text: 'Falta HOYLOG_TOKEN en mcp.json. Créalo en la web (MCP) y pégalo en la config.' }], isError: true }
    }
    const { data, error } = await supabase.rpc('hoylog_log_progress', {
      p_token: token,
      p_body: body,
      p_title: title ?? null,
      p_color: color ?? 'yellow',
      p_occurred_on: occurred_on ?? null,
    })
    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true }
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  },
)

server.tool(
  'list_progress',
  'Lista avances entre dos fechas inclusive (YYYY-MM-DD).',
  {
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  },
  async ({ from, to }) => {
    if (!token || token.startsWith('PEGA_')) {
      return { content: [{ type: 'text', text: 'Falta HOYLOG_TOKEN en mcp.json. Créalo en la web (MCP) y pégalo en la config.' }], isError: true }
    }
    const { data, error } = await supabase.rpc('hoylog_list_progress', {
      p_token: token,
      p_from: from,
      p_to: to,
    })
    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true }
    }
    return { content: [{ type: 'text', text: JSON.stringify(data ?? [], null, 2) }] }
  },
)

server.tool(
  'update_note',
  'Edita una tarjeta por id (avance o nota). Solo envía los campos a cambiar. title vacío la quita. is_active false la saca del pizarrón. occurred_on solo aplica a avances.',
  {
    id: z.string().uuid().describe('id de la nota (sale de list_progress)'),
    body: z.string().min(1).optional().describe('Texto del avance'),
    title: z.string().optional().describe('Título; cadena vacía para quitarlo'),
    color: z.enum(['yellow', 'pink', 'mint', 'lilac', 'peach']).optional(),
    occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Fecha del avance'),
    is_active: z.boolean().optional().describe('false la archiva del pizarrón'),
  },
  async ({ id, body, title, color, occurred_on, is_active }) => {
    if (!token || token.startsWith('PEGA_')) {
      return { content: [{ type: 'text', text: 'Falta HOYLOG_TOKEN en mcp.json. Créalo en la web (MCP) y pégalo en la config.' }], isError: true }
    }
    if (
      body === undefined
      && title === undefined
      && color === undefined
      && occurred_on === undefined
      && is_active === undefined
    ) {
      return { content: [{ type: 'text', text: 'Indica al menos un campo a cambiar.' }], isError: true }
    }
    const { data, error } = await supabase.rpc('hoylog_update_note', {
      p_token: token,
      p_id: id,
      p_body: body ?? null,
      p_title: title ?? null,
      p_touch_title: title !== undefined,
      p_color: color ?? null,
      p_occurred_on: occurred_on ?? null,
      p_is_active: is_active ?? null,
    })
    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true }
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
