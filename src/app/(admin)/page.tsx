import type { Metadata } from "next";
// estilos do card são importados dentro do próprio componente
import WelcomeCard from '@/components/dashboard/WelcomeCard';
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import CardFraseAleatoria from "@/components/ecommerce/CardFraseAleatoria";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import LatestOrdersSection from "@/components/ecommerce/LatestOrdersSection";

export const metadata: Metadata = {
  title:
    "Dashboard | Lab Admin",
  description: "Home for Lab Admin",
};

import { AuthGuard } from "@/components/auth/AuthGuard";

export default function Ecommerce() {
  return (
    <AuthGuard requiredPermission="dashboard">
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <LatestOrdersSection />
      <div className="col-span-12 space-y-6 xl:col-span-7">
        <WelcomeCard />
      </div>

      <div className="col-span-12 xl:col-span-5">
      <CardFraseAleatoria />
      </div>
    </div>
    </AuthGuard>
  );
}
