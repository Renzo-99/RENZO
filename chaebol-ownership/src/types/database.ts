export interface Database {
  public: {
    Tables: {
      chaebols: {
        Row: Chaebol;
        Insert: Omit<Chaebol, "id" | "created_at">;
        Update: Partial<Omit<Chaebol, "id" | "created_at">>;
      };
      companies: {
        Row: Company;
        Insert: Omit<Company, "id" | "created_at">;
        Update: Partial<Omit<Company, "id" | "created_at">>;
      };
      ownership_links: {
        Row: OwnershipLink;
        Insert: Omit<OwnershipLink, "id" | "created_at">;
        Update: Partial<Omit<OwnershipLink, "id" | "created_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export interface Chaebol {
  id: string;
  name: string;
  name_en: string;
  rank: number;
  total_assets_trillion: number | null;
  holding_company: string | null;
  chairman: string | null;
  color: string;
  created_at: string;
}

export interface Company {
  id: string;
  chaebol_id: string;
  name: string;
  ticker: string | null;
  stock_code: string | null;
  entity_type: "holding" | "subsidiary" | "individual";
  krx_sector: string | null;
  gics_sector: string | null;
  market_cap_billion: number | null;
  stock_price: number | null;
  price_change_percent: number | null;
  is_listed: boolean;
  created_at: string;
}

export interface OwnershipLink {
  id: string;
  chaebol_id: string;
  source_company_id: string;
  target_company_id: string;
  ownership_percent: number;
  ownership_type: "direct" | "indirect";
  created_at: string;
}
