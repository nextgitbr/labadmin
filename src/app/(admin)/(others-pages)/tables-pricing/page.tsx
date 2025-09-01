// Página: Tabela de Preços
'use client';
import React, { useEffect, useMemo, useState } from 'react';

import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import AuthGuard from '@/components/auth/AuthGuard';

type Product = {
  codigo?: string;
  nome?: string;
  precoBase?: string;
  precoBaseNumber?: number;
  codCategoria?: string;
  categoria?: string;
  tipo?: string;
  descricao?: string;
  iva?: number;
};

function formatPrice(p: Product) {
  if (p.precoBase && p.precoBase.trim()) return p.precoBase;
  if (typeof p.precoBaseNumber === 'number') {
    try {
      return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(p.precoBaseNumber);
    } catch {
      return String(p.precoBaseNumber);
    }
  }
  return '-';
}

export default function TablesPricing() {
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Gera PDF agrupado por macro-categoria (tipo) e depois por subcategoria (categoria)
  const handleDownload = async () => {
    try {
      const [jsPDFMod, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable') as any, // função/side-effect ESM
      ]);
      const JsPDFCtor: any = (jsPDFMod as any).default || (jsPDFMod as any).jsPDF;
      const autoTable: any = (autoTableMod as any).default || (autoTableMod as any);
      const doc = new JsPDFCtor({ unit: 'pt', format: 'a4' });

      const dataToUse = filtered; // respeita busca atual

      // Agrupar por macro-categoria (tipo)
      const byTipo = new Map<string, Product[]>();
      for (const p of dataToUse) {
        const key = (p.tipo || 'Outros').trim();
        if (!byTipo.has(key)) byTipo.set(key, []);
        byTipo.get(key)!.push(p);
      }

      // Ordem preferencial das macro categorias
      const preferred = ['Acrilico', 'CAD/CAM'];
      const outros = Array.from(byTipo.keys()).filter(k => !preferred.includes(k)).sort((a,b)=>a.localeCompare(b));
      const macroOrder = [...preferred.filter(k => byTipo.has(k)), ...outros];

      // Estilos básicos
      const titleFont = 16;
      const subtitleFont = 12;
      const marginX = 40;
      let cursorY = 50;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(18);
      doc.text('Tabela de Preços', marginX, cursorY);
      cursorY += 20;

      for (let idx = 0; idx < macroOrder.length; idx++) {
        const tipo = macroOrder[idx];
        const items = byTipo.get(tipo)!;

        // Quebra de página se necessário
        if (cursorY > 720) { doc.addPage(); cursorY = 50; }

        // Título da macro-categoria
        doc.setFontSize(titleFont);
        doc.setTextColor(40,40,40);
        doc.text(tipo, marginX, cursorY);
        cursorY += 10;

        // Agrupar por subcategoria
        const byCat = new Map<string, Product[]>();
        for (const p of items) {
          const c = (p.categoria || 'Sem categoria').trim();
          if (!byCat.has(c)) byCat.set(c, []);
          byCat.get(c)!.push(p);
        }
        const subcats = Array.from(byCat.keys()).sort((a,b)=>a.localeCompare(b));

        for (const cat of subcats) {
          const rows = byCat.get(cat)!;
          // Subtítulo
          if (cursorY > 700) { doc.addPage(); cursorY = 50; }
          doc.setFontSize(subtitleFont);
          doc.setTextColor(70,70,70);
          doc.text(`Categoria: ${cat}`, marginX, cursorY);
          cursorY += 6;

          // Tabela
          autoTable(doc, {
            startY: cursorY + 6,
            head: [[
              'Código', 'Nome', 'Valor', 'IVA'
            ]],
            body: rows.map(r => [
              r.codigo ?? '-',
              r.nome ?? '-',
              formatPrice(r),
              typeof r.iva === 'number' ? `${r.iva}%` : (r.iva ?? '-')
            ]),
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [240, 240, 240], textColor: 30, halign: 'left' },
            theme: 'striped',
            margin: { left: marginX, right: marginX },
          });

          cursorY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 14 : cursorY + 60;
        }

        if (idx < macroOrder.length - 1) {
          // Espaço entre macro se couber, senão nova página
          if (cursorY > 720) { doc.addPage(); cursorY = 50; }
          else { cursorY += 8; }
        }
      }

      // Add header and page numbers to every page
      try {
        const dateStr = new Date().toLocaleDateString('pt-PT');
        const total = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : 1;
        const pageSize = (doc as any).internal?.pageSize;
        const pageWidth = typeof pageSize?.getWidth === 'function' ? pageSize.getWidth() : (pageSize?.width || 595);
        const pageHeight = typeof pageSize?.getHeight === 'function' ? pageSize.getHeight() : (pageSize?.height || 842);
        for (let i = 1; i <= total; i++) {
          (doc as any).setPage(i);
          // Header
          doc.setFontSize(10);
          doc.setTextColor(120,120,120);
          doc.text('Laboratório - Tabela de Preços', 40, 30);
          doc.text(dateStr, pageWidth - 40, 30, { align: 'right' } as any);
          // Footer page number
          doc.setFontSize(9);
          doc.setTextColor(130,130,130);
          const footer = `Página ${i} de ${total}`;
          doc.text(footer, pageWidth - 40, pageHeight - 30, { align: 'right' } as any);
        }
      } catch {}

      doc.save('tabela-de-precos.pdf');
    } catch (e) {
      console.error('Falha ao gerar PDF:', e);
      // opcional: exibir toast/alert
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) setData(json ?? []);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? 'Erro ao carregar produtos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(p =>
      [p.codigo, p.nome, p.categoria, p.tipo, p.descricao]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    );
  }, [data, query]);

  // Reset page when filters or pageSize change
  useEffect(() => { setPage(1); }, [query, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, page, pageSize]);

  return (
    <AuthGuard requiredPermission="tabelaPrecos">
      <div>
        <PageBreadcrumb pageTitle="Tabela de Preços" />
        <div className="border-t border-gray-100 p-5 dark:border-gray-800 sm:p-6">
          {/* DataTable Tabela de Preços */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white pt-4 dark:border-gray-800 dark:bg-white/[0.03]">
            {/* Aqui vai a tabela de preços */}
            <div className="mb-4 flex flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 dark:text-gray-400">Mostrar</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="dark:bg-dark-900 h-9 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none py-2 pl-3 pr-8 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[300px]"
                >
                  <option value="5">5</option>
                  <option value="8">8</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <span className="text-gray-500 dark:text-gray-400">itens</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative">
                  <button className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                    {/* ícone de busca */}
                  </button>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-11 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[300px]"
                  />
                </div>
                <button onClick={handleDownload} className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-[11px] text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:hover:bg-gray-700 sm:w-auto">
                  Download
                  <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M10.0018 14.083C9.7866 14.083 9.59255 13.9924 9.45578 13.8472L5.61586 10.0097C5.32288 9.71688 5.32272 9.242 5.61552 8.94902C5.90832 8.65603 6.3832 8.65588 6.67618 8.94868L9.25182 11.5227L9.25182 3.33301C9.25182 2.91879 9.5876 2.58301 10.0018 2.58301C10.416 2.58301 10.7518 2.91879 10.7518 3.33301L10.7518 11.5193L13.3242 8.94866C13.6172 8.65587 14.0921 8.65604 14.3849 8.94903C14.6777 9.24203 14.6775 9.7169 14.3845 10.0097L10.5761 13.8154C10.4385 13.979 10.2323 14.083 10.0018 14.083ZM4.0835 13.333C4.0835 12.9188 3.74771 12.583 3.3335 12.583C2.91928 12.583 2.5835 12.9188 2.5835 13.333V15.1663C2.5835 16.409 3.59086 17.4163 4.8335 17.4163H15.1676C16.4102 17.4163 17.4176 16.409 17.4176 15.1663V13.333C17.4176 12.9188 17.0818 12.583 16.6676 12.583C16.2533 12.583 15.9176 12.9188 15.9176 13.333V15.1663C15.9176 15.5806 15.5818 15.9163 15.1676 15.9163H4.8335C4.41928 15.9163 4.0835 15.5806 4.0835 15.1663V13.333Z" fill="" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Tabela real dos produtos */}
            <div className="max-w-full overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-6 border-t border-gray-200 dark:border-gray-800">
                  <div className="col-span-2 flex items-center border-r border-gray-200 px-4 py-3 dark:border-gray-800">
                    <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">Procedimento</span>
                  </div>
                  <div className="col-span-2 flex items-center border-r border-gray-200 px-4 py-3 dark:border-gray-800">
                    <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">Categoria</span>
                  </div>
                  <div className="col-span-1 flex items-center border-r border-gray-200 px-4 py-3 dark:border-gray-800">
                    <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">Valor</span>
                  </div>
                  <div className="col-span-1 flex items-center px-4 py-3">
                    <span className="text-theme-xs font-medium text-gray-700 dark:text-gray-400">Ação</span>
                  </div>
                </div>

                {loading && (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Carregando...</div>
                )}
                {error && (
                  <div className="p-4 text-sm text-error-600 dark:text-error-400">{error}</div>
                )}

                {!loading && !error && paginated.map((p, idx) => (
                  <div key={`${p.codigo ?? idx}`} className="grid grid-cols-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="col-span-2 flex items-center border-r border-gray-100 px-4 py-3 dark:border-gray-800">
                      <div className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        <div className="font-medium">{p.nome ?? '-'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{p.tipo ?? '-'}</div>
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center border-r border-gray-100 px-4 py-3 dark:border-gray-800">
                      <span className="text-theme-sm text-gray-700 dark:text-gray-400">{p.categoria ?? '-'}</span>
                    </div>
                    <div className="col-span-1 flex items-center border-r border-gray-100 px-4 py-3 dark:border-gray-800">
                      <span className="text-theme-sm text-gray-700 dark:text-gray-400">{formatPrice(p)}</span>
                    </div>
                    <div className="col-span-1 flex items-center px-4 py-3">
                      <button className="text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-500" type="button" onClick={() => { /* futuro: ação de remover/editar */ }}>
                        <svg className="fill-current" width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M7.04142 4.29199C7.04142 3.04935 8.04878 2.04199 9.29142 2.04199H11.7081C12.9507 2.04199 13.9581 3.04935 13.9581 4.29199V4.54199H16.1252H17.166C17.5802 4.54199 17.916 4.87778 17.916 5.29199C17.916 5.70621 17.5802 6.04199 17.166 6.04199H16.8752V8.74687V13.7469V16.7087C16.8752 17.9513 15.8678 18.9587 14.6252 18.9587H6.37516C5.13252 18.9587 4.12516 17.9513 4.12516 16.7087V13.7469V8.74687V6.04199H3.8335C3.41928 6.04199 3.0835 5.70621 3.0835 5.29199C3.0835 4.87778 3.41928 4.54199 3.8335 4.54199H4.87516H7.04142V4.29199ZM15.3752 13.7469V8.74687V6.04199H13.9581H13.2081H7.79142H7.04142H5.62516V8.74687V13.7469V16.7087C5.62516 17.1229 5.96095 17.4587 6.37516 17.4587H14.6252C15.0394 17.4587 15.3752 17.1229 15.3752 16.7087V13.7469ZM8.54142 4.54199H12.4581V4.29199C12.4581 3.87778 12.1223 3.54199 11.7081 3.54199H9.29142C8.87721 3.54199 8.54142 3.87778 8.54142 4.29199V4.54199ZM8.8335 8.50033C9.24771 8.50033 9.5835 8.83611 9.5835 9.25033V14.2503C9.5835 14.6645 9.24771 15.0003 8.8335 15.0003C8.41928 15.0003 8.0835 14.6645 8.0835 14.2503V9.25033C8.0835 8.83611 8.41928 8.50033 8.8335 8.50033ZM12.9168 9.25033C12.9168 8.83611 12.581 8.50033 12.1668 8.50033C11.7526 8.50033 11.4168 8.83611 11.4168 9.25033V14.2503C11.4168 14.6645 11.7526 15.0003 12.1668 15.0003C12.581 15.0003 12.9168 14.6645 12.9168 14.2503V9.25033Z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {/* Pagination footer */}
                {!loading && !error && (
                  <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Página {page} de {totalPages} — {filtered.length} itens
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="rounded-lg border px-3 py-1 text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-white/90 dark:bg-gray-900 dark:hover:bg-gray-800"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="rounded-lg border px-3 py-1 text-sm transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-white/90 dark:bg-gray-900 dark:hover:bg-gray-800"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
