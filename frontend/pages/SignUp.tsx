import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  ChevronLeft,
  ScanLine,
  Phone,
  Calendar,
  MapPin,
  Home,
  PlusSquare,
  Map,
  CheckCircle,
} from "lucide-react";

interface SignUpProps {
  onSignUp?: (data: any) => void;
  onBackToLogin: () => void;
}

const STEPS = [
  { number: 1, title: "Credenciais" },
  { number: 2, title: "Dados Pessoais" },
  { number: 3, title: "Endereço" },
];

// ✅ Base da API
const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api";

/* -------------------- MASKS -------------------- */
function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function maskCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

// ✅ formato: (XX) 9 9999-1234
function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);

  if (d.length <= 2) return d;
  if (d.length <= 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;

  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

/* -------------------- VALIDATIONS -------------------- */
// CPF (igual ao backend)
function isValidCPF(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (cpf === cpf[0].repeat(11)) return false;

  const calcDigit = (digs: string) => {
    let s = 0;
    for (let i = 0; i < digs.length; i++) {
      s += Number(digs[i]) * (digs.length + 1 - i);
    }
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };

  const d1 = calcDigit(cpf.slice(0, 9));
  const d2 = calcDigit(cpf.slice(0, 10));
  return cpf.slice(9) === `${d1}${d2}`;
}

// DDDs válidos (Brasil)
const VALID_DDDS = new Set([
  "11","12","13","14","15","16","17","18","19",
  "21","22","24","27","28",
  "31","32","33","34","35","37","38",
  "41","42","43","44","45","46",
  "47","48","49",
  "51","53","54","55",
  "61","62","63","64","65","66","67","68","69",
  "71","73","74","75","77","79",
  "81","82","83","84","85","86","87","88","89",
  "91","92","93","94","95","96","97","98","99",
]);

function isRepeatedDigits(v: string) {
  const d = onlyDigits(v);
  return d.length > 0 && d === d[0].repeat(d.length);
}

// Telefone premium: 11 dígitos + DDD válido + não repetido
function validatePhoneBR(value: string): string | null {
  const d = onlyDigits(value);
  if (!d) return null; // enquanto vazio, não acusa
  if (d.length !== 11) return "Telefone incompleto. Use DDD + número (11 dígitos).";
  if (isRepeatedDigits(d)) return "Telefone inválido.";
  const ddd = d.slice(0, 2);
  if (!VALID_DDDS.has(ddd)) return "DDD inválido.";
  // dígito 3 (após DDD) é o 9 em celulares modernos
  if (d[2] !== "9") return "Celular inválido. O número deve começar com 9 após o DDD.";
  return null;
}

function validateCEP(value: string): string | null {
  const d = onlyDigits(value);
  if (!d) return null;
  if (d.length !== 8) return "CEP incompleto.";
  if (d === "00000000") return "CEP inválido.";
  return null;
}

/* -------------------- RESPONSE HELPERS -------------------- */
async function readBody(res: Response) {
  const raw = await res.text();
  let json: any = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }
  return { raw, json };
}

function formatDrfError(json: any, fallback: string) {
  if (!json || typeof json !== "object") return fallback;
  if (typeof (json as any).detail === "string") return (json as any).detail;

  const parts: string[] = [];
  for (const [k, v] of Object.entries(json)) {
    if (Array.isArray(v)) parts.push(`${k}: ${v.join(" ")}`);
    else if (typeof v === "string") parts.push(`${k}: ${v}`);
    else if (v && typeof v === "object") parts.push(`${k}: ${JSON.stringify(v)}`);
  }
  return parts.length ? parts.join(" | ") : fallback;
}

type ViaCepAddress = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
};

export default function SignUp({ onSignUp, onBackToLogin }: SignUpProps) {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Premium: erros por campo (aparecem no blur e no avançar)
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [zipFieldError, setZipFieldError] = useState<string | null>(null);

  // foco + destaques
  const numberRef = useRef<HTMLInputElement | null>(null);
  const [highlightNumber, setHighlightNumber] = useState(false);

  const cepRef = useRef<HTMLInputElement | null>(null);
  const [highlightCep, setHighlightCep] = useState(false);

  // busca por logradouro
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addressResults, setAddressResults] = useState<ViaCepAddress[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
    cpf: "",
    phone: "",
    zip: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
  });

  const nextStep = () => setStep((prev) => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  // ✅ Ao entrar no step 3, foca o CEP e dá highlight
  useEffect(() => {
    if (step !== 3) return;
    const t = window.setTimeout(() => {
      cepRef.current?.focus();
      setHighlightCep(true);
      window.setTimeout(() => setHighlightCep(false), 1200);
    }, 150);
    return () => window.clearTimeout(t);
  }, [step]);

  // Computed validity (premium)
  const cpfOk = useMemo(() => {
    const d = onlyDigits(formData.cpf);
    if (d.length !== 11) return false;
    return isValidCPF(d);
  }, [formData.cpf]);

  const phoneMsg = useMemo(() => validatePhoneBR(formData.phone), [formData.phone]);
  const phoneOk = useMemo(() => phoneMsg === null && onlyDigits(formData.phone).length === 11, [phoneMsg, formData.phone]);

  const zipMsg = useMemo(() => validateCEP(formData.zip), [formData.zip]);
  const zipOk = useMemo(() => zipMsg === null && onlyDigits(formData.zip).length === 8, [zipMsg, formData.zip]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;

    if (name === "cpf") value = maskCPF(value);
    if (name === "phone") value = maskPhone(value);
    if (name === "zip") value = maskCEP(value);

    if (name === "state") value = value.toUpperCase().slice(0, 2);

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // handlers premium: blur valida e mostra erro
  const handleCpfBlur = () => {
    const d = onlyDigits(formData.cpf);
    if (!d) return setCpfError(null);
    if (d.length !== 11) return setCpfError("CPF incompleto.");
    if (!isValidCPF(d)) return setCpfError("CPF inválido.");
    setCpfError(null);
  };

  const handlePhoneBlur = () => {
    const msg = validatePhoneBR(formData.phone);
    setPhoneError(msg);
  };

  const handleZipBlur = () => {
    const msg = validateCEP(formData.zip);
    setZipFieldError(msg);
  };

  // ViaCEP: preenche rua/bairro/cidade/UF automaticamente e foca no número
  const fetchCEP = async (cep: string) => {
    const digits = onlyDigits(cep);
    if (digits.length !== 8) return;
    if (digits === "00000000") {
      setCepError("CEP inválido.");
      return;
    }

    try {
      setCepError(null);
      setCepLoading(true);

      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();

      if (data?.erro) {
        setCepError("CEP não encontrado.");
        return;
      }

      setFormData((prev) => ({
        ...prev,
        street: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: (data.uf || "").toUpperCase(),
      }));

      window.setTimeout(() => {
        numberRef.current?.focus();
        setHighlightNumber(true);
        window.setTimeout(() => setHighlightNumber(false), 1500);
      }, 150);
    } catch {
      setCepError("Falha ao consultar CEP.");
    } finally {
      setCepLoading(false);
    }
  };

  // dispara consulta quando CEP completo
  useEffect(() => {
    const digits = onlyDigits(formData.zip);
    if (digits.length === 8) fetchCEP(formData.zip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.zip]);

  const searchByLogradouro = async () => {
    const uf = (formData.state || "").trim().toUpperCase();
    const city = (formData.city || "").trim();
    const street = (formData.street || "").trim();

    if (uf.length !== 2 || !city || street.length < 3) {
      setAddressError("Preencha UF (2 letras), cidade e parte do logradouro (mín. 3 letras).");
      setAddressResults([]);
      return;
    }

    try {
      setAddressError(null);
      setAddressLoading(true);
      setAddressResults([]);

      const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`;
      const res = await fetch(url);
      const data = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        setAddressError("Nenhum endereço encontrado para essa busca.");
        return;
      }

      setAddressResults(data.slice(0, 10));
    } catch {
      setAddressError("Falha ao buscar por logradouro.");
    } finally {
      setAddressLoading(false);
    }
  };

  const applyAddressResult = (item: ViaCepAddress) => {
    setFormData((prev) => ({
      ...prev,
      zip: maskCEP(item.cep),
      street: item.logradouro || prev.street,
      neighborhood: item.bairro || prev.neighborhood,
      city: item.localidade || prev.city,
      state: (item.uf || prev.state).toUpperCase(),
    }));

    setShowAddressSearch(false);
    setAddressResults([]);
    setAddressError(null);

    window.setTimeout(() => {
      numberRef.current?.focus();
      setHighlightNumber(true);
      window.setTimeout(() => setHighlightNumber(false), 1500);
    }, 200);
  };

  const validateStepAndSetErrors = () => {
    if (step === 2) {
      // força erros aparecerem ao tentar avançar
      handleCpfBlur();
      handlePhoneBlur();
    }
    if (step === 3) {
      handleZipBlur();
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return (
          formData.name.trim() &&
          formData.email.trim() &&
          formData.password &&
          formData.password === formData.confirmPassword
        );
      case 2:
        return !!formData.dob && cpfOk && phoneOk;
      case 3:
        return (
          zipOk &&
          formData.street.trim() &&
          formData.city.trim() &&
          formData.state.trim().length === 2 &&
          formData.number.trim()
        );
      default:
        return false;
    }
  };

  const handleNext = () => {
    validateStepAndSetErrors();
    if (!isStepValid()) return;
    nextStep();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setApiSuccess(null);

    // trava final premium (evita request inútil)
    handleCpfBlur();
    handlePhoneBlur();
    handleZipBlur();

    if (!cpfOk) {
      setStep(2);
      return;
    }
    if (!phoneOk) {
      setStep(2);
      return;
    }
    if (!isStepValid()) {
      return;
    }

    const payload = {
      username: formData.email,
      full_name: formData.name,
      password: formData.password,
      password2: formData.confirmPassword,

      dob: formData.dob,
      cpf: onlyDigits(formData.cpf),
      phone: onlyDigits(formData.phone),
      zip_code: onlyDigits(formData.zip),

      street: formData.street,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
    };

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/auth/signup/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { raw, json } = await readBody(res);

      if (!res.ok) {
        const fallback = raw?.trim()
          ? raw
          : `Erro ao criar conta (HTTP ${res.status} ${res.statusText}).`;
        setApiError(formatDrfError(json, fallback));
        return;
      }

      const data = json ?? (raw ? { message: raw } : null);
      setApiSuccess("Conta criada com sucesso. Redirecionando para o login...");
      onSignUp?.(data ?? payload);

      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 700);
    } catch (err: any) {
      setApiError(err?.message ?? "Falha de rede ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white text-center">Crie sua Conta</h3>
            <p className="text-sm text-slate-500 text-center mb-6">
              Comece sua jornada na Vértice FX.
            </p>

            <InputField
              name="name"
              label="Nome Completo"
              icon={User}
              value={formData.name}
              onChange={handleInputChange}
              required
            />

            <InputField
              name="email"
              type="email"
              label="Email"
              icon={Mail}
              value={formData.email}
              onChange={handleInputChange}
              required
            />

            <InputField
              name="password"
              type="password"
              label="Senha"
              icon={Lock}
              value={formData.password}
              onChange={handleInputChange}
              required
            />

            <InputField
              name="confirmPassword"
              type="password"
              label="Confirmar Senha"
              icon={Lock}
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
            />

            {formData.password &&
              formData.confirmPassword &&
              formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500 text-center">As senhas não conferem.</p>
              )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white text-center">Informações Pessoais</h3>
            <p className="text-sm text-slate-500 text-center mb-6">Dados para verificação e segurança.</p>

            <InputField
              name="dob"
              type="date"
              label="Data de Nascimento"
              icon={Calendar}
              value={formData.dob}
              onChange={handleInputChange}
              required
            />

            <InputField
              name="cpf"
              label="CPF"
              icon={ScanLine}
              value={formData.cpf}
              onChange={handleInputChange}
              onBlur={handleCpfBlur}
              placeholder="000.000.000-00"
              inputMode="numeric"
              required
              invalid={!!cpfError}
            />
            {cpfError ? <p className="text-xs text-red-300 -mt-2">{cpfError}</p> : null}

            <InputField
              name="phone"
              type="tel"
              label="Telefone"
              icon={Phone}
              value={formData.phone}
              onChange={handleInputChange}
              onBlur={handlePhoneBlur}
              placeholder="(00) 9 9999-1234"
              inputMode="tel"
              required
              invalid={!!phoneError}
            />
            {phoneError ? <p className="text-xs text-red-300 -mt-2">{phoneError}</p> : null}

            <p className="text-xs text-slate-600 text-center">
              Dica: digite só números — a máscara aplica automaticamente.
            </p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white text-center">Endereço</h3>
            <p className="text-sm text-slate-500 text-center mb-6">Seu endereço de correspondência.</p>

            <p className="text-xs text-slate-600 text-center -mt-4 mb-4">
              1) Digite o CEP para preencher automaticamente. <br />
              2) Se não souber, clique em “Buscar por logradouro” e use: UF + Cidade + Rua (parcial).
            </p>

            <InputField
              name="zip"
              label="CEP"
              icon={MapPin}
              value={formData.zip}
              onChange={handleInputChange}
              onBlur={handleZipBlur}
              placeholder="00000-000"
              inputMode="numeric"
              required
              refInput={cepRef}
              highlight={highlightCep}
              invalid={!!zipFieldError || !!cepError}
            />

            {(zipFieldError || cepLoading || cepError) && (
              <div className={`text-xs ${zipFieldError || cepError ? "text-red-300" : "text-slate-400"}`}>
                {zipFieldError ? zipFieldError : cepLoading ? "Consultando CEP..." : cepError}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowAddressSearch((v) => !v);
                setAddressError(null);
                setAddressResults([]);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              disabled={loading || cepLoading}
            >
              Não sabe o CEP? Buscar por logradouro
            </button>

            {showAddressSearch && (
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                <p className="text-xs text-slate-400">
                  Exemplo de busca: <b>SP</b> • <b>São Paulo</b> • <b>Paulista</b> <br />
                  (Você pode digitar só parte do logradouro.)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <InputField
                    name="state"
                    label="UF"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="SP"
                    maxLength={2}
                  />
                  <InputField
                    name="city"
                    label="Cidade"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="São Paulo"
                  />
                </div>

                <InputField
                  name="street"
                  label="Logradouro"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="Avenida Paulista"
                />

                <button
                  type="button"
                  onClick={searchByLogradouro}
                  disabled={addressLoading}
                  className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white text-sm font-semibold transition-all"
                >
                  {addressLoading ? "Buscando..." : "Buscar endereços"}
                </button>

                {addressError && <div className="text-xs text-red-300">{addressError}</div>}

                {addressResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">
                      Clique em um resultado para preencher automaticamente:
                    </p>
                    <div className="max-h-56 overflow-auto rounded-lg border border-slate-800">
                      {addressResults.map((item) => (
                        <button
                          key={`${item.cep}-${item.logradouro}-${item.bairro}`}
                          type="button"
                          onClick={() => applyAddressResult(item)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/60 transition-all border-b border-slate-800 last:border-b-0"
                        >
                          <div className="font-semibold">{item.logradouro || "Logradouro não informado"}</div>
                          <div className="text-xs text-slate-400">
                            {item.bairro ? `${item.bairro} • ` : ""}
                            {item.localidade}-{item.uf} • CEP {item.cep}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <InputField
              name="street"
              label="Logradouro"
              icon={Map}
              value={formData.street}
              onChange={handleInputChange}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <InputField
                name="number"
                label="Número"
                icon={Home}
                value={formData.number}
                onChange={handleInputChange}
                required
                refInput={numberRef}
                highlight={highlightNumber}
              />
              <InputField
                name="complement"
                label="Complemento"
                icon={PlusSquare}
                value={formData.complement}
                onChange={handleInputChange}
              />
            </div>

            <InputField
              name="neighborhood"
              label="Bairro"
              value={formData.neighborhood}
              onChange={handleInputChange}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <InputField
                name="city"
                label="Cidade"
                value={formData.city}
                onChange={handleInputChange}
                required
              />
              <InputField
                name="state"
                label="Estado"
                value={formData.state}
                onChange={handleInputChange}
                required
                maxLength={2}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">CRIAR CONTA</h1>
          <p className="text-slate-500 text-sm mt-1">Processo de cadastro seguro</p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, index) => (
            <React.Fragment key={s.number}>
              <div className="flex flex-col items-center z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    step >= s.number ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-500"
                  }`}
                >
                  {step > s.number ? <CheckCircle size={16} /> : s.number}
                </div>
                <p className={`text-xs mt-2 text-center ${step >= s.number ? "text-slate-300" : "text-slate-600"}`}>
                  {s.title}
                </p>
              </div>

              {index < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 bg-slate-700 relative -top-3.5">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: step > s.number ? "100%" : "0%" }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <form onSubmit={handleSubmit}>
            {renderStep()}

            {apiError && (
              <div className="mt-6 rounded-lg border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-200">
                {apiError}
              </div>
            )}

            {apiSuccess && (
              <div className="mt-6 rounded-lg border border-emerald-900/40 bg-emerald-950/30 p-3 text-sm text-emerald-200">
                {apiSuccess}
              </div>
            )}

            <div className="flex items-center gap-4 mt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-all"
                  disabled={loading}
                >
                  Voltar
                </button>
              )}

              {step < STEPS.length ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStepValid() || loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
                >
                  Avançar
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isStepValid() || loading}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all"
                >
                  {loading ? "Enviando..." : "Finalizar Cadastro"}
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onBackToLogin}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2 mx-auto"
            disabled={loading}
          >
            <ChevronLeft size={16} />
            Já tenho uma conta
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- InputField (premium: invalid) -------------------- */
const InputField = ({
  label,
  icon: Icon,
  refInput,
  highlight,
  invalid,
  ...props
}: any) => (
  <div>
    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
      {label}
    </label>
    <div className="relative">
      {Icon && <Icon size={16} className="absolute left-3 top-3.5 text-slate-500" />}
      <input
        ref={refInput}
        {...props}
        className={`w-full bg-slate-950 border rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none transition-all placeholder:text-slate-600 ${
          highlight
            ? "border-emerald-400 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]"
            : invalid
            ? "border-red-400 shadow-[0_0_0_2px_rgba(248,113,113,0.20)]"
            : "border-slate-800 focus:border-blue-900"
        }`}
      />
    </div>
  </div>
);