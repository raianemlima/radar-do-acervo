import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("../vendor/xlsx.full.min.js");
assert.equal(XLSX.version, "0.20.3");
const pdfjs = await import("../vendor/pdf.min.mjs");
assert.equal(pdfjs.version, "6.3.289");

class FakeCard {
  constructor() { this.nodes = { ".queue-count": {}, h3: {}, ".queue-detail": {}, button: {} }; }
  querySelector(selector) { return this.nodes[selector]; }
}
class FakeElement {
  constructor(id) {
    this.id = id;
    this.listeners = {};
    this.value = ["age-filter", "priority-filter"].includes(id) ? "all" : "";
    this.children = [];
    this.hidden = false;
    if (id === "queue-template") this.content = { cloneNode: () => new FakeCard() };
  }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  append(child) { this.children.push(child); }
}

const elements = new Map();
globalThis.window = { XLSX };
globalThis.document = {
  baseURI: "http://localhost/",
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, new FakeElement(id));
    return elements.get(id);
  },
};

let source = await readFile(new URL("../app.js", import.meta.url), "utf8");
const hook = 'globalThis.__radarTest={parseCsv,parseExcel,readCsv,readPdfTable,csvFor,parseDate,makeRow};\n$("load-demo").onclick=';
assert.ok(source.includes('$("load-demo").onclick='));
source = source.replace('$("load-demo").onclick=', hook);
await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const api = globalThis.__radarTest;

function makeFile(bytes, name, type) {
  const file = new Blob([bytes], { type });
  Object.defineProperty(file, "name", { value: name });
  return file;
}
async function upload(id, file) {
  const input = document.getElementById(id);
  input.files = [file];
  await input.listeners.change({ target: input });
  return document.getElementById("upload-feedback").textContent;
}

assert.equal(api.parseDate("31/02/2026"), null);
assert.equal(api.parseDate("29/02/2024")?.getDate(), 29);
const formulaCsv = api.csvFor([api.makeRow("0001234-56.2024.8.06.0035", "=FORMULA()", "Assunto", "23/10/2026", "@FORMULA()")]);
assert.ok(formulaCsv.includes("\"'=FORMULA()\""));
assert.ok(formulaCsv.includes("\"'@FORMULA()\""));

const headers = "Processo;Descrição da Classe;Descrição do Assunto;Data da Última movimentação;Descrição da Movimentação";
const csv = `${headers}\r\n0001234-56.2024.8.06.0035;Apuração de ato infracional;Infância;22/10/2026;Representação por ato infracional\r\n`;
let status = await upload("csv-input", makeFile(Buffer.from(csv), "radar.csv", "text/csv"));
assert.match(status, /1 processo carregado/);
assert.match(document.getElementById("process-table").innerHTML, /Representação por ato infracional/);
assert.equal(document.getElementById("special-count").textContent, "1");

const workbook = XLSX.utils.book_new();
const sheet = XLSX.utils.aoa_to_sheet([
  ["Relatório PED"],
  ["Processo", "Classe processual", "Assunto", "Data último movimento", "Descrição do último movimento"],
  ["0007654-32.2024.8.06.0035", "Procedimento comum", "Contratos", "22/10/2026", "Juntada de petição"],
]);
XLSX.utils.book_append_sheet(workbook, sheet, "Relatório");
const xlsx = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
status = await upload("excel-input", makeFile(xlsx, "radar.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
assert.match(status, /1 processo carregado/);
assert.match(document.getElementById("process-table").innerHTML, /0007654-32\.2024\.8\.06\.0035/);
const xls = XLSX.write(workbook, { type: "array", bookType: "xls" });
status = await upload("excel-input", makeFile(xls, "radar.xls", "application/vnd.ms-excel"));
assert.match(status, /1 processo carregado/);
const xlsm = XLSX.write(workbook, { type: "array", bookType: "xlsm" });
status = await upload("excel-input", makeFile(xlsm, "radar.xlsm", "application/vnd.ms-excel.sheet.macroEnabled.12"));
assert.match(status, /1 processo carregado/);

const pdfPages = [[
  { y: 720, text: "Processo Data da Última movimentação Descrição da Movimentação", items: [
    { x: 10, value: "Processo" }, { x: 200, value: "Data da Última movimentação" }, { x: 400, value: "Descrição da Movimentação" },
  ] },
  { y: 680, text: "0009876-54.2023.8.06.0035 21/10/2026 Adoção conclusa para decisão", items: [
    { x: 10, value: "0009876-54.2023.8.06.0035" }, { x: 200, value: "21/10/2026" }, { x: 400, value: "Adoção conclusa para decisão" },
  ] },
]];
const pdfRows = api.readPdfTable(pdfPages, /\d{7}\s*-\s*\d{2}\s*\.\s*\d{4}\s*\.\s*\d\s*\.\s*\d{2}\s*\.\s*\d{4}/g);
assert.equal(pdfRows.length, 1);
assert.equal(pdfRows[0].process, "0009876-54.2023.8.06.0035");
assert.equal(pdfRows[0].lastDate?.getDate(), 21);
assert.match(pdfRows[0].movement, /Adoção conclusa para decisão/);
assert.equal(pdfRows[0].specialList.included, true);

console.log("PASS: datas, exportação CSV segura, importação CSV/Excel, lista especial e reconstrução da tabela de PDF.");
