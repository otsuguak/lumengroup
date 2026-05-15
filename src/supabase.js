import { createClient } from '@supabase/supabase-js';

// Esto hace que el código use las variables seguras de Vercel o tu .env local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan las llaves de Supabase. Revisa tu archivo .env o las variables en Vercel.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);