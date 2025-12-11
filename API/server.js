require("dotenv").config();
const fs = require("fs");
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));
// ----------------------------------
// MYSQL CONNECTION (AIVEN SSL)
// ----------------------------------
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync(process.env.DB_SSL_CA),
  },
});

db.connect((err) => {
  if (err) {
    console.log("❌ DB ERROR:", err);
  } else {
    console.log("✅ DB CONNECTED SUCCESSFULLY!");
  }
});

// Multer storage (stores images in /uploads folder)
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ----------------------------------
// 🔥 SAVE or UPDATE CONFIG (NEW VERSION)
// ----------------------------------
app.post("/config", upload.single("logo"), (req, res) => {
  try {
    const { name, address, phone, email, gst } = req.body;
    const logo_url = req.file ? "/uploads/" + req.file.filename : null;

    if (!name || !address || !phone || !email || !gst) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // 🔍 Check existing config
    db.query("SELECT id FROM config LIMIT 1", (err, result) => {
      if (err) return res.status(500).json({ error: "Database error" });

      if (result.length > 0) {
        // 🔁 UPDATE EXISTING
        const id = result[0].id;
        const updateQuery = `UPDATE config SET name=?, address=?, phone=?, email=?, gst=?, updated_at=NOW() ${
          logo_url ? ", logo_url=?" : ""
        } WHERE id=?`;

        const params = logo_url
          ? [name, address, phone, email, gst, logo_url, id]
          : [name, address, phone, email, gst, id];

        db.query(updateQuery, params, (err) => {
          if (err) return res.status(500).json({ error: "Database error" });
          return res.json({
            message: "Configuration updated successfully",
            logo_url,
          });
        });
      } else {
        // ➕ FIRST TIME INSERT
        db.query(
          "INSERT INTO config (name, address, phone, email, gst, logo_url) VALUES (?,?,?,?,?,?)",
          [name, address, phone, email, gst, logo_url],
          (err) => {
            if (err) return res.status(500).json({ error: "Database error" });
            return res
              .status(201)
              .json({ message: "Configuration saved successfully", logo_url });
          }
        );
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ----------------------------------
// 🔥 FETCH CONFIG
// ----------------------------------
app.get("/config", (req, res) => {
  db.query("SELECT * FROM config LIMIT 1", (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    return res.json(result[0] || null);
  });
});
// ----------------------------------
// REGISTER USER
// ----------------------------------
app.post("/register", async (req, res) => {
  try {
    const { first, email, mobile, address, uname, password, role } = req.body;

    console.log("Incoming registration:", req.body);

    if (
      !first ||
      !email ||
      !mobile ||
      !address ||
      !uname ||
      !password ||
      !role
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Optionally hash password later if you enable bcrypt
    // const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO user (username, email, mobile, address, uname, upassword, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [first, email, mobile, address, uname, password, role],
      (err, result) => {
        if (err) {
          console.error("MySQL Error:", err);
          if (err.code === "ER_DUP_ENTRY") {
            return res
              .status(400)
              .json({ error: "Username or email already exists" });
          }
          return res.status(500).json({ error: "Database error" });
        }

        res
          .status(201)
          .json({ message: `User registered successfully as ${role}` });
      }
    );
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Login endpoint
app.post("/login", (req, res) => {
  const { email, password, role } = req.body;
  const sql = "SELECT * FROM user WHERE  email= ? AND upassword = ? and role=?";

  db.query(sql, [email, password, role], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = results[0];
    // Never send password back to client, even if plaintext in DB
    const { password: _, ...userData } = user;

    res.json({
      message: "Login successful",
      user: userData,
    });
  });
});

app.post("/stock", (req, res) => {
  try {
    const { productId, name, purchase_rate, supplier_name, rate, qty, gst } =
      req.body;

    if (
      !productId ||
      !name ||
      !rate ||
      !qty ||
      !purchase_rate ||
      !supplier_name
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    db.query(
      `INSERT INTO stock
         (product_id, product_name, purchase_rate,supplier_name, rate, quantity, available_qty, gst)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         product_name = VALUES(product_name),
         purchase_rate = VALUES(purchase_rate),
         supplier_name = VALUES(supplier_name),
         rate = VALUES(rate),
         quantity = VALUES(quantity), -- Update total quantity to the new value
         available_qty = available_qty + (VALUES(quantity) - quantity), -- Adjust available_qty by the difference
         gst = VALUES(gst),
         updated_at = CURRENT_TIMESTAMP`,
      [productId, name, purchase_rate, supplier_name, rate, qty, qty, gst || 0], // Parameters for the INSERT part
      (error, result) => {
        if (error) {
          console.error("Database error:", error);
          // Check for specific duplicate key error if needed, though ON DUPLICATE KEY UPDATE handles it
          return res.status(500).json({ message: "Database operation failed" });
        }

        console.log("stock operation result:", result); // More descriptive log

        let message = "";
        if (result.affectedRows === 1) {
          message = "New stock item added successfully";
        } else if (result.affectedRows === 2) {
          message = "Stock item updated successfully";
        } else {
          message =
            "No changes made to stock (item already exists with same details)";
        }

        res.status(201).json({
          message,
          id: result.insertId || productId, // Return insertId for new, or productId for update
        });
      }
    );
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error processing request" });
  }
});
app.put("/stock/:id", (req, res) => {
  try {
    const stockId = req.params.id;
    const {
      productId,
      name,
      purchase_rate,
      rate,
      qty,
      gst,
      addQty = 0,
    } = req.body;

    if (!productId || !name || !rate || !qty || !purchase_rate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newTotalQty = parseInt(qty) + parseInt(addQty);

    const updateQuery = `
      UPDATE stock
      SET
        product_id = ?,
        product_name = ?,
        purchase_rate = ?,
        rate = ?,
        quantity = ?,
        available_qty = available_qty + ?,
        gst = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE sid = ?
    `;

    db.query(
      updateQuery,
      [
        productId,
        name,
        purchase_rate,
        rate,
        newTotalQty,
        addQty,
        gst || 0,
        stockId,
      ],
      (error, result) => {
        if (error) {
          console.error("Error updating stock:", error);
          return res
            .status(500)
            .json({ message: "Failed to update stock item" });
        }

        // Insert into stock_history
        const historyQuery = `
          INSERT INTO stock_history (stock_id, product_name, old_qty, added_qty, new_qty)
          VALUES (?, ?, ?, ?, ?)
        `;
        db.query(
          historyQuery,
          [stockId, name, qty, addQty, newTotalQty],
          (histErr) => {
            if (histErr)
              console.error("Error inserting stock history:", histErr);
          }
        );

        res
          .status(200)
          .json({ message: "Stock updated successfully", id: stockId });
      }
    );
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error processing request" });
  }
});
app.get("/stock/:id/history", (req, res) => {
  const stockId = req.params.id;
  const query = `
    SELECT product_name, old_qty, added_qty, new_qty, updated_at
    FROM stock_history
    WHERE stock_id = ?
    ORDER BY updated_at DESC
  `;
  db.query(query, [stockId], (error, results) => {
    if (error) {
      console.error("Error fetching stock history:", error);
      return res.status(500).json({ message: "Failed to fetch stock history" });
    }
    res.status(200).json(results);
  });
});

app.post("/expense", (req, res) => {
  const { invoiceNo, detail, amount } = req.body;

  if (!invoiceNo || !detail || !amount) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql = `
    INSERT INTO expense (invoice_no, expense_detail, amount, created_at)
    VALUES (?, ?, ?, NOW())
  `;

  db.query(sql, [invoiceNo, detail, amount], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database insert failed" });
    }

    res
      .status(201)
      .json({ message: "Expense added successfully", id: result.insertId });
  });
});

app.get("/expense", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) AS total FROM expense`;
  const dataQuery = `
    SELECT eid, invoice_no, expense_detail AS detail, amount, created_at
    FROM expense
    ORDER BY eid DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countQuery, (err, countResult) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Failed to count expenses" });
    }

    const total = countResult[0].total;

    db.query(dataQuery, [limit, offset], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Failed to fetch expenses" });
      }

      res.status(200).json({
        data: results,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    });
  });
});

app.post("/mobile_service", (req, res) => {
  const {
    cus_name,
    address,
    mob_model,
    mob_no,
    issue_details,
    status,
    estimated_cost,
    actual_cost,
    advance,
  } = req.body;

  if (
    !cus_name ||
    !mob_model ||
    !mob_no ||
    !issue_details ||
    actual_cost === undefined
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const sql = `
    INSERT INTO mobile_service 
    (cus_name, address, mob_model, mob_no, issue_details, status, estimated_cost, actual_cost, advance, received_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
  `;

  db.query(
    sql,
    [
      cus_name,
      address,
      mob_model,
      mob_no,
      issue_details,
      status || "Received",
      estimated_cost,
      actual_cost,
      advance,
    ],
    (err, result) => {
      if (err) {
        console.error("DB Insert Error:", err);
        return res.status(500).json({ message: "Database error", error: err });
      }

      res.status(201).json({
        message: "Service added successfully",
        id: result.insertId,
      });
    }
  );
});

app.get("/mobile_service/next_no", (req, res) => {
  const sql = `
    SELECT service_no 
    FROM mobile_service 
    ORDER BY service_id DESC 
    LIMIT 1
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Error fetching last service number:", err);
      return res.status(500).json({ message: "DB error" });
    }

    let nextNo = "SRV-001";

    if (result.length > 0) {
      const last = result[0].service_no; // e.g. "SRV-009"
      const numberPart = parseInt(last.replace("SRV-", ""), 10); // 9
      const nextNumber = numberPart + 1;
      nextNo = `SRV-${nextNumber.toString().padStart(3, "0")}`;
    }

    res.json({ nextServiceNo: nextNo });
  });
});

app.get("/stock", (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default 10 per page
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) AS total FROM stock`;
  const dataQuery = `
    SELECT sid,
      product_id AS id,
      product_name AS name,
      purchase_rate,
      rate,
      quantity,
      available_qty AS availableQty
    FROM stock
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countQuery, (err, countResult) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Failed to fetch count" });
    }

    const total = countResult[0].total;

    db.query(dataQuery, [limit, offset], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Failed to fetch stock items" });
      }

      res.status(200).json({
        data: results,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    });
  });
});

app.get("/get_service", (req, res) => {
  const { page = 1, limit = 10, date } = req.query;
  const offset = (page - 1) * limit;

  let baseQuery = `
    SELECT service_id, service_no, cus_name, mob_model, mob_no, issue_details, status, received_date
    FROM mobile_service`;
  let countQuery = `SELECT COUNT(*) AS total FROM mobile_service`;
  const params = [];

  if (date) {
    baseQuery += ` WHERE DATE(received_date) = ?`;
    countQuery += ` WHERE DATE(received_date) = ?`;
    params.push(date);
  }

  baseQuery += ` ORDER BY service_id DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  db.query(baseQuery, params, (err, dataResults) => {
    if (err) {
      console.error("Error fetching services:", err);
      return res.status(500).json({ message: "Server error" });
    }

    db.query(countQuery, date ? [date] : [], (err, countResults) => {
      if (err) {
        console.error("Error fetching count:", err);
        return res.status(500).json({ message: "Server error" });
      }

      const total = countResults[0].total;
      res.json({
        data: dataResults,
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
      });
    });
  });
});

app.get("/get_service_count", (req, res) => {
  const query = `SELECT 
  COUNT(service_id) AS total_service,
  COUNT(CASE WHEN status = 'Received' THEN 1 END) AS received,
  COUNT(CASE WHEN status = 'Delivered' THEN 1 END) AS delivered
   FROM mobile_service;`;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching services:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json(results);
  });
});

// New endpoint to fetch the list of all products for the dropdown

app.get("/api/products/all", (req, res) => {
  const query = `
    SELECT 
      s.sid AS stockId,
      s.product_id AS productId,
      s.product_name AS productName,
      s.purchase_rate,
      s.rate,
      s.gst,
      si.stock_id AS stockItemStockId
    FROM stock s
    LEFT JOIN stock_items si ON s.sid = si.stock_id
    ORDER BY s.product_name ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Database error fetching all products:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(results);
  });
});

app.post("/invoice", (req, res) => {
  const { customerName, mobileNumber, total, items, discount } = req.body;

  if (!items || items.length === 0 || total === undefined) {
    return res
      .status(400)
      .json({ error: "Items and total amount are required" });
  }

  // Start transaction
  db.beginTransaction((err) => {
    if (err) {
      console.error("Transaction error:", err);
      return res.status(500).json({ error: "Failed to start transaction" });
    }

    // 1. Insert invoice master record
    const insertInvoiceQuery = `
      INSERT INTO invoice_master (customer_name, mobile_number, total,discount)
      VALUES (?, ?, ?,?)`;

    db.query(
      insertInvoiceQuery,
      [customerName || null, mobileNumber || null, total, discount],
      (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("Invoice master error:", err);
            res.status(500).json({ error: "Failed to create invoice" });
          });
        }

        const invoiceId = result.insertId;

        // 2. Insert invoice items
        const itemValues = items.map((item) => [
          invoiceId,
          item.stockId,
          item.productName,
          item.quantity,
          item.rate,
          item.amount,
        ]);

        const insertItemsQuery = `
       INSERT INTO invoice_items (invoice_id, stock_id, product_name, quantity, rate, amount)
       VALUES ?`;

        db.query(insertItemsQuery, [itemValues], (err, itemsResult) => {
          if (err) {
            return db.rollback(() => {
              console.error("Invoice items error:", err);
              res.status(500).json({ error: "Failed to add invoice items" });
            });
          }

          // 3. Update stock for each product
          // 3. Update stock for each product
          const updatePromises = items.map((item) => {
            return new Promise((resolve, reject) => {
              // Check available stock first
              const checkStockQuery = `
      SELECT available_qty 
      FROM stock 
      WHERE product_id = ?`;

              db.query(checkStockQuery, [item.productId], (err, rows) => {
                if (err) return reject(err);

                if (rows.length === 0) {
                  return reject(
                    new Error(`Product ID ${item.productId} not found in stock`)
                  );
                }

                const availableQty = rows[0].available_qty;

                if (availableQty < item.quantity) {
                  return reject(
                    new Error(
                      `Requested quantity (${item.quantity}) is greater than the available stock (${availableQty}).`
                    )
                  );
                }

                // Enough stock -> proceed to update
                const updateStockQuery = `
        UPDATE stock 
        SET available_qty = available_qty - ?
        WHERE product_id = ?`;

                db.query(
                  updateStockQuery,
                  [item.quantity, item.productId],
                  (err, result) => {
                    if (err) return reject(err);
                    resolve();
                  }
                );
              });
            });
          });

          // Execute all stock updates
          Promise.all(updatePromises)
            .then(() => {
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error("Commit error:", err);
                    res
                      .status(500)
                      .json({ error: "Failed to complete transaction" });
                  });
                }
                res.status(200).json({
                  message: "Invoice created and stock updated",
                  invoiceId,
                });
              });
            })
            .catch((error) => {
              db.rollback(() => {
                console.error("Stock update error:", error);
                res.status(400).json({
                  error: error.message || "Failed to update stock",
                });
              });
            });
        });
      }
    );
  });
});

app.delete("/stock/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    // Delete from stock
    const [result] = await db
      .promise()
      .query(`DELETE FROM stock WHERE sid = ?`, [productId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({
      message: "Product deleted successfully",
      deletedId: productId,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Database operation failed" });
  }
});

app.delete("/expense/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    const [result] = await db
      .promise()
      .query(`DELETE FROM expense WHERE eid = ?`, [productId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({
      message: "deleted successfully",
      deletedId: productId,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Database operation failed" });
  }
});

app.get("/get_invoice", (req, res) => {
  const query = `SELECT * FROM invoice_master  WHERE DATE(created_at) = CURDATE() ORDER BY invoice_id DESC`;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching services:", err);
      return res.status(500).json({ message: "Server error" });
    }
    res.json(results);
  });
});

app.get("/invoice_filter", (req, res) => {
  const { startDate, endDate } = req.query;

  let baseQuery = "SELECT * FROM invoice_master";
  let sumQuery = "SELECT SUM(total) AS totalCost FROM invoice_master";
  const params = [];
  const sumParams = [];

  let condition = "";

  if (startDate && endDate) {
    condition = " WHERE DATE(created_at) BETWEEN ? AND ?";
    params.push(startDate, endDate);
    sumParams.push(startDate, endDate);
  } else if (startDate) {
    condition = " WHERE DATE(created_at) = ?";
    params.push(startDate);
    sumParams.push(startDate);
  } else if (endDate) {
    condition = " WHERE DATE(created_at) <= ?";
    params.push(endDate);
    sumParams.push(endDate);
  }

  baseQuery += condition + " ORDER BY created_at DESC";
  sumQuery += condition;

  db.query(baseQuery, params, (err, results) => {
    if (err) {
      console.error("Error fetching invoices:", err);
      return res.status(500).json({ error: "Database error" });
    }

    db.query(sumQuery, sumParams, (sumErr, sumResults) => {
      if (sumErr) {
        console.error("Error calculating invoice total:", sumErr);
        return res.status(500).json({ error: "Database error" });
      }

      const total = sumResults[0].totalCost || 0;

      res.json({
        data: results,
        totalCost: total,
      });
    });
  });
});

app.get("/service_filter", (req, res) => {
  const { startDate, endDate } = req.query;

  let baseQuery = "SELECT * FROM mobile_service";
  let sumQuery = "SELECT SUM(actual_cost) AS totalCost FROM mobile_service";
  const params = [];
  const sumParams = [];

  let condition = "";

  if (startDate && endDate) {
    condition = " WHERE DATE(created_at) BETWEEN ? AND ?";
    params.push(startDate, endDate);
    sumParams.push(startDate, endDate);
  } else if (startDate) {
    condition = " WHERE DATE(created_at) = ?";
    params.push(startDate);
    sumParams.push(startDate);
  } else if (endDate) {
    condition = " WHERE DATE(created_at) <= ?";
    params.push(endDate);
    sumParams.push(endDate);
  }

  baseQuery += condition + " ORDER BY created_at DESC";
  sumQuery += condition;

  // Run both queries in parallel
  db.query(baseQuery, params, (err, results) => {
    if (err) {
      console.error("Error fetching services:", err);
      return res.status(500).json({ error: "Database error" });
    }

    db.query(sumQuery, sumParams, (sumErr, sumResults) => {
      if (sumErr) {
        console.error("Error calculating total cost:", sumErr);
        return res.status(500).json({ error: "Database error" });
      }

      const total = sumResults[0].totalCost || 0;

      res.json({
        data: results,
        totalCost: total,
      });
    });
  });
});

app.post("/update_service", (req, res) => {
  const { service_id, issue_details, actual_cost, advance } = req.body;

  console.log("Incoming data:", req.body); // 👈 log incoming data

  const query = `
    UPDATE mobile_service 
    SET issue_details = ?, status = 'Delivered', actual_cost = ?, delivery_date = NOW(), advance = ?
    WHERE service_id = ?`;

  db.query(
    query,
    [issue_details, actual_cost, advance, service_id],
    (err, result) => {
      if (err) {
        console.error("Update error:", err);
        return res.status(500).json({ message: err });
      }

      console.log("SQL result:", result); // 👈 log SQL result

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Service ID not found" });
      }

      res.json({ message: "Service updated successfully" });
    }
  );
});

app.get("/get_service_by_id/:id", (req, res) => {
  const serviceId = req.params.id;

  const query = `
    SELECT * FROM mobile_service
    WHERE service_id = ?
  `;

  db.query(query, [serviceId], (err, results) => {
    if (err) {
      console.error("Error fetching service:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(results[0]); // return the first match
  });
});

app.get("/daily_report", (req, res) => {
  const { startDate } = req.query;

  if (!startDate) {
    return res.status(400).json({ error: "startDate is required" });
  }

  const queries = {
    invoices: `
      SELECT 
        COUNT(*) AS invoiceCount, 
        COALESCE(SUM(final_amount), 0) AS totalInvoiceSale 
      FROM invoice_master 
      WHERE DATE(created_at) = CURDATE() ;
    `,
    deliveredServices: `
      SELECT 
        COUNT(*) AS deliveredCount, 
        COALESCE(SUM(actual_cost), 0) AS totalDeliveredCost 
      FROM mobile_service 
      WHERE DATE(created_at) = CURDATE()  AND status = 'delivered';
    `,
    receivedServices: `
      SELECT 
        COUNT(*) AS receivedCount 
      FROM mobile_service 
      WHERE DATE(created_at) = CURDATE() ;
    `,
    todayTotal: `
      SELECT
        (
          SELECT COALESCE(SUM(final_amount), 0) FROM invoice_master WHERE DATE(created_at) = CURDATE() 
        ) +
        (
          SELECT COALESCE(SUM(actual_cost), 0) FROM mobile_service WHERE DATE(created_at) = CURDATE()  AND status = 'delivered'
        ) AS todayTotal;
    `,
  };

  db.query(queries.invoices, [startDate], (err1, invoiceResult) => {
    if (err1) return res.status(500).json({ error: "Invoice query error" });

    db.query(
      queries.deliveredServices,
      [startDate],
      (err2, deliveredResult) => {
        if (err2)
          return res
            .status(500)
            .json({ error: "Delivered services query error" });

        db.query(
          queries.receivedServices,
          [startDate],
          (err3, receivedResult) => {
            if (err3)
              return res
                .status(500)
                .json({ error: "Received services query error" });

            db.query(
              queries.todayTotal,
              [startDate, startDate],
              (err4, totalResult) => {
                if (err4)
                  return res
                    .status(500)
                    .json({ error: "Total sale query error" });
                console.log("answer", totalResult);

                return res.json({
                  invoiceCount: invoiceResult[0].invoiceCount ?? 0,
                  totalInvoiceSale: invoiceResult[0].totalInvoiceSale ?? 0,
                  deliveredCount: deliveredResult[0].deliveredCount ?? 0,
                  totalDeliveredCost:
                    deliveredResult[0].totalDeliveredCost ?? 0,
                  receivedCount: receivedResult[0].receivedCount ?? 0,
                  todayTotalSale: totalResult[0].todayTotal ?? 0,
                });
              }
            );
          }
        );
      }
    );
  });
});

app.get("/invoice_prt/:invoiceId", (req, res) => {
  const invoiceId = req.params.invoiceId;

  const invoiceQuery = "SELECT * FROM invoice_master WHERE invoice_id = ?";
  const itemsQuery = "SELECT * FROM invoice_items WHERE invoice_id = ?";

  db.query(invoiceQuery, [invoiceId], (err, invoiceResults) => {
    if (err) return res.status(500).json({ error: "Failed to fetch invoice" });

    if (invoiceResults.length === 0)
      return res.status(404).json({ error: "Invoice not found" });

    db.query(itemsQuery, [invoiceId], (err, itemResults) => {
      if (err) return res.status(500).json({ error: "Failed to fetch items" });

      res.json({
        invoice: invoiceResults[0],
        items: itemResults,
      });
    });
  });
});

app.get("/sale_service_summary", (req, res) => {
  const query = `CALL GetDailyAndMonthlyReport();`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Stored procedure error:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const [
      todayInvoice,
      todayDelivered,
      todayReceived,
      todayTotal,
      monthlyTotal,
    ] = results;

    return res.json({
      todayInvoiceCount: todayInvoice[0]?.todayInvoiceCount || 0,
      todayInvoiceSale: todayInvoice[0]?.todayInvoiceSale || 0,
      todayDeliveredCount: todayDelivered[0]?.todayDeliveredCount || 0,
      todayDeliveredCost: todayDelivered[0]?.todayDeliveredCost || 0,
      todayReceivedCount: todayReceived[0]?.todayReceivedCount || 0,
      todayTotalSale: todayTotal[0]?.todayTotalSale || 0,
      monthlyInvoiceSale: monthlyTotal[0]?.monthlyInvoiceSale || 0,
      monthlyServiceSale: monthlyTotal[0]?.monthlyServiceSale || 0,
    });
  });
});

app.get("/monthly_sales_chart", (req, res) => {
  const query = "CALL GetMonthlySalesChart()";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching monthly sales chart:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Stored procedure returns results in [[rows], meta]
    const salesData = results[0].map((row) => ({
      month: row.month_name,
      totalSales: row.total_sales,
    }));

    res.json(salesData);
  });
});

app.get("/monthly_service_chart", (req, res) => {
  const query = "CALL GetMonthlyServiceChart()";

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching monthly sales chart:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Stored procedure returns results in [[rows], meta]
    const salesData = results[0].map((row) => ({
      month: row.month_name,
      totalSales: row.total_service_cost,
    }));

    res.json(salesData);
    console.log(salesData);
  });
});

app.get("/top-selling-products", (req, res) => {
  db.query("CALL GetTopSellingProducts()", (err, results) => {
    if (err) {
      console.error("Error calling stored procedure:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    // results[0] contains the actual result set from the procedure
    res.json(results[0]);
  });
});

app.post("/delete_invoice", (req, res) => {
  const { invoiceNo } = req.body;

  console.log("Deleting invoice:", invoiceNo);

  const deleteItemsQuery = "DELETE FROM invoice_items WHERE invoice_id = ?";
  const deleteMasterQuery = "DELETE FROM invoice_master WHERE invoice_id = ?";

  // First delete from invoice_items
  db.query(deleteItemsQuery, [invoiceNo], (err1, result1) => {
    if (err1) {
      console.error("Error deleting invoice items:", err1);
      return res
        .status(500)
        .json({ message: "Failed to delete invoice items" });
    }

    // Then delete from invoice_master
    db.query(deleteMasterQuery, [invoiceNo], (err2, result2) => {
      if (err2) {
        console.error("Error deleting invoice master:", err2);
        return res
          .status(500)
          .json({ message: "Failed to delete invoice master" });
      }

      if (result2.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Invoice not found in master table" });
      }

      res.json({ message: "Invoice deleted successfully" });
    });
  });
});

app.get("/invoice-rep/:invoiceNo", (req, res) => {
  const { invoiceNo } = req.params;

  const query = `
    SELECT ii.*, im.discount,im.total
    FROM invoice_items ii
    JOIN invoice_master im
      ON ii.invoice_id = im.invoice_id
    WHERE ii.invoice_id = ?
  `;

  db.query(query, [invoiceNo], (err, results) => {
    if (err)
      return res.status(500).json({ error: "Database error", details: err });
    res.json(results);
  });
});

app.post("/services/:serviceId", (req, res) => {
  const { serviceId } = req.params;

  const query = `
    SELECT 
      service_id,
      balance,
      service_no,
      cus_name AS customerName,
      mob_model AS mobileModel,
      mob_no AS mobileNumber,
      issue_details AS issueDetails,
      actual_cost AS actualCost,
      status,advance,received_date FROM mobile_service WHERE service_id = ?`;

  db.query(query, [serviceId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    if (results.length > 0) {
      res.json(results[0]);
    } else {
      res.status(404).json({ error: "Service not found" });
    }
  });
});

app.get("/expense/search", (req, res) => {
  const { startDate, endDate } = req.query;

  let condition = "";
  const params = [];

  if (startDate && endDate) {
    condition = " WHERE DATE(created_at) BETWEEN ? AND ?";
    params.push(startDate, endDate);
  } else if (startDate) {
    condition = " WHERE DATE(created_at) = ?";
    params.push(startDate);
  } else if (endDate) {
    condition = " WHERE DATE(created_at) <= ?";
    params.push(endDate);
  }

  const query = `
    SELECT eid, invoice_no, expense_detail AS detail, amount, created_at 
    FROM expense
    ${condition}
    ORDER BY created_at DESC
  `;
  console.log("sea query", query);
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to fetch expenses" });
    }

    res.json(results);
  });
});

app.post("/invoiceNo", (req, res) => {
  const query = `SELECT MAX(invoice_id) AS lastInvoiceId FROM invoice_master`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching invoice number:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const lastInvoiceId = results[0].lastInvoiceId || 0;
    const nextInvoiceNo = lastInvoiceId + 1;

    res.json({ invoiceNo: nextInvoiceNo });
  });
});

app.get("/stock_select/:id", (req, res) => {
  const serviceId = req.params.id;

  const query = `SELECT * FROM stock WHERE sid = ?`;

  db.query(query, [serviceId], (err, results) => {
    if (err) {
      console.error("Error fetching service:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json(results[0]); // return the first match
  });
});

//supplier crud operations
app.post("/supplier", (req, res) => {
  const { supplier_name, mobile, address, gst_number } = req.body;

  if (!supplier_name) {
    return res.status(400).json({ message: "Supplier name is required" });
  }

  const sql = `
    INSERT INTO supplier (supplier_name, mobile, address, gst_number)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [supplier_name, mobile, address, gst_number], (err, result) => {
    if (err) {
      console.error("Supplier Insert Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    res.status(201).json({
      message: "Supplier added successfully",
      supplierId: result.insertId,
    });
  });
});

app.get("/supplier", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  const countQuery = `SELECT COUNT(*) AS total FROM supplier`;

  const dataQuery = `
    SELECT supplier_id, supplier_name, mobile, address, gst_number, created_at, updated_at
    FROM supplier
    ORDER BY supplier_id DESC
    LIMIT ? OFFSET ?
  `;

  // First fetch total count
  db.query(countQuery, (err, countResult) => {
    if (err) {
      console.error("Supplier Count Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    const total = countResult[0].total;

    // Then fetch paginated data
    db.query(dataQuery, [limit, offset], (err, results) => {
      if (err) {
        console.error("Supplier Fetch Error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      res.json({
        data: results,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    });
  });
});
app.get("/supplier/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT supplier_id, supplier_name, mobile, address, gst_number, created_at, updated_at
    FROM supplier
    WHERE supplier_id = ?
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Supplier Fetch Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json(results[0]);
  });
});
app.put("/supplier/:id", (req, res) => {
  const sid = req.params.id;
  const { supplier_name, mobile, address, gst_number } = req.body;

  const sql = `
    UPDATE supplier
    SET supplier_name = ?, mobile = ?, address = ?, gst_number = ?, updated_at = NOW()
    WHERE supplier_id = ?
  `;

  db.query(
    sql,
    [supplier_name, mobile, address, gst_number, sid],
    (err, result) => {
      if (err) {
        console.error("Supplier Update Error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      res.json({ message: "Supplier updated successfully" });
    }
  );
});

app.delete("/supplier/:id", (req, res) => {
  const sid = req.params.id;

  const sql = `DELETE FROM supplier WHERE supplier_id = ?`;

  db.query(sql, [sid], (err, result) => {
    if (err) {
      console.error("Supplier Delete Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json({
      message: "Supplier deleted successfully",
      deletedId: sid,
    });
  });
});

// ----------------------------------
// START SERVER
// ----------------------------------
app.listen(process.env.PORT, () =>
  console.log(`🚀 Server running on port ${process.env.PORT}`)
);
