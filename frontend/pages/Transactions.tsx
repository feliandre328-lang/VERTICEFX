import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { SystemState } from "../types";
import {
  DailyPerformanceDistribution,
  InvestmentItem,
  Me,
  WithdrawalItem,
  fetchMe,
  listDailyPerformanceDistributions,
  listInvestments,
  listWithdrawals,
} from "../services/api";
import { useAuth } from "../layouts/AuthContext";

interface TransactionsProps {
  state: SystemState;
}

type StatementRow = {
  id: string;
  date: string;
  operation: "APORTE" | "RESGATE_CAPITAL" | "LIQUIDACAO_RESULTADO" | "DISTRIBUICAO";
  description: string;
  status: string;
  amount: number;
  direction: "IN" | "OUT";
};

const normalizeSearchText = (value: unknown) => {
  const text = String(value ?? "").toLowerCase().trim();
  if (typeof text.normalize !== "function") return text;
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const TABLE_X = 45;
const TABLE_W = 505;
const ROW_H = 24;
const ROWS_PER_PAGE = 19;

const toAscii = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "");

const escapePdfText = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function buildPdfBytes(pageStreams: string[]): Uint8Array {
  const objects: string[] = [];
  const fontObjectNumber = 3;
  const firstPageObject = 4;
  const pageObjectNumbers: number[] = [];
  const contentObjectNumbers: number[] = [];

  for (let i = 0; i < pageStreams.length; i++) {
    pageObjectNumbers.push(firstPageObject + i * 2);
    contentObjectNumbers.push(firstPageObject + i * 2 + 1);
  }

  const kidsRef = pageObjectNumbers.map((n) => `${n} 0 R`).join(" ");
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${kidsRef}] /Count ${pageStreams.length} >>`;
  objects[fontObjectNumber] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  for (let i = 0; i < pageStreams.length; i++) {
    const pageObj = pageObjectNumbers[i];
    const contentObj = contentObjectNumbers[i];
    const stream = pageStreams[i];
    objects[contentObj] = `<< /Length ${stream.length} >>
stream
${stream}
endstream`;
    objects[pageObj] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObj} 0 R >>`;
  }

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i++) {
    if (!objects[i]) continue;
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  const size = objects.length;
  pdf += `xref
0 ${size}
0000000000 65535 f 
`;
  for (let i = 1; i < size; i++) {
    const off = String(offsets[i] || 0).padStart(10, "0");
    pdf += `${off} 00000 n \n`;
  }

  pdf += `trailer
<< /Size ${size} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

  return new TextEncoder().encode(pdf);
}

const formatPdfMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const safeCell = (value: string, max = 20) => {
  const normalized = toAscii(value || "");
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
};

const operationLabel = (op: StatementRow["operation"]) => {
  if (op === "RESGATE_CAPITAL") return "RESGATE CAPITAL";
  if (op === "LIQUIDACAO_RESULTADO") return "LIQ. RESULTADO";
  if (op === "DISTRIBUICAO") return "DISTRIBUICAO";
  return "APORTE";
};

const textCmd = (x: number, y: number, size: number, text: string) =>
  `0.12 0.16 0.22 rg
BT /F1 ${size} Tf ${x} ${y} Td (${escapePdfText(toAscii(text))}) Tj ET`;

function buildPageStream(params: {
  rows: StatementRow[];
  pageIndex: number;
  pageCount: number;
  clientDisplayName: string;
  clientUsername: string;
  clientEmail: string;
  clientId: string;
  clientCpf: string;
  clientPhone: string;
  clientDob: string;
  clientJoinedAt: string;
  clientStatus: string;
  clientAddressLine1: string;
  clientAddressLine2: string;
  role: string;
  clientTotalInvested: number;
  clientCapitalRedeemed: number;
  clientResultGenerated: number;
  clientResultSettled: number;
  clientPatrimony: number;
  totalIn: number;
  totalOut: number;
}) {
  const {
    rows,
    pageIndex,
    pageCount,
    clientDisplayName,
    clientUsername,
    clientEmail,
    clientId,
    clientCpf,
    clientPhone,
    clientDob,
    clientJoinedAt,
    clientStatus,
    clientAddressLine1,
    clientAddressLine2,
    role,
    clientTotalInvested,
    clientCapitalRedeemed,
    clientResultGenerated,
    clientResultSettled,
    clientPatrimony,
    totalIn,
    totalOut,
  } = params;
  const cmds: string[] = [];

  cmds.push("0.95 0.97 1 rg");
  cmds.push("40 752 515 70 re f");
  cmds.push("0.15 0.39 0.93 rg");
  cmds.push("64 812 m 82 772 l 46 772 l h f");
  cmds.push("0.06 0.72 0.51 rg");
  cmds.push("57 778 4 14 re f");
  cmds.push("64 778 4 24 re f");
  cmds.push("71 778 4 34 re f");
  cmds.push(textCmd(98, 797, 18, "VERTICE FX"));
  cmds.push(textCmd(98, 780, 10, "Extrato Financeiro"));
  cmds.push(textCmd(425, 780, 9, `Pagina ${pageIndex + 1}/${pageCount}`));
  cmds.push("0.86 0.89 0.94 RG 1 w");
  cmds.push("40 744 m 555 744 l S");

  cmds.push("0.98 0.99 1 rg");
  cmds.push("40 560 515 172 re f");
  cmds.push("0.87 0.9 0.95 RG 1 w");
  cmds.push("40 560 515 172 re S");
  cmds.push(textCmd(50, 718, 9, safeCell(`Cliente: ${clientDisplayName}`, 55)));
  cmds.push(textCmd(50, 704, 9, safeCell(`Usuario: ${clientUsername}`, 55)));
  cmds.push(textCmd(50, 690, 9, safeCell(`Email: ${clientEmail}`, 55)));
  cmds.push(textCmd(50, 676, 9, safeCell(`CPF: ${clientCpf}`, 55)));
  cmds.push(textCmd(50, 662, 9, safeCell(`Telefone: ${clientPhone}`, 55)));
  cmds.push(textCmd(50, 648, 9, safeCell(`Nascimento: ${clientDob}`, 55)));
  cmds.push(textCmd(50, 634, 9, safeCell(`Endereco: ${clientAddressLine1}`, 55)));
  cmds.push(textCmd(50, 620, 9, safeCell(`Localidade: ${clientAddressLine2}`, 55)));

  cmds.push(textCmd(330, 718, 9, safeCell(`ID: ${clientId}`, 38)));
  cmds.push(textCmd(330, 704, 9, safeCell(`Perfil: ${role}`, 38)));
  cmds.push(textCmd(330, 690, 9, safeCell(`Status: ${clientStatus}`, 38)));
  cmds.push(textCmd(330, 676, 9, safeCell(`Cadastro: ${clientJoinedAt}`, 38)));
  cmds.push(textCmd(330, 662, 9, safeCell(`Total aportado: ${toAscii(formatPdfMoney(clientTotalInvested))}`, 38)));
  cmds.push(textCmd(330, 648, 9, safeCell(`Resgate capital: ${toAscii(formatPdfMoney(clientCapitalRedeemed))}`, 38)));
  cmds.push(textCmd(330, 634, 9, safeCell(`Resultado gerado: ${toAscii(formatPdfMoney(clientResultGenerated))}`, 38)));
  cmds.push(textCmd(330, 620, 9, safeCell(`Resultado liquidado: ${toAscii(formatPdfMoney(clientResultSettled))}`, 38)));
  cmds.push(textCmd(330, 606, 9, safeCell(`Patrimonio atual: ${toAscii(formatPdfMoney(clientPatrimony))}`, 38)));
  cmds.push(textCmd(330, 592, 9, safeCell(`Extrato entradas: ${toAscii(formatPdfMoney(totalIn))}`, 38)));
  cmds.push(textCmd(330, 578, 9, safeCell(`Extrato saidas: ${toAscii(formatPdfMoney(totalOut))}`, 38)));
  cmds.push(textCmd(330, 564, 9, safeCell(`Extrato liquido: ${toAscii(formatPdfMoney(totalIn - totalOut))}`, 38)));

  cmds.push("0.92 0.94 0.97 rg");
  cmds.push(`${TABLE_X} 528 ${TABLE_W} ${ROW_H} re f`);
  cmds.push("0.8 0.84 0.9 RG 1 w");
  cmds.push(`${TABLE_X} 528 ${TABLE_W} ${ROW_H} re S`);
  cmds.push(textCmd(52, 536, 9, "Data"));
  cmds.push(textCmd(128, 536, 9, "Operacao"));
  cmds.push(textCmd(208, 536, 9, "ID"));
  cmds.push(textCmd(302, 536, 9, "Status"));
  cmds.push(textCmd(455, 536, 9, "Valor"));

  const tableStartY = 528 - ROW_H;
  rows.forEach((row, idx) => {
    const y = tableStartY - idx * ROW_H;
    if (idx % 2 === 0) {
      cmds.push("0.985 0.988 0.995 rg");
      cmds.push(`${TABLE_X} ${y} ${TABLE_W} ${ROW_H} re f`);
    }

    cmds.push("0.9 0.92 0.95 RG 0.8 w");
    cmds.push(`${TABLE_X} ${y} ${TABLE_W} ${ROW_H} re S`);
    const valueLabel = `${row.direction === "OUT" ? "-" : "+"}${formatPdfMoney(row.amount)}`;
    cmds.push(textCmd(52, y + 8, 9, new Date(row.date).toLocaleDateString("pt-BR")));
    cmds.push(textCmd(128, y + 8, 9, safeCell(row.operation, 17)));
    cmds.push(textCmd(208, y + 8, 9, safeCell(row.id, 14)));
    cmds.push(textCmd(302, y + 8, 9, safeCell(row.status, 14)));
    cmds.push(textCmd(432, y + 8, 9, toAscii(valueLabel)));
  });

  cmds.push(textCmd(40, 38, 8, "Documento gerado automaticamente pela plataforma Vertice FX."));
  cmds.push(textCmd(40, 26, 8, `Emitido em ${new Date().toLocaleString("pt-BR")}`));

  return cmds.join("\n");
}

const Transactions: React.FC<TransactionsProps> = ({ state: _state }) => {
  const { getAccessToken, user, role } = useAuth();
  const access = useMemo(() => getAccessToken(), [getAccessToken]);

  const [investments, setInvestments] = useState<InvestmentItem[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [distributions, setDistributions] = useState<DailyPerformanceDistribution[]>([]);
  const [statementUser, setStatementUser] = useState<Me | null>(user ?? null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setStatementUser(user ?? null);
  }, [user]);

  const loadStatementData = useCallback(async () => {
    if (!access) return;
    try {
      setLoadingData(true);
      setDataError("");
      const [investmentData, withdrawalData, distributionData, meData] = await Promise.all([
        listInvestments(access),
        listWithdrawals(access),
        listDailyPerformanceDistributions(access),
        fetchMe(access).catch(() => null),
      ]);
      const resolvedUser = meData ?? user ?? null;
      const resolvedUserId = Number(resolvedUser?.id);
      setStatementUser(resolvedUser);

      const filterByUser = (items: any[]) => {
        if (!Array.isArray(items)) return [];
        const hasUserField = items.some((item) => item?.user_id !== undefined || item?.user !== undefined);
        if (!hasUserField) return items;
        if (!Number.isFinite(resolvedUserId)) return [];
        return items.filter((item) => {
          const itemUserId = item?.user_id ?? item?.user;
          return Number(itemUserId) === resolvedUserId;
        });
      };

      setInvestments(filterByUser(investmentData ?? []) as InvestmentItem[]);
      setWithdrawals(filterByUser(withdrawalData ?? []) as WithdrawalItem[]);
      setDistributions(filterByUser(distributionData ?? []) as DailyPerformanceDistribution[]);
    } catch (e: any) {
      setDataError(e?.message ?? "Falha ao carregar extrato.");
    } finally {
      setLoadingData(false);
    }
  }, [access, user]);

  useEffect(() => {
    if (!access) return;
    void loadStatementData();
  }, [access, loadStatementData]);

  useEffect(() => {
    if (!access) return;
    const onNotif = () => {
      void loadStatementData();
    };

    window.addEventListener("vfx:notifications:new", onNotif);
    return () => window.removeEventListener("vfx:notifications:new", onNotif);
  }, [access, loadStatementData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const mapInvestmentStatus = (status: string) => {
    if (status === "APPROVED") return "Aprovado";
    if (status === "PENDING") return "Pendente";
    if (status === "REJECTED") return "Rejeitado";
    return status;
  };

  const mapWithdrawalStatus = (status: string) => {
    if (status === "PAID") return "Concluido";
    if (status === "PENDING") return "Em Analise";
    if (status === "REJECTED") return "Rejeitado";
    if (status === "APPROVED") return "Aprovado";
    return status;
  };

  const formatClientDate = (value?: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return "-";
    return parsed.toLocaleDateString("pt-BR");
  };

  const clientInfo = useMemo(() => {
    const source = statementUser ?? user ?? null;
    const profile = source?.profile ?? null;
    const clean = (value?: string | null) => String(value ?? "").trim();

    const addressHead = [clean(profile?.street), clean(profile?.number)].filter(Boolean).join(", ");
    const complement = clean(profile?.complement);
    const addressLine1 = addressHead
      ? `${addressHead}${complement ? ` - ${complement}` : ""}`
      : complement || "-";

    const cityState = [clean(profile?.city), clean(profile?.state)].filter(Boolean).join("/");
    const addressLine2 = [clean(profile?.neighborhood), cityState, clean(profile?.zip_code) ? `CEP ${clean(profile?.zip_code)}` : ""]
      .filter(Boolean)
      .join(" | ");

    return {
      displayName: clean(profile?.full_name) || clean(source?.username) || "Cliente",
      username: clean(source?.username) || "-",
      email: clean(source?.email) || "-",
      id: source?.id ? String(source.id) : "-",
      role: role || "CLIENT",
      cpf: clean(profile?.cpf) || "-",
      phone: clean(profile?.phone) || "-",
      dob: formatClientDate(profile?.dob),
      joinedAt: formatClientDate(source?.date_joined),
      status: source?.is_active === false ? "Inativo" : source?.is_active === true ? "Ativo" : "-",
      zipCode: clean(profile?.zip_code) || "-",
      street: clean(profile?.street) || "-",
      number: clean(profile?.number) || "-",
      complement: clean(profile?.complement) || "-",
      neighborhood: clean(profile?.neighborhood) || "-",
      city: clean(profile?.city) || "-",
      state: clean(profile?.state) || "-",
      addressLine1,
      addressLine2: addressLine2 || "-",
    };
  }, [statementUser, user, role]);

  const clientTotals = useMemo(() => {
    const approvedInvestmentCents = investments
      .filter((inv) => String(inv?.status ?? "").toUpperCase() === "APPROVED")
      .reduce((sum, inv) => sum + Number(inv?.amount_cents ?? 0), 0);

    const capitalRedeemedCents = withdrawals
      .filter((wd) => {
        const type = String(wd?.withdrawal_type ?? "").toUpperCase();
        const status = String(wd?.status ?? "").toUpperCase();
        return type === "CAPITAL_REDEMPTION" && (status === "APPROVED" || status === "PAID");
      })
      .reduce((sum, wd) => sum + Number(wd?.amount_cents ?? 0), 0);

    const resultSettledCents = withdrawals
      .filter((wd) => {
        const type = String(wd?.withdrawal_type ?? "").toUpperCase();
        const status = String(wd?.status ?? "").toUpperCase();
        return type === "RESULT_SETTLEMENT" && (status === "APPROVED" || status === "PAID");
      })
      .reduce((sum, wd) => sum + Number(wd?.amount_cents ?? 0), 0);

    const resultGeneratedCents = distributions.reduce((sum, dist) => sum + Number(dist?.result_cents ?? 0), 0);

    const capitalBalanceCents = Math.max(approvedInvestmentCents - capitalRedeemedCents, 0);
    const resultBalanceCents = Math.max(resultGeneratedCents - resultSettledCents, 0);
    const patrimonyCents = capitalBalanceCents + resultBalanceCents;

    return {
      totalInvested: approvedInvestmentCents / 100,
      capitalRedeemed: capitalRedeemedCents / 100,
      resultGenerated: resultGeneratedCents / 100,
      resultSettled: resultSettledCents / 100,
      patrimony: patrimonyCents / 100,
    };
  }, [investments, withdrawals, distributions]);

  const rows = useMemo<StatementRow[]>(() => {
    const aporteRows: StatementRow[] = investments.map((inv) => ({
      id: String(inv.id),
      date: inv.created_at,
      operation: "APORTE",
      description: `Aporte #${inv.id}`,
      status: mapInvestmentStatus(inv.status),
      amount: (inv.amount_cents ?? 0) / 100,
      direction: "IN",
    }));

    const withdrawalRows: StatementRow[] = withdrawals.map((wd) => ({
      id: String(wd.id),
      date: wd.requested_at,
      operation: wd.withdrawal_type === "CAPITAL_REDEMPTION" ? "RESGATE_CAPITAL" : "LIQUIDACAO_RESULTADO",
      description:
        wd.withdrawal_type === "CAPITAL_REDEMPTION"
          ? `Resgate de Capital #${wd.id}`
          : `Liquidacao de Resultados #${wd.id}`,
      status: mapWithdrawalStatus(wd.status),
      amount: (wd.amount_cents ?? 0) / 100,
      direction: "OUT",
    }));

    const distributionRows: StatementRow[] = distributions.map((dist) => ({
      id: String(dist.id),
      date: dist.created_at,
      operation: "DISTRIBUICAO",
      description: `Distribuicao Diaria (${dist.reference_date})`,
      status: "Concluido",
      amount: (dist.result_cents ?? 0) / 100,
      direction: "IN",
    }));

    return [...aporteRows, ...withdrawalRows, ...distributionRows].sort((a, b) => {
      const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (byDate !== 0) return byDate;
      return b.id.localeCompare(a.id);
    });
  }, [investments, withdrawals, distributions]);

  const filteredRows = useMemo<StatementRow[]>(() => {
    try {
      const q = normalizeSearchText(searchTerm);
      if (!q) return rows;

      return rows.filter((row) => {
        const rowDate = new Date(row.date);
        const dateLabel = Number.isFinite(rowDate.getTime()) ? rowDate.toLocaleDateString("pt-BR") : "";
        const dateTimeLabel = Number.isFinite(rowDate.getTime()) ? rowDate.toLocaleString("pt-BR") : "";
        const amountNumber = Number(row.amount);
        const safeAmount = Number.isFinite(amountNumber) ? amountNumber : 0;
        const amountFixed = safeAmount.toFixed(2);
        const amountCurrency = formatCurrency(safeAmount);
        const amountComma = amountFixed.replace(".", ",");
        const amountDigitsOnly = amountCurrency.replace(/[^\d]/g, "");
        const fields = [
          row.id,
          row.date,
          dateLabel,
          dateTimeLabel,
          operationLabel(row.operation),
          row.operation,
          row.description,
          row.status,
          amountCurrency,
          amountFixed,
          amountComma,
          amountDigitsOnly,
        ];

        return fields.some((value) => normalizeSearchText(value).includes(q));
      });
    } catch {
      return rows;
    }
  }, [rows, searchTerm]);

  const StatusBadge = ({ status }: { status: string }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
        status === "Aprovado" || status === "Concluido"
          ? "bg-emerald-900/20 text-emerald-400"
          : status === "Pendente" || status === "Em Analise"
          ? "bg-amber-900/20 text-amber-500"
          : "bg-red-900/20 text-red-500"
      }`}
    >
      {status}
    </span>
  );

  const handleExportPdf = () => {
    if (filteredRows.length === 0) {
      alert("Sem dados para exportar.");
      return;
    }

    const totalIn = filteredRows.filter((r) => r.direction === "IN").reduce((sum, r) => sum + r.amount, 0);
    const totalOut = filteredRows.filter((r) => r.direction === "OUT").reduce((sum, r) => sum + r.amount, 0);
    const chunks: StatementRow[][] = [];
    for (let i = 0; i < filteredRows.length; i += ROWS_PER_PAGE) {
      chunks.push(filteredRows.slice(i, i + ROWS_PER_PAGE));
    }

    const pdfRows = chunks.map((chunk) =>
      chunk.map((r) => ({
        ...r,
        operation: operationLabel(r.operation),
      }))
    );

    const pageStreams = pdfRows.map((chunk, idx) =>
      buildPageStream({
        rows: chunk as StatementRow[],
        pageIndex: idx,
        pageCount: pdfRows.length,
        clientDisplayName: clientInfo.displayName,
        clientUsername: clientInfo.username,
        clientEmail: clientInfo.email,
        clientId: clientInfo.id,
        clientCpf: clientInfo.cpf,
        clientPhone: clientInfo.phone,
        clientDob: clientInfo.dob,
        clientJoinedAt: clientInfo.joinedAt,
        clientStatus: clientInfo.status,
        clientAddressLine1: clientInfo.addressLine1,
        clientAddressLine2: clientInfo.addressLine2,
        role: clientInfo.role,
        clientTotalInvested: clientTotals.totalInvested,
        clientCapitalRedeemed: clientTotals.capitalRedeemed,
        clientResultGenerated: clientTotals.resultGenerated,
        clientResultSettled: clientTotals.resultSettled,
        clientPatrimony: clientTotals.patrimony,
        totalIn,
        totalOut,
      })
    );

    const pdfBytes = buildPdfBytes(pageStreams);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const dateSuffix = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extrato-financeiro-${dateSuffix}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-0">
        <h2 className="text-xl font-bold text-white">Extrato Financeiro</h2>
        <button
          onClick={handleExportPdf}
          disabled={filteredRows.length === 0}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded border border-slate-700 transition-colors text-xs font-medium w-full sm:w-auto"
        >
          <Download size={14} />
          Exportar PDF
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-semibold text-slate-200">Dados do Cliente</h3>
          <span className="text-[11px] text-slate-500 uppercase tracking-wider">{clientInfo.status}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Nome completo</p>
            <p className="text-slate-200">{clientInfo.displayName}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Usuario</p>
            <p className="text-slate-200">{clientInfo.username}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Email</p>
            <p className="text-slate-200 break-all">{clientInfo.email}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">ID</p>
            <p className="text-slate-200">{clientInfo.id}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">CPF</p>
            <p className="text-slate-200">{clientInfo.cpf}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Telefone</p>
            <p className="text-slate-200">{clientInfo.phone}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Nascimento</p>
            <p className="text-slate-200">{clientInfo.dob}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Cadastro</p>
            <p className="text-slate-200">{clientInfo.joinedAt}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">CEP</p>
            <p className="text-slate-200">{clientInfo.zipCode}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Rua</p>
            <p className="text-slate-200">{clientInfo.street}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Numero</p>
            <p className="text-slate-200">{clientInfo.number}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Complemento</p>
            <p className="text-slate-200">{clientInfo.complement}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Bairro</p>
            <p className="text-slate-200">{clientInfo.neighborhood}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Cidade</p>
            <p className="text-slate-200">{clientInfo.city}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Estado</p>
            <p className="text-slate-200">{clientInfo.state}</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-wider">Perfil</p>
            <p className="text-slate-200">{clientInfo.role}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar por data, valor, operacao, descricao, status ou ID..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 pl-10 pr-20 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-900"
        />
        {searchTerm ? (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
          >
            Limpar
          </button>
        ) : null}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        {loadingData ? (
          <div className="px-6 py-12 text-center text-slate-500">Carregando extrato...</div>
        ) : dataError ? (
          <div className="px-6 py-4 text-sm text-red-300 bg-red-500/10 border-b border-red-500/20">{dataError}</div>
        ) : null}

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-600">Nenhum registro encontrado.</div>
        ) : filteredRows.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-600">Nenhum registro encontrado para essa busca.</div>
        ) : (
          <div>
            <div className="md:hidden p-4 space-y-3">
              {filteredRows.map((row) => (
                <div key={`${row.operation}-${row.id}`} className="bg-slate-800/50 p-4 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between items-start mb-3">
                    <div className="pr-4">
                      <span className="text-slate-300 text-sm font-medium block">{row.description}</span>
                      <span className="text-slate-500 text-xs">ID: {row.id}</span>
                    </div>
                    <span className={`text-lg font-medium whitespace-nowrap ${row.direction === "OUT" ? "text-slate-400" : "text-slate-200"}`}>
                      {row.direction === "OUT" ? "-" : "+"} {formatCurrency(row.amount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <div className="text-slate-500 mb-1">Data</div>
                      <div className="text-slate-300">{new Date(row.date).toLocaleDateString("pt-BR")}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">Operacao</div>
                      <div className="font-mono text-slate-300">{operationLabel(row.operation)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-500 mb-1">Status</div>
                      <StatusBadge status={row.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-950/50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Operacao</th>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Descricao</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredRows.map((row) => (
                    <tr key={`${row.operation}-${row.id}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-300">{new Date(row.date).toLocaleDateString("pt-BR")}</div>
                        <div className="text-[10px] text-slate-600">{new Date(row.date).toLocaleTimeString("pt-BR")}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-300">{operationLabel(row.operation)}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300">{row.id}</td>
                      <td className="px-6 py-4 text-slate-300 text-xs">{row.description}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className={`px-6 py-4 text-right font-medium text-sm ${row.direction === "OUT" ? "text-slate-400" : "text-slate-200"}`}>
                        {row.direction === "OUT" ? "-" : "+"} {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
