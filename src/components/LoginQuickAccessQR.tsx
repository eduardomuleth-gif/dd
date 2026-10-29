import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, QrCode, Copy, Check, ExternalLink, ShieldCheck, ScanLine } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface LoginQuickAccessQRProps {
  url?: string;
  className?: string;
}

export const LoginQuickAccessQR: React.FC<LoginQuickAccessQRProps> = ({
  url = 'https://securityurban.vercel.app/',
  className = '',
}) => {
  const { colors, theme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === 'dark';
  const isEs = language === 'es';

  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard write failures
    }
  };

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 border transition-all relative overflow-hidden backdrop-blur-md shadow-lg ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200'
      } ${className}`}
    >
      {/* Subtle Top Red Accent Line */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-red-600" />

      {/* Header with tactical icon */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold font-['Rajdhani'] uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {isEs ? 'Acceso Rápido con QR' : 'Quick Access via QR'}
            </h3>
            <p className="text-2xs font-mono text-slate-500 dark:text-slate-400">
              {isEs ? 'ESCANEA DESDE TU MÓVIL' : 'SCAN FROM YOUR MOBILE'}
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>VERCEL LIVE</span>
        </span>
      </div>

      {/* Content Section: QR Code Container + Instructions */}
      <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-4 py-1">
        {/* Crisp QR Code with high-contrast frame */}
        <div className="relative group shrink-0">
          <div className="p-3 sm:p-3.5 bg-white rounded-2xl shadow-md border border-slate-200/90 flex items-center justify-center transition-transform group-hover:scale-[1.02]">
            <QRCodeSVG
              value={url}
              size={140}
              level="M"
              includeMargin={false}
              fgColor="#0f172a"
              bgColor="#ffffff"
            />
          </div>

          {/* Corner scan target accents */}
          <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-red-600 pointer-events-none" />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-red-600 pointer-events-none" />
          <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-red-600 pointer-events-none" />
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-red-600 pointer-events-none" />
        </div>

        {/* Informative Guidance & Action Buttons */}
        <div className="flex-1 text-center sm:text-left lg:text-center space-y-2.5">
          <div className="flex items-center justify-center sm:justify-start lg:justify-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Smartphone className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{isEs ? 'Abre la cámara de tu teléfono' : 'Open your phone camera'}</span>
          </div>

          <p className="text-2xs sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto sm:mx-0 lg:mx-auto">
            {isEs
              ? 'Apunta tu cámara a este código para ingresar a Security Urban al instante sin escribir el enlace.'
              : 'Point your camera at this code to open Security Urban instantly without typing the address.'}
          </p>

          {/* Public URL badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-2xs font-mono text-slate-700 dark:text-slate-300 max-w-full truncate">
            <ScanLine className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">securityurban.vercel.app</span>
          </div>

          {/* Action buttons: Copiar enlace / Visitar */}
          <div className="flex items-center justify-center sm:justify-start lg:justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-xl border text-2xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-red-500'
              }`}
              title={isEs ? 'Copiar enlace al portapapeles' : 'Copy link to clipboard'}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEs ? '¡Copiado!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Copiar enlace' : 'Copy link'}</span>
                </>
              )}
            </button>

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-red-600/10 hover:bg-red-600 hover:text-white text-red-600 dark:text-red-400 border border-red-500/25 text-2xs font-mono font-bold transition flex items-center gap-1.5 shadow-2xs active:scale-95"
            >
              <span>{isEs ? 'Abrir' : 'Open'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
