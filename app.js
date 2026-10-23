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

const rules = [
  { terms:["trânsito em julgado", "transitado em julgado"], action:"Checklist de baixa assistida", owner:"Secretaria" },
  { terms:["cejusc", "acordo homologado"], action:"Checklist de baixa assistida", owner:"Secretaria" },
  { terms:["prazo", "intimação eletrônica", "publicação"], action:"Certificar decurso / controlar prazo", owner:"Secretaria" },
  { terms:["mandado devolvido", "mandado sem cumprimento"], action:"LER AUTOS — triagem de mandado", owner:"Secretaria" },
  { terms:["juntada", "petição", "laudo"], action:"LER AUTOS — analisar juntada", owner:"Secretaria" },
  { terms:["conclusão", "remeter à conclusão"], action:"Remeter à conclusão", owner:"Gabinete" },
];

let allRows = [];
let activeQueue = null;
const $ = (id) => document.getElementById(id);

function normal(text = "") { return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function parseDate(value) {
  const match = String(value || "").match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (!match) return null;
  let [,day,month,year] = match; if (year.length === 2) year = `20${year}`;
  const date = new Date(Number(year), Number(month) - 1, Number(day)); return Number.isNaN(date.getTime()) ? null : date;
}
function asDate(date) { return date ? date.toLocaleDateString("pt-BR") : "Não identificada"; }
function daysAgo(date) { return date ? Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000)) : 0; }
function ageState(days) { return days <= 30 ? "green" : days <= 100 ? "yellow" : "red"; }
function priority(row) { const text = normal(`${row.className} ${row.subject} ${row.movement}`); const terms = ["curatela","interdicao","guarda","alimentos","eca","infancia","adolesc","saude"]; const hit = terms.find((term) => text.includes(term)); return hit ? `Sim — ${hit === "eca" ? "ECA" : hit}` : "Não"; }
function route(row) { const text = normal(row.movement); const rule = rules.find((item) => item.terms.some((term) => text.includes(normal(term)))); return rule || { action:"LER AUTOS", owner:"Secretaria" }; }
function makeRow(process, className, subject, date, movement) { const lastDate = parseDate(date); const idleDays = daysAgo(lastDate); const base = { process:String(process || "Sem número"), className:String(className || "Não informado"), subject:String(subject || "Não informado"), lastDate, movement:String(movement || "Movimento não identificado"), idleDays }; return { ...base, priority:priority(base), ...route(base) }; }

function parseCsv(text) {
  const source = text.replace(/^\uFEFF/, "");
  const parseRecords = (delimiter) => {
    const records=[]; let record=[], cell="", quoted=false;
    for(let i=0;i<source.length;i++) {
      const char=source[i];
      if(char==='"') {
        if(quoted && source[i+1]==='"') { cell+='"'; i++; }
        else quoted=!quoted;
      } else if(char===delimiter && !quoted) { record.push(cell.trim()); cell=""; }
      else if((char==="\n" || char==="\r") && !quoted) {
        if(char==="\r" && source[i+1]==="\n") i++;
        record.push(cell.trim()); cell="";
        if(record.some((value)=>value!=="")) records.push(record);
        record=[];
      } else cell+=char;
    }
    record.push(cell.trim()); if(record.some((value)=>value!=="")) records.push(record);
    return records;
  };
  const countSeparators = (delimiter) => { let quoted=false,count=0; for(let i=0;i<source.length;i++){ const c=source[i]; if(c==='"'){ if(quoted && source[i+1]==='"') i++; else quoted=!quoted; } else if(!quoted && (c==="\r" || c==="\n")) break; else if(!quoted && c===delimiter) count++; } return count; };
  const delimiter = countSeparators(";") >= countSeparators(",") ? ";" : ",";
  const records = parseRecords(delimiter);
  const headers = (records.shift() || []).map(normal);
  const field = (names) => { const index = headers.findIndex((header) => names.some((name) => header.includes(name))); return index; };
  const indexes = { process:field(["processo","numero","número"]), className:field(["classe"]), subject:field(["assunto"]), date:field(["data", "movimento em"]), movement:field(["ultimo movimento","último movimento","descricao","descrição","movimento"]) };
  if (indexes.process < 0 || indexes.movement < 0) throw new Error("Não encontrei as colunas ‘processo’ e ‘último movimento’. Baixe o modelo CSV para conferir o formato.");
  return records.map((cells) => makeRow(cells[indexes.process], cells[indexes.className], cells[indexes.subject], cells[indexes.date], cells[indexes.movement])).filter((row) => row.process !== "Sem número");
}
function rowsShown() { const search = normal($("search").value); const age = $("age-filter").value; const priorityFilter = $("priority-filter").value; return allRows.filter((row) => { const searchable = normal(`${row.process} ${row.movement} ${row.action}`); return (!search || searchable.includes(search)) && (age === "all" || ageState(row.idleDays) === age) && (priorityFilter === "all" || (priorityFilter === "yes" ? row.priority !== "Não" : row.priority === "Não")) && (!activeQueue || row.action === activeQueue); }); }
function queueStats(rows) { const map = new Map(); rows.forEach((row) => map.set(row.action, [...(map.get(row.action)||[]),row])); return [...map.entries()].sort((a,b)=>b[1].length-a[1].length); }
function render() { const rows = rowsShown(); $("empty-state").hidden = allRows.length > 0; $("app-content").hidden = allRows.length === 0; $("dataset-title").textContent = `${allRows.length.toLocaleString("pt-BR")} processos importados`;
  $("total-count").textContent = rows.length.toLocaleString("pt-BR"); $("over-100-count").textContent = rows.filter((r)=>r.idleDays>100).length.toLocaleString("pt-BR"); $("over-year-count").textContent = rows.filter((r)=>r.idleDays>365).length.toLocaleString("pt-BR"); $("cnj-count").textContent = rows.filter((r)=>/\.(20(0\d|1[0-5]))\./.test(r.process)).length.toLocaleString("pt-BR");
  const queueRoot = $("queue-cards"); queueRoot.innerHTML=""; queueStats(allRows).forEach(([action, items]) => { const card=$("queue-template").content.cloneNode(true); card.querySelector(".queue-count").textContent=`${items.length} processos`; card.querySelector("h3").textContent=action; card.querySelector(".queue-detail").textContent=`${items.filter((r)=>r.idleDays>100).length} com mais de 100 dias · ${items.filter((r)=>r.priority!=="Não").length} prioridades`; const button=card.querySelector("button"); button.textContent=activeQueue===action?"Mostrar todos":"Ver lote"; button.onclick=()=>{ activeQueue=activeQueue===action?null:action; render(); }; queueRoot.append(card); });
  $("process-table").innerHTML = rows.map((row) => `<tr><td class="process">${escapeHtml(row.process)}</td><td class="movement">${escapeHtml(row.movement)}</td><td>${asDate(row.lastDate)}</td><td><span class="badge ${ageState(row.idleDays)}">${row.lastDate ? `${row.idleDays} dias` : "conferir"}</span></td><td class="act">${escapeHtml(row.action)}</td><td>${escapeHtml(row.owner)}</td><td class="${row.priority === "Não" ? "" : "priority"}">${escapeHtml(row.priority)}</td></tr>`).join("") || `<tr><td colspan="7">Nenhum processo encontrado com estes filtros.</td></tr>`;
}
function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (char)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[char])); }
function csvFor(rows) { const header=["Processo","Classe","Assunto","Data do último movimento","Último movimento","Dias parado","Próximo ato","Responsável","Prioridade legal"]; const lines=rows.map((r)=>[r.process,r.className,r.subject,asDate(r.lastDate),r.movement,r.idleDays,r.action,r.owner,r.priority].map((value)=>`"${String(value).replaceAll('"','""')}"`).join(";")); return "\uFEFF"+[header.join(";"),...lines].join("\n"); }
function download(name, data) { const url=URL.createObjectURL(new Blob([data],{type:"text/csv;charset=utf-8"})); const link=document.createElement("a"); link.href=url; link.download=name; link.click(); URL.revokeObjectURL(url); }
function importRows(rows, description) { allRows=rows; activeQueue=null; $("upload-feedback").textContent=`${rows.length.toLocaleString("pt-BR")} processos carregados${description ? ` · ${description}` : ""}. Confira os encaminhamentos antes de usar.`; render(); }
async function readPdf(file) { $("upload-feedback").textContent="Lendo o PDF localmente…";
  let pdfjs;
  try {
    pdfjs = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs");
  } catch {
    throw new Error("A biblioteca de leitura de PDF não pôde ser carregada. Verifique a conexão e abra o app pelo GitHub Pages.");
  }
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";
  const pdf = await pdfjs.getDocument({data:await file.arrayBuffer()}).promise; let text=""; for(let page=1; page<=pdf.numPages; page++){ const content=await (await pdf.getPage(page)).getTextContent(); text += `${content.items.map((item)=>item.str).join(" ")}\n`; }
  const cnjPattern = /(?=\d{7}\s*-\s*\d{2}\s*\.\s*\d{4}\s*\.\s*\d\s*\.\s*\d{2}\s*\.\s*\d{4})/g;
  const chunks=text.split(cnjPattern);
  const rows=chunks.map((chunk)=>{
    const match=chunk.match(/\d{7}\s*-\s*\d{2}\s*\.\s*\d{4}\s*\.\s*\d\s*\.\s*\d{2}\s*\.\s*\d{4}/);
    const process=match?.[0].replace(/\s+/g,"");
    const date=(chunk.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)||[])[0];
    if(!process) return null;
    const movement=chunk.replace(match[0],"").replace(date||"","").replace(/\s+/g," ").trim().slice(-420);
    return makeRow(process,"Não identificado","Não identificado",date,movement);
  }).filter(Boolean);
  if(!rows.length) throw new Error("Não foi possível localizar números CNJ no PDF. Exporte o relatório como CSV e importe-o aqui."); importRows(rows,"extraídos do PDF — valide o texto do movimento");
}

$("load-demo").onclick=()=>importRows(demoRows.map((r)=>makeRow(...r)),"dados de demonstração");
$("csv-input").addEventListener("change", async (event)=>{ const file=event.target.files[0]; if(!file)return; try { importRows(parseCsv(await file.text()),file.name); } catch(error) { $("upload-feedback").textContent=error.message; } event.target.value=""; });
$("pdf-input").addEventListener("change", async (event)=>{ const file=event.target.files[0]; if(!file)return; try { await readPdf(file); } catch(error) { $("upload-feedback").textContent=`Não consegui ler o PDF: ${error.message}`; } event.target.value=""; });
[$("search"),$("age-filter"),$("priority-filter")].forEach((element)=>element.addEventListener("input",render));
$("export-visible").onclick=()=>download("radar-selecao.csv",csvFor(rowsShown())); $("export-all").onclick=()=>download("radar-acervo.csv",csvFor(allRows));
