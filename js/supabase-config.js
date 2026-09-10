import { MODO_DEMO } from './demo/modo-demo.js'

const SUPABASE_URL = 'https://xuzaevmnouioyuplhyaa.supabase.co'
const SUPABASE_CHAVE_ANON = 'sb_publishable_LewpuxY-ijA-BAMbRZZ9vA_EkYB2_bQ'

async function criarCliente() {
    if (MODO_DEMO) {
        const { criarClienteDemo } = await import('./demo/cliente-demo.js')
        return criarClienteDemo()
    }

    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
    return createClient(SUPABASE_URL, SUPABASE_CHAVE_ANON)
}

// O cliente é montado com await no topo do módulo, então o DOMContentLoaded
// pode já ter acontecido quando as telas começam a rodar.
export function aoCarregar(acao) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', acao)
        return
    }
    acao()
}

export const supabase = await criarCliente()
