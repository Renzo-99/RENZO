export interface Product {
  id: number;
  code: string;
  name: string;
  category: "A" | "B";
  unit: string;
  current_stock: number;
  total_in: number;
  total_out: number;
  min_stock: number;
  is_active: boolean;
  note?: string;
}

export interface Location {
  id: number;
  name: string;
  dong: string;
  building_code?: string;
  phone: string;
}

export interface WeeklyReport {
  id: number;
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
  status: "draft" | "completed" | "submitted";
}

export interface DailyTask {
  id: number;
  report_id: number;
  day_of_week: number;
  sort_order: number;
  description: string;
  note?: string;
  materials?: TaskMaterial[];
}

export interface TaskMaterial {
  id: number;
  task_id: number;
  product_id: number;
  quantity: number;
  location_id?: number;
  detail_location?: string;
  product?: Product;
  location?: Location;
}

export interface InventoryLog {
  id: number;
  product_id: number;
  type: "inbound" | "outbound";
  quantity: number;
  location_id?: number;
  detail_location?: string;
  dong?: string;
  unit_price?: number;
  total_price?: number;
  memo?: string;
  task_material_id?: number;
  logged_date: string;
  product?: Product;
}

export interface AddMaterialRequest {
  productId: number;
  quantity: number;
  locationId?: number;
  detailLocation?: string;
}

export interface InboundRequest {
  productId: number;
  quantity: number;
  unitPrice?: number;
  memo?: string;
}

export interface DayData {
  dayOfWeek: number;
  dayName: string;
  date: string;
  tasks: DailyTask[];
}
