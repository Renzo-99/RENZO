import { Pool } from "pg";

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || "woodshop_db",
  user: process.env.DB_USER || "woodshop",
  password: process.env.DB_PASSWORD || "woodshop123",
});

export default pool;
