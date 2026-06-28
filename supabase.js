// supabase.js

const SUPABASE_URL = "여기에_Project_URL_입력";
const SUPABASE_ANON_KEY = "여기에_anon_public_key_입력";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
