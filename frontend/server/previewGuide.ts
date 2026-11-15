// Deterministic interface help for this branch, explicitly labelled separately
// from model replies. The production source-data agent predates these controls.
export function previewInterfaceGuide(message: string): string | undefined {
  if (
    !/\b(chart|charts|graph|graphs|plot|plots|holm|legend|layout|interface|trend lab)\b|gr[aá]fico|legenda|escala de cor|map layers|map color|camadas do mapa/i.test(
      message,
    )
  )
    return;
  const portuguese =
    /gr[aá]fico|legenda|escala|camada|\b(como|qual|explique)\b/i.test(message);
  return portuguese
    ? "Guia da interface deste preview: Global e Selected area usam a mesma seleção. Escala, curvas visíveis, Trends only e mês são sincronizados. Default usa a unidade original e requer exatamente uma variável; Historical deviation usa a referência mensal 2001–2020 (mínimo de 10 anos por mês); Scale 0–100 compara a forma das séries. Holm considera todas as variáveis selecionadas nos dois escopos, inclusive curvas ocultas; sem recorte, apenas Global. A família fica pendente enquanto fontes carregam.\n\nNa legenda, edite os limites e saia do campo para atualizar o mapa; valores inválidos não são aplicados. Cor e opacidade não alteram dados ou estatísticas. O Trend Lab tem seu próprio estudo e resultados, que não são enviados automaticamente ao chat. Confira taxa, incerteza, cobertura, sazonalidade e limitações na análise; significância não prova causa nem previsão. Para números de uma série, indique variável, região e período ao agente."
    : "Interface guide for this preview: Global and Selected area share the selection. Scale, curve visibility, Trends only and month are synchronized. Default uses original units and requires exactly one variable; Historical deviation uses the 2001–2020 calendar-month reference (at least 10 years per month); Scale 0–100 compares curve shapes. Holm covers all selected variables across both scopes, including hidden curves; without a selected area, only Global. The family remains pending while sources load.\n\nEdit a legend limit, then leave the field to update the map; invalid limits are not applied. Colors and opacity do not change data or statistics. Trend Lab has its own study and results, which are not sent to this chat automatically. Check rate, uncertainty, coverage, seasonality and limitations in the analysis; significance does not establish a cause or forecast. For source-series numbers, give the agent a variable, region and period.";
}
export const previewAssistantScope =
  "Preview scope: answer source-data questions and general concepts using tools. Do not describe the preview layout, color controls, runtime chart p-values or Trend Lab results; those belong to the separate interface guide and are not supplied to you. Do not claim to have read them.\n\n";
