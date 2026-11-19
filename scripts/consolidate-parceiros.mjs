import { supabase, NEXO_TENANT_ID } from "./db.mjs";

async function consolidate() {
  console.log("=== STARTING PARCEIROS CONSOLIDATION ===");

  // 1. Definição do mapeamento de fusão: cloneId -> canonicalId
  const mergeMap = {
    // Cerradus DOOH
    "115f3939-5c1c-469d-9f35-9d4bedae8e26": "b30ad94e-00e4-486a-95b6-d66edb9c1bba",
    // Eagle Publicity
    "fca35b26-63ca-491c-8091-50de0e24d1fb": "04b2a58c-af43-4a31-82cf-fab5546b7b30",
    // Megavi Mídia
    "a3cb29aa-fc8d-49ca-af8c-377f44c66292": "905693d4-1410-4f73-8c4a-f5de2f9406cb",
    // Cerrado Mix
    "994a69aa-4677-4ea2-ab08-5fb2c63852fd": "69756e25-35a9-4d97-a723-968da38ed868",
    // Autooh By Tech
    "27e26e31-2271-4a4a-b4e9-5c597d55b2e0": "ff1c3291-2fc4-44a5-90f9-19c541d234ad",
    // Asa Branca Mídia
    "10de3cb3-d18c-4da5-99c1-a7e666203a30": "8a5587a1-5cdb-47c8-8bee-c860a305ce8c",
    // TV Cars
    "53d713da-3410-41c3-a639-eb7a6c7e43b8": "db5f1bed-7883-45fe-94e6-b43d8a2e877a",
    // WMídias
    "df602585-e36c-4d74-8795-80aa9bb455a2": "5f7c2266-d4e0-4919-aa0c-a641ffdac136",
    // Visão Painéis
    "59ce09c2-677d-4523-9f86-cb42a990f3d2": "6acfce18-a970-44da-b808-2a8769b72563",
    // Jovem Pan Brasília
    "38cf2630-a3a2-42ec-b5f3-507a273932b8": "cd2d2a86-ff5b-4c17-b32c-8a2f6f709cf2",
    // JK FM 102.7
    "38801f47-fe37-4435-b19a-22b16cf18e4f": "691a8070-a8df-4cd2-8f73-d1ccd9a66195",
    // Mix FM Brasília
    "f37a1db5-9563-4981-b0c3-41e4d63faf09": "c5bde664-2248-4154-b8c6-e5e80fe42a25",
    // AB Comunicação Visual
    "730d4a7c-62e7-45d3-8bbc-9b65788ba1b9": "1b7e46ab-6871-4e20-8c32-c5810bdb11f8",
    // ART Mídia
    "58dc8591-ecf1-4fea-847c-94248be6c9f0": "09e73021-db1d-4d64-8cc5-e950d1d7af2d",
    // P.O Mídia
    "9afe8116-d832-40a5-be27-8f3fc597fed0": "9b0f0c4b-33ce-4615-a98b-561aae1a82c4",
    // PO MIDIA DIGITAL
    "d81cc6cd-a097-49bc-a467-e9759907009f": "367bc7a6-e557-40ee-8b92-283fe9cf0ad0",
  };

  // 2. Re-point any products pointing to a clone ID
  for (const [cloneId, canonicalId] of Object.entries(mergeMap)) {
    const { data: updatedProd, error: errProd } = await supabase
      .from("produtos")
      .update({ parceiro_id: canonicalId, partner_id: canonicalId })
      .eq("parceiro_id", cloneId);
    if (errProd) {
      console.error(`Error re-pointing produtos from ${cloneId} to ${canonicalId}:`, errProd.message);
    } else {
      console.log(`Re-pointed produtos from clone ${cloneId} -> canonical ${canonicalId}`);
    }

    const { error: errPartnerId } = await supabase
      .from("produtos")
      .update({ parceiro_id: canonicalId, partner_id: canonicalId })
      .eq("partner_id", cloneId);
    if (errPartnerId) {
      console.error(`Error re-pointing partner_id from ${cloneId}:`, errPartnerId.message);
    }
  }

  // 3. Delete the redundant clone partner records
  const cloneIds = Object.keys(mergeMap);
  const { error: errDelClones } = await supabase
    .from("parceiros")
    .delete()
    .in("id", cloneIds);
  if (errDelClones) {
    console.error("Error deleting clone parceiros:", errDelClones.message);
  } else {
    console.log(`Successfully deleted ${cloneIds.length} clone parceiros.`);
  }

  // 4. Delete temporary test partner records
  const { data: testParceiros } = await supabase
    .from("parceiros")
    .select("id, razao_social")
    .ilike("razao_social", "%[TESTE DE VALIDAÇÃO]%");
  
  if (testParceiros && testParceiros.length > 0) {
    const testIds = testParceiros.map(p => p.id);
    const { error: errDelTests } = await supabase
      .from("parceiros")
      .delete()
      .in("id", testIds);
    if (errDelTests) {
      console.error("Error deleting test parceiros:", errDelTests.message);
    } else {
      console.log(`Successfully deleted ${testIds.length} test parceiros.`);
    }
  }

  // 5. Ensure all remaining active parceiros have tenant_id set to NEXO_TENANT_ID
  const { data: remainingParceiros } = await supabase
    .from("parceiros")
    .select("id, nome_fantasia, razao_social, cnpj, tenant_id");

  for (const parc of remainingParceiros || []) {
    if (parc.tenant_id !== NEXO_TENANT_ID) {
      await supabase
        .from("parceiros")
        .update({ tenant_id: NEXO_TENANT_ID })
        .eq("id", parc.id);
      console.log(`Updated tenant_id for ${parc.nome_fantasia} (${parc.id}) to ${NEXO_TENANT_ID}`);
    }
  }

  console.log(`\n=== REMAINING PARCEIROS (${remainingParceiros?.length}) ===`);
  for (const p of remainingParceiros || []) {
    // Count products
    const { count } = await supabase
      .from("produtos")
      .select("*", { count: "exact", head: true })
      .or(`parceiro_id.eq.${p.id},partner_id.eq.${p.id}`);
    console.log(`- ${p.nome_fantasia} (CNPJ: ${p.cnpj}): ${count} produtos (ID: ${p.id})`);
  }
}

consolidate().catch(console.error);
