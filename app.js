const demoRows = [
  ["0001234-56.2015.8.06.0035", "Cumprimento de sentença", "Alimentos", "10/06/2026", "Aguardando decurso de prazo para manifestação da parte autora"],
  ["0002321-04.2018.8.06.0035", "Procedimento comum", "Responsabilidade civil", "21/09/2026", "Juntada de petição"],
  ["0003456-17.2024.8.06.0035", "Guarda", "Guarda", "15/10/2026", "Mandado devolvido sem cumprimento: endereço insuficiente"],
  ["0004455-92.2022.8.06.0035", "Procedimento comum", "Saúde", "03/07/2026", "Juntada de laudo pericial"],
  ["0005310-84.2025.8.06.0035", "Homologação de acordo", "CEJUSC", "18/10/2026", "Retorno do CEJUSC com acordo homologado"],
  ["0006123-08.2014.8.06.0035", "Interdição", "Curatela", "26/08/2025", "Aguardando juntada de mandado"],
  ["0007999-35.2023.8.06.0035", "Execução", "Cobrança", "07/10/2026", "Trânsito em julgado certificado"],
  ["0008111-09.2021.8.06.0035", "Ação de alimentos", "Alimentos", "29/09/2026", "Intimação eletrônica expedida"],
  ["0009222-43.2020.8.06.0035", "Procedimento comum", "Contratos", "02/10/2026", "Petição de manifestação juntada"],
  ["0000101-77.2013.8.06.0035", "ECA", "Infância e Juventude", "11/04/2025", "Juntada de relatório técnico"],
];

let allRows = [];
let activeQueue = null;
let importedSource = "relatório PED";
const $ = (id) => document.getElementById(id);

function normal(text = "") { return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function parseDate(value) {
  const match = String(value || "").match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (!match) return null;
  let [,day,month,year] = match; if (year.length === 2) year = `20${year}`;
  const date = new Date(Number(year), Number(month) - 1, Number(day)); return Number.isNaN(date.getTime()) ? null : date;
}
function asDate(date) { return date ? date.toLocaleDateString("pt-BR") : "Não identificada"; }
function daysAgo(date) { return date ? Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000)) : null; }
function ageState(days) { return !Number.isFinite(days) ? "unknown" : days <= 30 ? "green" : days <= 100 ? "yellow" : "red"; }
const signalTerms = {
  urgent:["tutela de urgencia","pedido de liminar","liminar","urgente","risco de morte","risco a vida","risco grave","internacao","tratamento urgente","medida protetiva","acolhimento","violencia","ameaca","integridade fisica","cirurgia urgente"],
  child:["crianca","criancas","adolescente","adolescentes","infancia","eca","menor de idade"],
  possiblePriority:["curatela","interdicao","guarda","alimentos","eca","infancia","adolescente","idoso","doenca grave","deficiencia"],
  hearing:["audiencia","pauta de audiencia","redesignacao","redesignar audiencia","ata de audiencia"],
};
function includesAny(text, terms) {
  const content=` ${normal(text).replace(/[^a-z0-9]+/g," ").trim()} `;
  return terms.find((term)=>content.includes(` ${normal(term).replace(/[^a-z0-9]+/g," ").trim()} `))||"";
}
function missingValue(value) { return !value || /^(nao informado|nao identificado|sem numero)$/i.test(normal(value).trim()); }
function analyzeMetadata(row) {
  const context=normal(`${row.className} ${row.subject} ${row.movement}`);
  const urgentTerm=includesAny(context,signalTerms.urgent);
  const childTerm=includesAny(context,signalTerms.child);
  const priorityTerm=includesAny(context,signalTerms.possiblePriority);
  const hearingTerm=includesAny(normal(row.movement),signalTerms.hearing);
  const dataIssues=[], cadastroIssues=[];
  if(!/\d{7}-?\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/.test(row.process)) dataIssues.push("Número do processo fora do padrão CNJ reconhecido");
  if(missingValue(row.className)) cadastroIssues.push("Classe não identificada no relatório; comparar com o PJe");
  if(missingValue(row.subject)) cadastroIssues.push("Assunto não identificado no relatório; comparar com o PJe");
  if(!row.lastDate) dataIssues.push("Data da última movimentação não identificada");
  if(missingValue(row.movement)) dataIssues.push("Descrição do último movimento não identificada");
  const hasReviewSignal=Boolean(urgentTerm||childTerm||priorityTerm||hearingTerm);
  const suggestedBand=hasReviewSignal
    ? "Conferência prioritária — sinal, não P0/P1 confirmado"
    : row.idleDays>100
      ? "P2 — sugestão gerencial (>100 dias; limiar local a confirmar)"
      : cadastroIssues.length
        ? "P3 — saneamento programável"
        : dataIssues.length
          ? "Dados de origem incompletos — validar"
        : "Sem alerta inferível neste recorte";
  const reasons=[];
  if(urgentTerm) reasons.push(`termo relacionado a urgência/risco: “${urgentTerm}”`);
  if(childTerm) reasons.push(`menção a criança/adolescente: “${childTerm}”`);
  if(priorityTerm) reasons.push(`tema que pode exigir validação de prioridade: “${priorityTerm}”`);
  if(hearingTerm) reasons.push(`menção a audiência: “${hearingTerm}”`);
  if(row.idleDays>100) reasons.push(`${row.idleDays} dias corridos desde a última movimentação (indicador gerencial)`);
  if(cadastroIssues.length) reasons.push(...cadastroIssues);
  if(dataIssues.length) reasons.push(...dataIssues);
  const nextStep=urgentTerm
    ? "Conferir pedido, documentos, decisões posteriores, cumprimento e atualidade do risco nos autos autorizados"
    : childTerm
      ? "Validar o papel da criança/adolescente, a situação atual e eventual prioridade nos autos"
      : priorityTerm
        ? "Validar hipótese e fundamento de prioridade nos autos e na norma aplicável"
        : hearingTerm
          ? "Conferir determinação, designação, realização e providência posterior da audiência"
          : row.idleDays>100
            ? "Verificar providência específica pendente, suspensão, prazos em curso e atos posteriores"
            : cadastroIssues.length
              ? "Conferir classe/assunto no relatório e comparar com o PJe; não presumir erro cadastral"
              : dataIssues.length
                ? "Validar os dados do arquivo de origem antes de qualquer encaminhamento"
              : "Revisar contexto nos autos se houver outra indicação";
  return {
    suggestedBand,
    hasReviewSignal,
    urgentSignal:Boolean(urgentTerm),
    urgentStatus:urgentTerm?`Sinal textual (“${urgentTerm}”); pedido, decisão e atualidade não verificados`:"Nenhum termo localizado no último movimento; isso não exclui urgência",
    childStatus:childTerm?`Menção textual (“${childTerm}”); papel e situação não verificados`:"Nenhuma menção localizada no recorte; isso não exclui envolvimento",
    priorityStatus:priorityTerm?`Possível tema (“${priorityTerm}”); prioridade legal e fundamento não confirmados`:"Prioridade legal não confirmada por este relatório",
    hearingStatus:hearingTerm?`Menção encontrada (“${hearingTerm}”); situação não confirmada`:"Sem menção no último movimento; audiência não avaliada",
    cadastroStatus:[cadastroIssues.length?`${cadastroIssues.join("; ")} (não prova ausência no PJe)`:`Classe/assunto presentes no relatório; cadastro e competência não validados contra autos, TPU ou regras locais`,dataIssues.length?`Qualidade da origem: ${dataIssues.join("; ")}`:"Qualidade da origem: sem lacuna detectada nos campos básicos"].join(" · "),
    sourceEvidence:`Relatório PED — último movimento: ${row.movement}${row.lastDate?` · data: ${asDate(row.lastDate)}`:" · data não identificada"}`,
    reasons:reasons.length?reasons:["Nenhum sinal relevante inferível apenas dos metadados importados"],
    nextStep,
    confidence:"Baixa — somente metadados do PED; autos não consultados",
    dataIssues,
    hasCadastroIssue:Boolean(cadastroIssues.length),
    hearingTerm:Boolean(hearingTerm),
    overlap:hasReviewSignal&&row.idleDays>100,
  };
}
function makeRow(process, className, subject, date, movement) {
  const lastDate=parseDate(date), idleDays=daysAgo(lastDate);
  const base={process:String(process||"Sem número"),className:String(className||"Não informado"),subject:String(subject||"Não informado"),lastDate,movement:String(movement||"Movimento não identificado"),idleDays};
  const analysis=analyzeMetadata(base);
  const specialList=classifySpecialMentions(base);
  return {...base,analysis,specialList,priority:analysis.hasReviewSignal?"Sinal para revisão":"Sem sinal no recorte",action:analysis.nextStep,owner:"Revisão humana"};
}

function classifySpecialMentions(row) {
  const groups=[
    {category:"Ato infracional",terms:["atos infracionais","ato infracional","apuração de ato infracional","representação por ato infracional","adolescente em conflito com a lei"]},
    {category:"Adoção",terms:["adoção"]},
    {category:"Medida de proteção",terms:["medidas de proteção","medida de proteção","medidas protetivas","medida protetiva","acolhimento institucional","acolhimento familiar"]},
    {category:"Medida socioeducativa — vínculo a confirmar",terms:["medida socioeducativa","medidas socioeducativas"]},
  ];
  const fields=[{name:"Classe",value:row.className},{name:"Assunto",value:row.subject},{name:"Último movimento",value:row.movement}];
  const matches=[];
  for(const field of fields) for(const group of groups) {
    const term=includesAny(field.value,group.terms);
    if(term) matches.push({category:group.category,term,field:field.name});
  }
  return {included:matches.length>0,matches,categories:[...new Set(matches.map((match)=>match.category))]};
}

function headerKey(value) { return normal(value).replace(/[^a-z0-9]+/g," ").trim(); }
function columnIndexes(headers) {
  const keys=headers.map(headerKey);
  const find=(exact, partial=[])=>{
    const exactIndex=keys.findIndex((key)=>exact.includes(key));
    if(exactIndex>=0) return exactIndex;
    return keys.findIndex((key)=>partial.some((term)=>key.includes(term)) && !/^(data|dt)\b/.test(key));
  };
  const dateIndex=keys.findIndex((key)=>["data do ultimo movimento","data ultimo movimento","data da ultima movimentacao","data ultima movimentacao","data da movimentacao","data movimentacao","movimento em","data","dt"].includes(key));
  return {
    process:find(["processo","numero do processo","numero processo","numero","processo cnj","cnj","identificador do processo"],["numero do processo","numero processo","processo","cnj"]),
    className:find(["classe","classe processual"],["classe"]),
    subject:find(["assunto","assunto principal"],["assunto"]),
    date:dateIndex,
    movement:find(["ultimo movimento","descricao do ultimo movimento","descricao ultimo movimento","movimentacao mais recente","movimento atual","movimento recente","descricao da movimentacao","descricao do movimento","movimentacao","movimento","historico","evento"],["ultimo movimento","movimentacao","movimento","descricao","historico","evento"]),
  };
}
function findHeaderRow(matrix) {
  let best={index:-1,score:0};
  matrix.slice(0,25).forEach((row,index)=>{
    const fields=columnIndexes(row);
    const score=(fields.process>=0?1:0)+(fields.movement>=0?1:0)+(fields.date>=0?0.1:0)+(fields.className>=0?0.1:0)+(fields.subject>=0?0.1:0);
    if(score>best.score) best={index,score};
  });
  return best.score>=2?best.index:-1;
}
function rowsFromMatrix(matrix) {
  const headerIndex=findHeaderRow(matrix);
  if(headerIndex<0){
    const sample=(matrix[0]||[]).filter(Boolean).slice(0,6).join(", ");
    throw new Error(`Não identifiquei as colunas de processo e último movimento${sample?` (primeira linha: ${sample})`:""}. Confira se a planilha tem cabeçalhos e tente CSV ou Excel.`);
  }
  const indexes=columnIndexes(matrix[headerIndex]);
  const rows=matrix.slice(headerIndex+1).map((cells)=>makeRow(cells[indexes.process],cells[indexes.className],cells[indexes.subject],cells[indexes.date],cells[indexes.movement])).filter((row)=>row.process!=="Sem número");
  if(!rows.length) throw new Error("Encontrei os cabeçalhos, mas não achei linhas de processos abaixo deles.");
  return rows;
}
function parseDelimited(text,delimiter) {
  const source=text.replace(/^\uFEFF/,"");
  const records=[]; let record=[],cell="",quoted=false,afterQuote=false;
  for(let i=0;i<source.length;i++) {
    const char=source[i];
    if(quoted) {
      if(char==='"' && source[i+1]==='"'){cell+='"';i++;}
      else if(char==='"'){quoted=false;afterQuote=true;}
      else cell+=char;
    } else if(char==='"' && cell.trim()===""){cell="";quoted=true;afterQuote=false;}
    else if(char===delimiter){record.push(cell.trim());cell="";afterQuote=false;}
    else if(char==="\n"||char==="\r") {
      if(char==="\r"&&source[i+1]==="\n") i++;
      record.push(cell.trim());cell="";
      if(record.some((value)=>value!=="")) records.push(record);
      record=[];afterQuote=false;
    } else if(afterQuote && !/\s/.test(char)) throw new Error("O CSV tem aspas fora do padrão. Salve novamente como CSV UTF-8 e tente outra vez.");
    else if(!afterQuote) cell+=char;
  }
  if(quoted) throw new Error("O CSV tem um campo entre aspas sem fechamento. Salve novamente como CSV UTF-8 e tente outra vez.");
  record.push(cell.trim());if(record.some((value)=>value!=="")) records.push(record);
  return records;
}
function parseCsv(text) {
  const choices=[";",",","\t"].map((delimiter)=>({delimiter,records:parseDelimited(text,delimiter)}));
  choices.sort((a,b)=>{
    const score=(choice)=>{const header=findHeaderRow(choice.records);return (header>=0?100:0)+(choice.records[0]?.length||0);};
    return score(b)-score(a);
  });
  return rowsFromMatrix(choices[0].records);
}
async function readCsv(file) {
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(bytes[0]===0xff&&bytes[1]===0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if(bytes[0]===0xfe&&bytes[1]===0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  const payload=bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf?bytes.subarray(3):bytes;
  try { return new TextDecoder("utf-8",{fatal:true}).decode(payload); }
  catch { return new TextDecoder("windows-1252").decode(payload); }
}
function parseExcel(buffer) {
  if(!window.XLSX) throw new Error("O leitor de Excel não carregou. Atualize a página e tente novamente.");
  const workbook=window.XLSX.read(buffer,{type:"array",cellDates:true});
  const sheets=workbook.SheetNames.map((name)=>({name,matrix:window.XLSX.utils.sheet_to_json(workbook.Sheets[name],{header:1,raw:false,defval:"",blankrows:false,dateNF:"dd/mm/yyyy"})}));
  const sheet=sheets.find((item)=>findHeaderRow(item.matrix)>=0);
  if(!sheet) throw new Error("Não encontrei uma aba com as colunas de processo e último movimento. Verifique os cabeçalhos da planilha.");
  return rowsFromMatrix(sheet.matrix);
}
function rowsShown() { const search=normal($("search").value), age=$("age-filter").value, priorityFilter=$("priority-filter").value; return allRows.filter((row)=>{const searchable=normal(`${row.process} ${row.movement} ${row.action} ${row.analysis.suggestedBand} ${row.analysis.reasons.join(" ")}`);return (!search||searchable.includes(search))&&(age==="all"||ageState(row.idleDays)===age)&&(priorityFilter==="all"||(priorityFilter==="yes"?row.analysis.hasReviewSignal:!row.analysis.hasReviewSignal))&&(!activeQueue||row.action===activeQueue);}); }
function queueStats(rows) { const map = new Map(); rows.forEach((row) => map.set(row.action, [...(map.get(row.action)||[]),row])); return [...map.entries()].sort((a,b)=>b[1].length-a[1].length); }
function render() {
  const rows=rowsShown(); $("empty-state").hidden=allRows.length>0; $("app-content").hidden=allRows.length===0; $("dataset-title").textContent=`${allRows.length.toLocaleString("pt-BR")} processos importados`;
  $("total-count").textContent=rows.length.toLocaleString("pt-BR");
  $("urgent-count").textContent=allRows.filter((r)=>r.analysis.urgentSignal).length.toLocaleString("pt-BR");
  $("child-count").textContent=allRows.filter((r)=>r.analysis.childStatus.startsWith("Menção textual")).length.toLocaleString("pt-BR");
  $("over-100-count").textContent=allRows.filter((r)=>r.idleDays>100).length.toLocaleString("pt-BR");
  $("hearing-count").textContent=allRows.filter((r)=>r.analysis.hearingTerm).length.toLocaleString("pt-BR");
  $("confirmed-high-count").textContent="Não classificáveis — autos não consultados";
  $("p2-count").textContent=allRows.filter((r)=>r.idleDays>100).length.toLocaleString("pt-BR");
  $("p3-count").textContent=allRows.filter((r)=>r.analysis.hasCadastroIssue).length.toLocaleString("pt-BR");
  $("overlap-count").textContent=allRows.filter((r)=>r.analysis.overlap).length.toLocaleString("pt-BR");
  $("cadastro-count").textContent=allRows.filter((r)=>r.analysis.hasCadastroIssue).length.toLocaleString("pt-BR");
  const queueRoot=$("queue-cards"); queueRoot.innerHTML="";
  queueStats(allRows).forEach(([action,items])=>{const card=$("queue-template").content.cloneNode(true);card.querySelector(".queue-count").textContent=`${items.length} processos`;card.querySelector("h3").textContent=action;card.querySelector(".queue-detail").textContent=`${items.filter((r)=>r.analysis.hasReviewSignal).length} com sinais para conferir · ${items.filter((r)=>r.idleDays>100).length} acima do limiar gerencial de 100 dias`;const button=card.querySelector("button");button.textContent=activeQueue===action?"Mostrar todos":"Ver lote";button.onclick=()=>{activeQueue=activeQueue===action?null:action;render();};queueRoot.append(card);});
  $("process-table").innerHTML=rows.map((row)=>`<tr><td class="process">${escapeHtml(row.process)}</td><td><span class="band-badge">${escapeHtml(row.analysis.suggestedBand)}</span></td><td class="movement"><strong>${escapeHtml(row.movement)}</strong><small>${escapeHtml(row.analysis.sourceEvidence)}</small></td><td>${asDate(row.lastDate)}</td><td><span class="badge ${ageState(row.idleDays)}">${row.lastDate?`${row.idleDays} dias corridos`:"não calculado"}</span><small>desde a última movimentação; não é prazo legal</small></td><td><small>${escapeHtml(row.analysis.urgentStatus)}</small><small>${escapeHtml(row.analysis.childStatus)}</small><small>${escapeHtml(row.analysis.priorityStatus)}</small></td><td><small>${escapeHtml(row.analysis.hearingStatus)}</small></td><td><small>${escapeHtml(row.analysis.cadastroStatus)}</small></td><td class="act">${escapeHtml(row.analysis.nextStep)}<small>${escapeHtml(row.analysis.reasons.join(" · "))}</small></td><td><span class="confidence">${escapeHtml(row.analysis.confidence)}</span></td></tr>`).join("")||`<tr><td colspan="10">Nenhum processo encontrado com estes filtros.</td></tr>`;
  const specialRows=allRows.filter((row)=>row.specialList.included);
  $("special-count").textContent=specialRows.length.toLocaleString("pt-BR");
  $("special-empty").hidden=specialRows.length>0;
  $("special-table-wrap").hidden=specialRows.length===0;
  $("special-table").innerHTML=specialRows.map((row)=>`<tr><td class="process">${escapeHtml(row.process)}</td><td>${escapeHtml(row.specialList.categories.join(" · "))}<small>${escapeHtml(row.specialList.matches.map((match)=>`${match.category}: “${match.term}” (${match.field})`).join(" · "))}</small></td><td>${escapeHtml([...new Set(row.specialList.matches.map((match)=>match.field))].join(" · "))}</td><td class="movement">${escapeHtml(row.movement)}</td><td>${asDate(row.lastDate)}</td><td>Confirmar classe, contexto, fase, sigilo e situação atual nos autos autorizados.</td></tr>`).join("");
}
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (char)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[char])); }
function csvFor(rows) {
  const header=["Processo","Classe cadastrada","Assunto cadastrado","Data da última movimentação","Última movimentação (evidência do PED)","Dias corridos desde a última movimentação (não é prazo legal)","Faixa gerencial sugerida","Sinal de urgência (não confirmado)","Menção a criança/adolescente (não confirmada)","Prioridade legal (não confirmada)","Situação de audiência (não avaliada pelo PED)","Situação cadastral / limitações","Providência sugerida para revisão humana","Motivos/sinais","Confiança","Responsável","Lista especial — categoria(s) encontrada(s)","Lista especial — termo(s) localizado(s)","Lista especial — campo(s) localizado(s)"];
  const lines=rows.map((r)=>[r.process,r.className,r.subject,asDate(r.lastDate),r.movement,r.idleDays??"",r.analysis.suggestedBand,r.analysis.urgentStatus,r.analysis.childStatus,r.analysis.priorityStatus,r.analysis.hearingStatus,r.analysis.cadastroStatus,r.analysis.nextStep,r.analysis.reasons.join(" | "),r.analysis.confidence,r.owner,r.specialList.categories.join(" | "),r.specialList.matches.map((match)=>match.term).join(" | "),[...new Set(r.specialList.matches.map((match)=>match.field))].join(" | ")].map((value)=>`"${String(value??"").replaceAll('"','""')}"`).join(";"));
  return "\uFEFF"+[header.join(";"),...lines].join("\n");
}
function download(name, data) { const url=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})); const link=document.createElement("a"); link.href=url; link.download=name; link.click(); URL.revokeObjectURL(url); }
function importRows(rows, description) { allRows=rows; activeQueue=null; importedSource=description||"relatório PED"; const count=rows.length; const noun=count===1?"processo carregado":"processos carregados"; const reference=new Date().toLocaleString("pt-BR"); $("upload-feedback").textContent=`${count.toLocaleString("pt-BR")} ${noun}${description ? ` · ${description}` : ""}. Confira os sinais e evidências nos autos autorizados.`; $("coverage-summary").textContent=`Unidade configurada: 2ª Vara Cível de Aracati · referência: ${reference} · fonte: ${importedSource} (${count.toLocaleString("pt-BR")} processos). A faixa acima de 100 dias é um indicador visual provisório, não um limiar local validado. Foram analisados somente os campos presentes no arquivo; PJe, autos, documentos, decisões, normas locais e TPU não foram consultados.`; render(); }
async function readPdf(file) {
  $("upload-feedback").textContent="Lendo o PDF localmente…";
  let pdfjs;
  try { pdfjs=await import("./vendor/pdf.min.mjs?v=5.6.205"); }
  catch { throw new Error("O leitor local de PDF não carregou. Atualize a página e tente novamente."); }
  pdfjs.GlobalWorkerOptions.workerSrc=new URL("vendor/pdf.worker.min.mjs?v=5.6.205",document.baseURI).href;
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const pages=[]; let text="";
  for(let page=1;page<=pdf.numPages;page++) {
    const content=await (await pdf.getPage(page)).getTextContent();
    const lines=[];
    for(const item of content.items) {
      const value=String(item.str||"").trim();
      if(!value) continue;
      const x=Number(item.transform?.[4]||0), y=Number(item.transform?.[5]||0);
      let line=lines.find((candidate)=>Math.abs(candidate.y-y)<=2);
      if(!line){line={y,items:[]};lines.push(line);}
      line.items.push({x,value});
    }
    lines.forEach((line)=>line.items.sort((a,b)=>a.x-b.x));
    lines.sort((a,b)=>b.y-a.y);
    lines.forEach((line)=>{line.text=line.items.map((item)=>item.value).join(" ");});
    pages.push(lines);
    text+=`${lines.map((line)=>line.text).join("\n")}\n`;
  }
  if(!text.trim()) throw new Error("Este PDF não tem texto selecionável. Ele parece ser digitalizado como imagem e precisa passar por OCR antes da importação.");
  const pattern=/\d{7}\s*-\s*\d{2}\s*\.\s*\d{4}\s*\.\s*\d\s*\.\s*\d{2}\s*\.\s*\d{4}/g;
  const tableRows=readPdfTable(pages,pattern);
  if(tableRows?.length){importRows(tableRows,"extraídos do PDF — confira os movimentos antes de usar");return;}
  const matches=[...text.matchAll(pattern)];
  if(!matches.length) throw new Error("O PDF tem texto, mas não encontrei números de processo no padrão CNJ. Exporte o relatório como CSV ou Excel e importe-o aqui.");
  const byProcess=new Map();
  matches.forEach((match,index)=>{
    const process=match[0].replace(/\s+/g,"");
    const end=matches[index+1]?.index??text.length;
    const chunk=text.slice(match.index+match[0].length,end);
    const date=(chunk.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/)||[])[0];
    const movement=chunk.replace(date||"","").replace(/\s+/g," ").trim().slice(0,420);
    const row=makeRow(process,"Não identificado","Não identificado",date,movement);
    if(!byProcess.has(process)||movement.length>(byProcess.get(process).movement.length||0)) byProcess.set(process,row);
  });
  importRows([...byProcess.values()],"extraídos do PDF — confira os movimentos antes de usar");
}

function headerColumnX(lines, phrase) {
  const band=Array.isArray(lines)?lines:[lines];
  const target=headerKey(phrase);
  const patterns={
    "data da ultima movimentacao":/\bdata\s+(?:da\s+)?ultima\s+movimentacao\b/,
    "descricao da movimentacao":/\bdescricao\s+(?:da\s+)?movimentacao\b/,
    "descricao da classe":/\bdescricao\s+(?:da\s+)?classe\b/,
    "descricao do assunto":/\bdescricao\s+(?:do\s+)?assunto\b/,
  };
  const matcher=patterns[target]||new RegExp(`\\b${target.replaceAll(" ","\\s+")}\\b`);
  const items=band.flatMap((line)=>line.items.map((item)=>({...item,y:line.y}))).sort((a,b)=>b.y-a.y||a.x-b.x);
  const maxWidth=target==="data da ultima movimentacao"?28:target==="processo"?90:120;
  let best=null;
  for(const anchor of items) {
    const nearby=items.filter((item)=>item.x>=anchor.x-3&&item.x<=anchor.x+maxWidth);
    const text=headerKey(nearby.map((item)=>item.value).join(" "));
    if(!matcher.test(text)) continue;
    const fieldStart=target.startsWith("descricao")
      ? nearby.find((item)=>headerKey(item.value).includes("descricao"))?.x
      : anchor.x;
    const extra=text.length-target.length;
    if(fieldStart!==undefined&&(!best||extra<best.extra)) best={x:fieldStart,extra};
  }
  return best?.x??null;
}
function pdfNoise(line) {
  const value=headerKey(line.text);
  return /data de atualizacao|poder judiciario|tribunal de justica|pagina \d|usuario:|relatorio de consulta|processo ultima distribuicao/.test(value);
}
function pdfColumnText(lines,xStart,xEnd=Infinity,leftPadding=3) {
  return lines.filter((line)=>!pdfNoise(line)).map((line)=>line.items.filter((item)=>item.x>=xStart-leftPadding&&item.x<xEnd-3).map((item)=>item.value).join(" ")).filter(Boolean).join(" ").replace(/\s+/g," ").trim();
}
function pdfTableStarts(pages,pattern,processX) {
  const starts=[]; let pageOffset=0; const seen=new Set();
  pages.forEach((page)=>{
    page.forEach((line,lineIndex)=>{
      const band=page.filter((candidate)=>Math.abs(candidate.y-line.y)<=12);
      const numericItems=band.flatMap((candidate)=>candidate.items.map((item)=>({...item,y:candidate.y,lineIndex:page.indexOf(candidate)})))
        .filter((item)=>item.x<=processX+75&&/^[\d.\-\s]+$/.test(item.value));
      numericItems.sort((a,b)=>b.y-a.y||a.x-b.x);
      const reconstructed=numericItems.map((item)=>item.value).join(" ");
      for(const match of reconstructed.matchAll(pattern)) {
        const process=match[0].replace(/\s+/g,"");
        if(seen.has(process)) continue;
        seen.add(process);
        const prefix=numericItems.find((item)=>/\d{7}\s*-\s*$/.test(item.value.trim()));
        starts.push({index:pageOffset+(prefix?.lineIndex??lineIndex),match});
      }
    });
    pageOffset+=page.length;
  });
  return starts.sort((a,b)=>a.index-b.index);
}
function readPdfTable(pages,pattern) {
  let columns=null; const headerLines=new Set();
  for(const page of pages) {
    for(const line of page) {
      const band=page.filter((candidate)=>Math.abs(candidate.y-line.y)<=12);
      const key=headerKey(band.map((candidate)=>candidate.text).join(" "));
      if(!key.includes("processo")||!key.includes("data")||!key.includes("movimentacao")) continue;
      const process=headerColumnX(band,"processo");
      const date=headerColumnX(band,"data da ultima movimentacao");
      const movement=headerColumnX(band,"descricao da movimentacao");
      if(process!==null&&date!==null&&movement!==null) {
        columns??={process,date,movement,className:headerColumnX(band,"descricao da classe"),subject:headerColumnX(band,"descricao do assunto")};
        band.forEach((candidate)=>headerLines.add(candidate));
        break;
      }
    }
  }
  if(!columns) return null;
  const allLines=pages.flat();
  const starts=pdfTableStarts(pages,pattern,columns.process);
  const rows=[]; const seenProcesses=new Set();
  starts.forEach((start,index)=>{
    const next=starts[index+1];
    const recordLines=allLines.slice(start.index,next?.index??allLines.length);
    const process=start.match[0].replace(/\s+/g,"");
    const dataLines=recordLines.filter((line)=>!headerLines.has(line)&&!headerKey(line.text).includes("data da ultima movimentacao"));
    const dateText=pdfColumnText(dataLines,columns.date,columns.movement);
    const movement=pdfColumnText(dataLines,columns.movement,Infinity,20).slice(0,420);
    // In this PED export, the long class/subject headings are centered; their cell text starts earlier.
    const classStart=columns.className===null?null:columns.className-57;
    const subjectStart=columns.subject===null?null:columns.subject-102;
    const subjectEnd=columns.subject===null?null:columns.subject+58;
    const className=classStart===null||subjectStart===null?"Não identificado":pdfColumnText(dataLines,classStart+3,subjectStart+3);
    const subject=subjectStart===null||subjectEnd===null?"Não identificado":pdfColumnText(dataLines,subjectStart+3,subjectEnd+3);
    const row=makeRow(process,className,subject,(dateText.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/)||[])[0],movement);
    if(!seenProcesses.has(process)){seenProcesses.add(process);rows.push(row);}
  });
  return rows;
}

$("load-demo").onclick=()=>importRows(demoRows.map((r)=>makeRow(...r)),"dados de demonstração");
$("csv-input").addEventListener("change", async (event)=>{ const file=event.target.files[0]; if(!file)return; try { $("upload-feedback").textContent="Lendo o CSV localmente…"; importRows(parseCsv(await readCsv(file)),file.name); } catch(error) { $("upload-feedback").textContent=`Não consegui ler o CSV: ${error.message}`; } event.target.value=""; });
$("excel-input").addEventListener("change", async (event)=>{ const file=event.target.files[0]; if(!file)return; try { $("upload-feedback").textContent="Lendo a planilha localmente…"; importRows(parseExcel(await file.arrayBuffer()),file.name); } catch(error) { $("upload-feedback").textContent=`Não consegui ler a planilha: ${error.message}`; } event.target.value=""; });
$("pdf-input").addEventListener("change", async (event)=>{ const file=event.target.files[0]; if(!file)return; try { await readPdf(file); } catch(error) { $("upload-feedback").textContent=`Não consegui ler o PDF: ${error.message}`; } event.target.value=""; });
[$("search"),$("age-filter"),$("priority-filter")].forEach((element)=>element.addEventListener("input",render));
$("export-visible").onclick=()=>download("radar-selecao.csv",csvFor(rowsShown())); $("export-all").onclick=()=>download("radar-acervo.csv",csvFor(allRows)); $("export-special").onclick=()=>download("radar-atos-infracionais-adocao-protecao.csv",csvFor(allRows.filter((row)=>row.specialList.included)));
