import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const mockSupabase = `
window.__QA_CALLS__ = []
const member = {
  id: 'qa-user',
  display_name: 'QA Member',
  tagline: 'QA profile',
  bio: '',
  role_tags: [],
  skills: [],
  links: {},
  availability: 'available',
  published: false,
  photo_raw: null,
}
const db = {
  auth: {
    getUser: async () => {
      window.__QA_CALLS__.push('auth.getUser')
      return { data: { user: { id: member.id, email: 'qa@example.test' } }, error: null }
    },
  },
  from(table) {
    if (table !== 'members') throw new Error('unexpected table: ' + table)
    return {
      select: () => ({
        eq: () => ({
          single: async () => {
            window.__QA_CALLS__.push('members.select')
            return { data: { ...member }, error: null }
          },
        }),
      }),
      update: async () => {
        window.__QA_CALLS__.push('members.update')
        return { eq: async () => ({ data: null, error: null }) }
      },
    }
  },
  storage: {
    from: () => {
      window.__QA_CALLS__.push('storage.from')
      return {
        upload: async () => ({ error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: null }, error: null }),
      }
    },
  },
}
export const supabase = db
export const supabaseReady = true
export function requireSupabase() { return db }
`

export default defineConfig({
  root: process.cwd(),
  plugins: [
    react(),
    {
      name: 'paws-qa-mock-supabase',
      enforce: 'pre',
      transform(code, id) {
        if (id.replace(/\\/g, '/').endsWith('/src/lib/supabase.js')) {
          return { code: mockSupabase, map: null }
        }
        return null
      },
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
})
