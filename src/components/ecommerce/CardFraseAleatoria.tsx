"use client";
import React, { useEffect, useMemo, useState } from "react";
import styles from "./CardFraseAleatoria.module.css";
import { useAppSettings } from "@/hooks/useAppSettings";

export default function CardFraseAleatoria() {
  const { settings } = useAppSettings();
  const frases = useMemo(() => {
    const list = Array.isArray(settings.advantages) && settings.advantages.length > 0
      ? settings.advantages.filter((it: any) => it?.active !== false)
      : [
          { destaque: "Crie restaurações perfeitas", complemento: "com a precisão do CAD/CAM!" },
          { destaque: "Reduza o tempo de consulta", complemento: "com designs rápidos e personalizados." },
        ];
    return list;
  }, [settings.advantages]);

  const [fraseIdx, setFraseIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (!frases.length) return;
    setFade(true);
    const delay = Math.max(2000, Math.min(60000, Number(settings.advantagesRotationMs) || 8000));
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        let idx = Math.floor(Math.random() * frases.length);
        if (idx === fraseIdx) idx = (idx + 1) % frases.length;
        setFraseIdx(idx);
        setFade(true);
      }, 700); // tempo do fade-out
    }, delay);
    return () => clearInterval(interval);
  }, [fraseIdx, frases.length, settings.advantagesRotationMs]);

  const { destaque, complemento } = frases[fraseIdx] || { destaque: '', complemento: '' };

  if (settings.showAdvantages === false) return null;
  if (!frases.length) return null;

  return (
    <div className="rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 p-6 mb-4 shadow-md min-h-[130px] flex items-center justify-center text-center transition-colors duration-300">
      <div className={`flex flex-col items-center w-full ${fade ? styles.fadeText : styles.fadeTextOut}`}>
        <span
          className="text-2xl font-bold mb-1 text-center text-[rgb(115,107,107)] dark:text-[#e9e9e9]"
        >
          {destaque}
        </span>
        <span
          className="text-base font-normal text-center text-[rgb(115,107,107)] dark:text-[#e9e9e9]"
        >
          {complemento}
        </span>
      </div>
    </div>
  );
}
