import React, { useState } from 'react';
import { User, Mail, Lock, ChevronLeft, ScanLine, Phone, Calendar, MapPin, Home, PlusSquare, Map, FileImage, Camera, CheckCircle } from 'lucide-react';

interface SignUpProps {
    onSignUp: (data: any) => void;
    onBackToLogin: () => void;
}

const STEPS = [
    { number: 1, title: 'Credenciais' },
    { number: 2, title: 'Dados Pessoais' },
    { number: 3, title: 'Endereço' },
    { number: 4, title: 'Documentos (KYC)' }
];

const SignUp: React.FC<SignUpProps> = ({ onSignUp, onBackToLogin }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        dob: '',
        cpf: '',
        phone: '',
        zip: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: ''
    });
    const [files, setFiles] = useState<{ [key: string]: File | null }>({
        docFront: null,
        docBack: null,
        selfie: null,
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, files: inputFiles } = e.target;
        if (inputFiles && inputFiles.length > 0) {
            setFiles(prev => ({ ...prev, [name]: inputFiles[0] }));
        }
    };
    
    const nextStep = () => setStep(prev => Math.min(prev + 1, STEPS.length));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically handle the file uploads and then submit formData
        // For this demo, we'll just pass the text data
        onSignUp({ name: formData.name, email: formData.email });
    };

    const isStepValid = () => {
        switch (step) {
            case 1: return formData.name && formData.email && formData.password && formData.password === formData.confirmPassword;
            case 2: return formData.dob && formData.cpf && formData.phone;
            case 3: return formData.zip && formData.street && formData.city && formData.state;
            case 4: return files.docFront && files.docBack && files.selfie;
            default: return false;
        }
    };

    const CustomFileInput = ({ name, label, icon: Icon, fileName }: { name: string, label: string, icon: any, fileName: string | null }) => (
        <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
            <label htmlFor={name} className="w-full bg-slate-950 border border-dashed border-slate-700 rounded-lg p-4 flex items-center justify-between text-white focus:outline-none focus:border-blue-900 transition-all cursor-pointer hover:bg-slate-800/50">
                <div className="flex items-center gap-3">
                    <Icon size={16} className="text-slate-500" />
                    <span className={`text-sm ${fileName ? 'text-slate-300' : 'text-slate-500'}`}>{fileName || 'Selecionar arquivo...'}</span>
                </div>
                {fileName && <CheckCircle size={16} className="text-emerald-500" />}
            </label>
            <input id={name} name={name} type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" />
        </div>
    );
    
    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white text-center">Crie sua Conta</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">Comece sua jornada na Vértice FX.</p>
                        <InputField name="name" label="Nome Completo" icon={User} value={formData.name} onChange={handleInputChange} required />
                        <InputField name="email" type="email" label="Email" icon={Mail} value={formData.email} onChange={handleInputChange} required />
                        <InputField name="password" type="password" label="Senha" icon={Lock} value={formData.password} onChange={handleInputChange} required />
                        <InputField name="confirmPassword" type="password" label="Confirmar Senha" icon={Lock} value={formData.confirmPassword} onChange={handleInputChange} required />
                        {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p className="text-xs text-red-500 text-center">As senhas não conferem.</p>
                        )}
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white text-center">Informações Pessoais</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">Dados para verificação e segurança.</p>
                        <InputField name="dob" type="date" label="Data de Nascimento" icon={Calendar} value={formData.dob} onChange={handleInputChange} required />
                        <InputField name="cpf" label="CPF" icon={ScanLine} value={formData.cpf} onChange={handleInputChange} placeholder="000.000.000-00" required />
                        <InputField name="phone" type="tel" label="Telefone" icon={Phone} value={formData.phone} onChange={handleInputChange} placeholder="(00) 00000-0000" required />
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white text-center">Endereço</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">Seu endereço de correspondência.</p>
                        <InputField name="zip" label="CEP" icon={MapPin} value={formData.zip} onChange={handleInputChange} required />
                        <InputField name="street" label="Logradouro" icon={Map} value={formData.street} onChange={handleInputChange} required />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField name="number" label="Número" icon={Home} value={formData.number} onChange={handleInputChange} required />
                            <InputField name="complement" label="Complemento" icon={PlusSquare} value={formData.complement} onChange={handleInputChange} />
                        </div>
                        <InputField name="neighborhood" label="Bairro" value={formData.neighborhood} onChange={handleInputChange} required />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField name="city" label="Cidade" value={formData.city} onChange={handleInputChange} required />
                            <InputField name="state" label="Estado" value={formData.state} onChange={handleInputChange} required />
                        </div>
                    </div>
                );
            case 4:
                return (
                     <div className="space-y-4">
                        <h3 className="text-lg font-bold text-white text-center">Verificação de Identidade</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">Anexe seus documentos para análise (KYC).</p>
                        <CustomFileInput name="docFront" label="Documento (Frente)" icon={FileImage} fileName={files.docFront?.name || null} />
                        <CustomFileInput name="docBack" label="Documento (Verso)" icon={FileImage} fileName={files.docBack?.name || null} />
                        <CustomFileInput name="selfie" label="Selfie com Documento" icon={Camera} fileName={files.selfie?.name || null} />
                     </div>
                );
            default: return null;
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
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${step >= s.number ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                                    {step > s.number ? <CheckCircle size={16}/> : s.number}
                                </div>
                                <p className={`text-xs mt-2 text-center ${step >= s.number ? 'text-slate-300' : 'text-slate-600'}`}>{s.title}</p>
                            </div>
                            {index < STEPS.length - 1 && (
                                <div className="flex-1 h-0.5 bg-slate-700 relative -top-3.5">
                                     <div className={`h-full bg-blue-600 transition-all duration-300`} style={{width: step > s.number ? '100%' : '0%'}}></div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
                    <form onSubmit={handleSubmit}>
                        {renderStep()}
                        <div className="flex items-center gap-4 mt-8">
                            {step > 1 && (
                                <button type="button" onClick={prevStep} className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg transition-all">
                                    Voltar
                                </button>
                            )}
                            {step < STEPS.length ? (
                                <button type="button" onClick={nextStep} disabled={!isStepValid()} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all">
                                    Avançar
                                </button>
                            ) : (
                                <button type="submit" disabled={!isStepValid()} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all">
                                    Finalizar Cadastro
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="mt-6 text-center">
                    <button onClick={onBackToLogin} className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-2 mx-auto">
                        <ChevronLeft size={16} />
                        Já tenho uma conta
                    </button>
                </div>
            </div>
        </div>
    );
};

const InputField = ({ label, icon: Icon, ...props }: any) => (
    <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</label>
        <div className="relative">
            <Icon size={16} className="absolute left-3 top-3.5 text-slate-500" />
            <input
                {...props}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-900 transition-all placeholder:text-slate-600"
            />
        </div>
    </div>
);


export default SignUp;