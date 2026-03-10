import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KpiCard } from "@/components/KpiCard";
import { FilterBar, FilterSelect, SearchInput } from "@/components/FilterBar";
import { TypeBadge } from "@/components/TypeBadge";
import { placements } from "@/data/mockData";
import { formatNumber, formatCurrency, formatDateShort } from "@/lib/format";

export default function PlacementsPage() {
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [verticalFilter, setVerticalFilter] = useState("");

  const clientNames = [...new Set(placements.map((p) => p.client_name))].sort();
  const teamNames = [...new Set(placements.map((p) => p.team_name))].sort();
  const types = [...new Set(placements.map((p) => p.type))].sort();
  const verticals = [...new Set(placements.map((p) => p.vertical))].sort();

  const filtered = placements.filter((p) => {
    if (search && !p.headline.toLowerCase().includes(search.toLowerCase()) && !p.outlet.toLowerCase().includes(search.toLowerCase()) && !p.client_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (clientFilter && p.client_name !== clientFilter) return false;
    if (teamFilter && p.team_name !== teamFilter) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    if (verticalFilter && p.vertical !== verticalFilter) return false;
    return true;
  });

  const totalReach = filtered.reduce((s, p) => s + p.readership_viewership, 0);
  const totalAdValue = filtered.reduce((s, p) => s + p.ad_value, 0);

  return (
    <DashboardLayout>
      <div className="stripe-gap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Media Placements</h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">All media coverage across clients</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="Total Placements" value={filtered.length} />
          <KpiCard label="Total Reach" value={formatNumber(totalReach)} />
          <KpiCard label="Total Ad Value" value={formatCurrency(totalAdValue)} />
        </div>

        <FilterBar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search headlines, outlets, clients..." />
          <FilterSelect label="All Clients" value={clientFilter} options={clientNames} onChange={setClientFilter} />
          <FilterSelect label="All Teams" value={teamFilter} options={teamNames} onChange={setTeamFilter} />
          <FilterSelect label="All Types" value={typeFilter} options={types} onChange={setTypeFilter} />
          <FilterSelect label="All Verticals" value={verticalFilter} options={verticals} onChange={setVerticalFilter} />
        </FilterBar>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Outlet</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reporter</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Headline</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vertical</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Reach</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ad Value</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Secured By</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDateShort(p.date)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-sans font-medium text-foreground">{p.client_name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">{p.outlet}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{p.reporter_name}</td>
                  <td className="max-w-[280px] truncate px-4 py-3">
                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-emerald hover:underline font-sans">
                      {p.headline}
                    </a>
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={p.type} /></td>
                  <td className="px-4 py-3"><TypeBadge type={p.vertical} /></td>
                  <td className="px-4 py-3 text-right">{formatNumber(p.readership_viewership)}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(p.ad_value)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground font-sans">{p.secured_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
