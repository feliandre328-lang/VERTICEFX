import React, { useState } from "react";
import { User, Mail, Lock, ScanLine, Phone, ChevronLeft } from "lucide-react";
import { signup } from "../services/api"; // ajuste se necessário

type FormState = {
  username: string;
  full_name: string;
  email: string;
  password: string;
  password2: string;
  cpf: string;
  phone: string;
};

interface SignUpProps {
  onBackToLogin?: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onBackToLogin }) => {
  const [form, setForm] = useState<FormState>({
    username: "",
    full_name: "",
    email: "",
    password: "",
    password2: "",
    cpf: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // ✅ garante que só atualiza chaves existentes
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");

    if (form.password !== form.password2) {
      setErrMsg("As senhas não conferem.");
      return;
    }

    try {
      setLoading(true);

      const res = await signup({
        username: form.username.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        password2: form.password2,
        cpf: form.cpf,
        phone: form.phone,
      });

      if (res?.access) localStorage.setItem("access", res.access);
      if (res?.refresh) localStorage.setItem("refresh", res.refresh);

      if (onBackToLogin) onBackToLogin();
      else window.location.href = "/login";
    } catch (err: any) {
      setErrMsg(err?.message ?? "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-8">
        <h1 className="text-2xl font-bold text-white text-center">CRIAR CONTA</h1>
        <p className="text-slate-500 text-sm mt-1 text-center">Cadastro</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <InputField
            label="Nome Completo"
            icon={User}
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="Seu nome"
            required
          />

          <InputField
            label="Usuário"
            icon={User}
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="seu_usuario"
            required
          />

          <InputField
            label="Email"
            icon={Mail}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="voce@email.com"
            required
          />

          <InputField
            label="Senha"
            icon={Lock}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <InputField
            label="Confirmar Senha"
            icon={Lock}
            type="password"
            name="password2"
            value={form.password2}
            onChange={handleChange}
            required
          />

          <InputField
            label="CPF"
            icon={ScanLine}
            name="cpf"
            value={form.cpf}
            onChange={handleChange}
            placeholder="000.000.000-00"
            required
          />

          <InputField
            label="Telefone"
            icon={Phone}
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="(00) 00000-0000"
            required
          />

          {errMsg && <p className="text-red-500 text-sm text-center">{errMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-lg transition-all"
          >
            {loading ? "Cadastrando..." : "Criar Conta"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => (onBackToLogin ? onBackToLogin() : (window.location.href = "/login"))}
            className="text-sm text-slate-400 hover:text-white flex items-center gap-2 justify-center"
          >
            <ChevronLeft size={16} />
            Já tenho uma conta
          </button>
        </div>
      </div>
    </div>
  );
};

function InputField(props: any) {
  const { label, icon: Icon, ...inputProps } = props;

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-3.5 text-slate-500" />}
        <input
          {...inputProps}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900 transition-all placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}

export default SignUp;