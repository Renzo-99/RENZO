export interface ConglomerateGroup {
  id: string;
  name: string;
  slug: string;
  controllerName: string;
  description: string;
  dataDate: string;
  totalCompanies: number;
  listedCompanies: number;
}

export interface Company {
  id: string;
  groupId: string;
  name: string;
  isListed: boolean;
  isHolding: boolean;
  isController: boolean;
  category: string;
  stockCode?: string;
  stockPrice?: number;
  priceChange?: number;
  priceChangePercent?: number;
  marketCap?: number;
  sector?: string;
}

export interface OwnershipRelation {
  id: string;
  groupId: string;
  fromCompanyId: string;
  toCompanyId: string;
  ownershipPct: number;
}

export interface ControllerHolding {
  groupId: string;
  companyId: string;
  ownershipPct: number;
}

export interface GroupData {
  group: ConglomerateGroup;
  companies: Company[];
  relations: OwnershipRelation[];
  controllerHoldings: ControllerHolding[];
}

export type NodeType = "controller" | "listed" | "holding" | "unlisted" | "overseas" | "finance";

export interface StockInfo {
  code: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  sector: string;
}
