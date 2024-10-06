'use strict';

const { reject } = require("bcrypt/promises");

module.exports = function (app, sqlite3, sqliteDriver, path, pbkdf) {

  // Set up the database connection asynchronously
  (async () => {
    try {
      const db = await sqliteDriver.open({
        filename: path.resolve(__dirname, '../user.db'),
        driver: sqlite3.cached.Database
      });
      console.log("Database connection established");

      // You can pass the `db` variable into your route handler if needed
      app.locals.db = db; // Store db in app.locals for route access
      
    } catch(err) {
      console.error(`Problem connecting with the database: ${err}`);
    }
  })();

  // Define the route outside of the IIFE to ensure it's registered synchronously
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      let stockData = {};
      let latestPrice = [];
      let ipAddr = "";
      const stock = req.query.stock;
      const like = req.query.like;
      const iteration = 2048;
      const salt = "c31dd9c7d949d2ee76e2583a86e4aa469ed7fed17f2e32d3787d43d2f5981c90";
      const keyLen = 32;
      const hash = "SHA-256";

      // Access database
      const db = await app.locals.db

      try {
        // Check if the stock is more than one
        if (typeof stock === "string") {
          // Get price for the stock
          const fetchReq = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`);
          const processFetch = await fetchReq.json();
          latestPrice.push(await processFetch.latestPrice);

          // Get user IP address
          const userIP = await fetch("https://api.ipify.org?format=json");
          const processIP = await userIP.json();
          ipAddr = processIP.ip;
          
          // Check if stock in db
          let stockCheck = await db.get("SELECT * FROM stocks WHERE stock = ?", stock);

          // Create record of stock if the stock not in db
          if (stockCheck === undefined) {
            await db.run("INSERT INTO stocks(stock) VALUES(?)", stock);
          }

          // Check if like is true
          if (like === "true") {
            // Convert ip to hash
            const key = await pbkdf.pbkdf2(ipAddr, salt, iteration, keyLen, hash)
              
            // Convert the derived key to a Base64-encoded string
            const ipHash = btoa(String.fromCharCode.apply(null, new Uint8Array(key)));
            
            // Check if ip in db
            const checkIp = await db.get("SELECT * FROM ip WHERE ip_hash = ?", ipHash);

            // Make record of IP in db if the ip not in db
            if (checkIp === undefined) {
              // Add the ip to db
              await db.run("INSERT INTO ip(ip_hash) VALUES(?)", ipHash);
            }

            // Check if ip already voted for that stock
            const checkStockIpJunction = await db.get("SELECT * FROM stock_ip_junction \
              LEFT JOIN stocks ON stock_ip_junction.stock_id = stocks.id \
              LEFT JOIN ip ON stock_ip_junction.ip_id = ip.id \
              WHERE stocks.stock = ? \
              AND ip.ip_hash = ?",
              stock,
              ipHash
            )
            
            if (checkStockIpJunction === undefined) {
              // Get ip and stock id
              const ipId = await db.get("SELECT id FROM ip WHERE ip_hash = ?", ipHash);
              const stockId = await db.get("SELECT id from stocks WHERE stock = ?", stock);

              // Insert record to junction table
              await db.run("INSERT INTO stock_ip_junction(stock_id, ip_id) VALUES(?, ?)", stockId.id, ipId.id);
            }
          }

          // Query for stock likes
          const stockLikes = await db.get("SELECT COUNT(*) AS count FROM stock_ip_junction \
            LEFT JOIN stocks ON \
            stock_ip_junction.stock_id = stocks.id \
            WHERE stocks.stock = ?", 
            stock
          );

          stockData.stockData = {
            stock: stock, 
            price: latestPrice[0], 
            likes: stockLikes.count
          };

          res.send(stockData);

        } else if (Array.isArray(stock)) {
          const multiStock = async () => {
            // Query for the price of the first stock
            const fetchReq1 = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock[0]}/quote`);
            const processFetch1 = await fetchReq1.json();
            latestPrice.push(processFetch1.latestPrice);

            // Query for the price of the second stock
            const fetchReq2 = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock[1]}/quote`);
            const processFetch2 = await fetchReq2.json();
            latestPrice.push(processFetch2.latestPrice);
          };

          await multiStock();

          // Iterate throught the stocks to see if it is already in db
          for (let i = 0; i < 2; i++) {
            // Check if stock in db
            let stockCheck = await db.get("SELECT * FROM stocks WHERE stock = ?", stock[i]);

            // Create record of stock if the stock not in db
            if (stockCheck === undefined) {
              await db.run("INSERT INTO stocks(stock) VALUES(?)", stock[i]);
            }
          }
          
          // Process IP when like is true
          if (like === "true") {
            // Convert ip to hash
            const key = await pbkdf.pbkdf2(ipAddr, salt, iteration, keyLen, hash)
              
            // Convert the derived key to a Base64-encoded string
            const ipHash = btoa(String.fromCharCode.apply(null, new Uint8Array(key)));
            
            // Check if ip in db
            const checkIp = await db.get("SELECT * FROM ip WHERE ip_hash = ?", ipHash);

            // Make record of IP in db if the ip not in db
            if (checkIp === undefined) {
              // Add the ip to db
              await db.run("INSERT INTO ip(ip_hash) VALUES(?)", ipHash);
            }

            // Check if ip already voted for the stocks
            for (let i = 0; i < 2; i++) {
              const checkStockIpJunction = await db.get("SELECT * FROM stock_ip_junction \
                LEFT JOIN stocks ON stock_ip_junction.stock_id = stocks.id \
                LEFT JOIN ip ON stock_ip_junction.ip_id = ip.id \
                WHERE stocks.stock = ? \
                AND ip.ip_hash = ?",
                stock[i],
                ipHash
              )

              // Add like to db if not voted yet
              if (checkStockIpJunction === undefined) {
                // Get ip and stock id
                const ipId = await db.get("SELECT id FROM ip WHERE ip_hash = ?", ipHash);
                const stockId = await db.get("SELECT id from stocks WHERE stock = ?", stock[i]);
  
                // Insert record to junction table
                await db.run("INSERT INTO stock_ip_junction(stock_id, ip_id) VALUES(?, ?)", stockId.id, ipId.id);
              }
            }
          }
          
          // Get stocks likes
          let stockLikes = [];
          for (let i = 0; i < 2; i++) {
            // Query for stock likes
            stockLikes.push(await db.get("SELECT COUNT(*) AS count FROM stock_ip_junction \
              LEFT JOIN stocks ON \
              stock_ip_junction.stock_id = stocks.id \
              WHERE stocks.stock = ?", 
              stock[i]
            ));
          }

          stockData.stockData = [
            {
              stock: stock[0], 
              price: latestPrice[0], 
              rel_likes: stockLikes[0].count - stockLikes[1].count
            },
            {
              stock: stock[1], 
              price: latestPrice[1], 
              rel_likes: stockLikes[1].count - stockLikes[0].count
            },
          ];
          
          res.send(stockData);

        } else {
          res.status(400).send({ error: "Invalid stock query" });
        }
        

      } catch (err) {
        console.error(`Error processing stock data: ${err}`);
        res.status(500).send({ error: "Error processing stock data" });
      }
    });
};
