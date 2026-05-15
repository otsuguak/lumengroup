import { createClient } from '@supabase/supabase-js';

// Reemplaza estas llaves si alguna vez las rotas en tu panel de Supabase
const supabaseUrl = 'https://rqjfaztnaktizrgllhna.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxamZhenRuYWt0aXpyZ2xsaG5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzk1NjksImV4cCI6MjA4NzcxNTU2OX0.cb6LSWq5YZ7BKRdBx2VoeD-m1gUonfpU_MJemaTSB3U';

export const supabase = createClient(supabaseUrl, supabaseKey);