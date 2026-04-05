"use client";

import { useState } from "react";
import ProposalFilters from "./ProposalFilters";
import type { ProposalFilterType } from "./ProposalFilters";
import ProposalsTableList from "./ProposalTableList";
import TopHeader from "./TopHeader";

const ProposalsDetials = () => {
  const [searchValue, setSearchValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProposalFilterType>("all");
  const [counts, setCounts] = useState<
    Partial<Record<ProposalFilterType, number>>
  >({
    all: 0,
    draft: 0,
    live: 0,
    favorite: 0,
  });

  return (
    <div className="space-y-8">
      <TopHeader />

      <ProposalFilters
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />

      <ProposalsTableList
        searchValue={searchValue}
        activeFilter={activeFilter}
        onCountsChange={setCounts}
      />
    </div>
  );
};

export default ProposalsDetials;

