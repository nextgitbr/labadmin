"use client";
import React from "react";
import { useAppSettings } from "@/hooks/useAppSettings";
import welcomeStyles from "@/app/(admin)/WelcomeCard.module.css";

export default function WelcomeCard() {
  const { settings } = useAppSettings();
  if (!settings.showWelcome) return null;

  const message = settings.welcomeMessage ||
    "Estamos prontos para impulsionar sua experiência com uma gestão simplificada, eficiente e elegante. Explore, gerencie e transforme seus projetos com facilidade! 🚀";

  return (
    <div className={`rounded-xl p-6 mb-4 shadow-md ${welcomeStyles.welcomeGradient} dark:${welcomeStyles.welcomeGradientDark}`}>
      <h2 className="text-xl font-bold text-white mb-2">Bem-vindo de volta ao Lab Admin!</h2>
      <p className="text-white text-base">{message}</p>
    </div>
  );
}
