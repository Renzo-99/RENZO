-- 1. 상품 마스터 (67개 품목)
CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'A',
  unit          TEXT NOT NULL DEFAULT '개',
  current_stock INTEGER NOT NULL DEFAULT 0,
  total_in      INTEGER NOT NULL DEFAULT 0,
  total_out     INTEGER NOT NULL DEFAULT 0,
  min_stock     INTEGER DEFAULT 5,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 사용장소 마스터 (32개 장소)
CREATE TABLE locations (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  dong          TEXT,
  building_code TEXT,
  phone         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 주간 보고서
CREATE TABLE weekly_reports (
  id            SERIAL PRIMARY KEY,
  year          INTEGER NOT NULL,
  week_number   INTEGER NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        TEXT DEFAULT 'draft',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(year, week_number)
);

-- 4. 일일 작업
CREATE TABLE daily_tasks (
  id            SERIAL PRIMARY KEY,
  report_id     INTEGER NOT NULL REFERENCES weekly_reports(id) ON DELETE CASCADE,
  day_of_week   INTEGER NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  description   TEXT NOT NULL DEFAULT '',
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 작업별 자재 사용
CREATE TABLE task_materials (
  id              SERIAL PRIMARY KEY,
  task_id         INTEGER NOT NULL REFERENCES daily_tasks(id) ON DELETE CASCADE,
  product_id      INTEGER NOT NULL REFERENCES products(id),
  quantity        INTEGER NOT NULL DEFAULT 1,
  location_id     INTEGER REFERENCES locations(id),
  detail_location TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 재고 변동 이력
CREATE TABLE inventory_logs (
  id               SERIAL PRIMARY KEY,
  product_id       INTEGER NOT NULL REFERENCES products(id),
  type             TEXT NOT NULL,
  quantity         INTEGER NOT NULL,
  location_id      INTEGER REFERENCES locations(id),
  detail_location  TEXT,
  dong             TEXT,
  unit_price       NUMERIC(10,2) DEFAULT 0,
  total_price      NUMERIC(10,2) DEFAULT 0,
  memo             TEXT,
  task_material_id INTEGER REFERENCES task_materials(id),
  logged_date      DATE NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_date ON inventory_logs(logged_date);
CREATE INDEX idx_daily_tasks_report ON daily_tasks(report_id);
CREATE INDEX idx_task_materials_task ON task_materials(task_id);

-- RPC: 자재 추가 → 자동 출고
CREATE OR REPLACE FUNCTION add_material_to_task(
  p_task_id INTEGER,
  p_product_id INTEGER,
  p_quantity INTEGER,
  p_location_id INTEGER DEFAULT NULL,
  p_detail_location TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_product products%ROWTYPE;
  v_task daily_tasks%ROWTYPE;
  v_report weekly_reports%ROWTYPE;
  v_tm_id INTEGER;
  v_log_date DATE;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id FOR UPDATE;
  IF v_product.current_stock < p_quantity THEN
    RAISE EXCEPTION '재고 부족: 현재 %개, 요청 %개', v_product.current_stock, p_quantity;
  END IF;

  INSERT INTO task_materials (task_id, product_id, quantity, location_id, detail_location)
  VALUES (p_task_id, p_product_id, p_quantity, p_location_id, p_detail_location)
  RETURNING id INTO v_tm_id;

  UPDATE products
  SET current_stock = current_stock - p_quantity,
      total_out = total_out + p_quantity,
      updated_at = NOW()
  WHERE id = p_product_id;

  SELECT * INTO v_task FROM daily_tasks WHERE id = p_task_id;
  SELECT * INTO v_report FROM weekly_reports WHERE id = v_task.report_id;
  v_log_date := v_report.start_date + v_task.day_of_week;

  INSERT INTO inventory_logs (product_id, type, quantity, location_id, detail_location, memo, task_material_id, logged_date)
  VALUES (p_product_id, 'outbound', p_quantity, p_location_id, p_detail_location, v_task.description, v_tm_id, v_log_date);

  RETURN json_build_object('taskMaterialId', v_tm_id);
END;
$$ LANGUAGE plpgsql;

-- RPC: 자재 삭제 → 재고 복원
CREATE OR REPLACE FUNCTION remove_material_from_task(p_task_material_id INTEGER)
RETURNS JSON AS $$
DECLARE
  v_tm task_materials%ROWTYPE;
BEGIN
  SELECT * INTO v_tm FROM task_materials WHERE id = p_task_material_id;

  UPDATE products
  SET current_stock = current_stock + v_tm.quantity,
      total_out = total_out - v_tm.quantity,
      updated_at = NOW()
  WHERE id = v_tm.product_id;

  DELETE FROM inventory_logs WHERE task_material_id = p_task_material_id;
  DELETE FROM task_materials WHERE id = p_task_material_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
