import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://xuzaevmnouioyuplhyaa.supabase.co'
const SUPABASE_CHAVE_ANON = 'sb_publishable_LewpuxY-ijA-BAMbRZZ9vA_EkYB2_bQ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_CHAVE_ANON)