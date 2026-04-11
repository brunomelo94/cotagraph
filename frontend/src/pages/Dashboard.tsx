import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users,
  Building2,
  Banknote,
  Calendar,
  ArrowRight,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/api/client";
import type { StatsSummary } from "@/api/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function Dashboard() {
  const { data, isLoading, error } = useQuery<StatsSummary>({
    queryKey: ["stats"],
    queryFn: () => api.stats.summary() as Promise<StatsSummary>,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Carregando...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">Erro ao carregar dados.</p>
      </div>
    );
  }

  const lastSync = data.last_sync_at ? new Date(data.last_sync_at) : new Date();

  const statCards = [
    {
      title: "Deputados",
      value: formatNumber(data.total_deputies),
      icon: <Users className="size-5 text-zinc-500" />,
      description: "Parlamentares cadastrados",
    },
    {
      title: "Beneficiários",
      value: formatNumber(data.total_beneficiaries),
      icon: <Building2 className="size-5 text-zinc-500" />,
      description: "Entidades beneficiadas",
    },
    {
      title: "Total Emendas",
      value: formatCurrency(data.total_amendments_brl),
      icon: <Banknote className="size-5 text-zinc-500" />,
      description: "Valor total destinado",
    },
    {
      title: "Ano mais recente",
      value: String(data.latest_amendment_year ?? "—"),
      icon: <Calendar className="size-5 text-zinc-500" />,
      description: "Última atualização de dados",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-8 py-6">
        <div className="max-w-6xl">
          <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Visão geral das emendas parlamentares brasileiras
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-8">
        <div className="mx-auto max-w-6xl">
          {/* Stats Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card) => (
              <Card
                key={card.title}
                className="border-zinc-200 bg-white shadow-sm"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-500">
                    {card.title}
                  </CardTitle>
                  {card.icon}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl font-bold text-zinc-900">
                    {card.value}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="bg-zinc-900 text-white hover:bg-zinc-800"
            >
              <Link to="/deputies">
                <Users className="size-4" />
                Ver Deputados
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            >
              <Link to="/graph/deputy_4497">
                <Share2 className="size-4" />
                Explorar Grafo
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white px-8 py-4">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm text-zinc-400">
            Última sincronização: {formatDate(lastSync)}
          </p>
        </div>
      </footer>
    </div>
  );
}
