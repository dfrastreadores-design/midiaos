import { supabase } from "./db.mjs";

async function standardizeProductPartners() {
  const { data: parceiros } = await supabase.from("parceiros").select("id, nome_fantasia, razao_social, cnpj");
  
  for (const parc of parceiros || []) {
    const nome = parc.nome_fantasia || parc.razao_social;
    const cnpj = parc.cnpj || null;
    
    const { data, error } = await supabase
      .from("produtos")
      .update({
        parceiro_nome: nome,
        parceiro_cnpj: cnpj
      })
      .or(`parceiro_id.eq.${parc.id},partner_id.eq.${parc.id}`);
    
    if (error) {
      console.error(`Error updating produtos for ${nome}:`, error.message);
    } else {
      console.log(`Standardized produtos for ${nome} (${parc.id})`);
    }
  }
}

standardizeProductPartners().catch(console.error);
