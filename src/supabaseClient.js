import { createClient } from '@supabase/supabase-js'

// O Vite usa 'import.meta.env' para ler o arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Erro: As chaves do Supabase não foram encontradas no .env")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)