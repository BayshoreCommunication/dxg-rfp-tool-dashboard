"use client";

import { getProposalCountsAction } from "@/app/actions/proposals";
import type { ProposalCounts } from "@/app/actions/proposals";
import { useCallback, useEffect, useState } from "react";
import ProposalFilters from "./ProposalFilters";
import type { ProposalFilterType } from "./ProposalFilters";
import ProposalsTableList from "./ProposalTableList";
import TopHeader from "./TopHeader";

const EMPTY_COUNTS: ProposalCounts = { all: 0, draft: 0, live: 0, favorite: 0, expired: 0, archive: 0, saved: 0 };

const ProposalsDetials = () => {
  const [searchValue, setSearchValue] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProposalFilterType>("all");
  const [counts, setCounts] = useState<ProposalCounts>(EMPTY_COUNTS);
  const [countsTick, setCountsTick] = useState(0);

  const refreshCounts = useCallback(() => {
    setCountsTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(async () => {
      const res = await getProposalCountsAction(searchValue);
      if (mounted && res.success) {
        setCounts(res.counts);
      }
    }, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchValue, countsTick]);

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
        onRefreshCounts={refreshCounts}
      />
    </div>
  );
};

export default ProposalsDetials;
