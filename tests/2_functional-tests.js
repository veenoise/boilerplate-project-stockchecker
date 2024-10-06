const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  test("Viewing one stock: GET request to /api/stock-prices/", function(done) {
    chai.request(server)
      .get('/api/stock-prices?stock=GOOG')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body, 'Response should be an object');
        assert.property(res.body, 'stockData', 'Response should contain stockData');
        done();
      })
  })

  test("Viewing one stock and liking it: GET request to /api/stock-prices/", function(done) {
    chai.request(server)
      .get('/api/stock-prices?stock=GOOG&like=true')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body, 'Response should be an object');
        assert.property(res.body, 'stockData', 'Response should contain stockData');
        done();
      })
  })

  let likeCount;
  test("Viewing one stock and liking it: GET request to /api/stock-prices/", function(done) {
    chai.request(server)
      .get('/api/stock-prices?stock=GOOG&like=true')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body, 'Response should be an object');
        likeCount = res.body.stockData.likes;
        assert.property(res.body, 'stockData', 'Response should contain stockData');
        done();
      })
  })

  test("Viewing the same stock and liking it again: GET request to /api/stock-prices/", function(done) {
    chai.request(server)
      .get('/api/stock-prices?stock=AAPL&like=true')
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body, 'Response should be an object');
        assert.property(res.body, 'stockData', 'Response should contain stockData');
        assert.equal(res.body.stockData.stock, 'AAPL', 'The stock should be AAPL');
        const initialLikes = res.body.stockData.likes;  // Store the initial like count

        // Send the request again to like the same stock
        chai.request(server)
          .get('/api/stock-prices')
          .query({ stock: 'AAPL', like: true })  // Attempt to like the same stock again
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body, 'Response should be an object');
            assert.property(res.body, 'stockData', 'Response should contain stockData');
            assert.equal(res.body.stockData.stock, 'AAPL', 'The stock should be AAPL');
            assert.equal(res.body.stockData.likes, initialLikes, 'The like count should remain the same if liked again');
            done();
          });
      })
  })

  test('View two stocks: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: ['AAPL', 'GOOGL'] })  // Querying two stocks
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body, 'Response should be an object');
        assert.isArray(res.body.stockData, 'Response should contain an array for stockData');
        assert.lengthOf(res.body.stockData, 2, 'stockData should contain two stocks');
        
        // Check the first stock
        assert.property(res.body.stockData[0], 'stock', 'First stock object should have stock property');
        assert.property(res.body.stockData[0], 'price', 'First stock object should have price property');
        assert.property(res.body.stockData[0], 'rel_likes', 'First stock object should have likes property');
        assert.equal(res.body.stockData[0].stock, 'AAPL', 'The first stock should be AAPL');

        // Check the second stock
        assert.property(res.body.stockData[1], 'stock', 'Second stock object should have stock property');
        assert.property(res.body.stockData[1], 'price', 'Second stock object should have price property');
        assert.property(res.body.stockData[1], 'rel_likes', 'Second stock object should have likes property');
        assert.equal(res.body.stockData[1].stock, 'GOOGL', 'The second stock should be GOOGL');

        done();
      });
  });

  test('View and like two stocks: GET request to /api/stock-prices/', function(done) {
    chai.request(server)
      .get('/api/stock-prices')
      .query({ stock: ['AAT', 'ABNB'], like: true })  // Querying and liking two stocks
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isObject(res.body, 'Response should be an object');
        assert.isArray(res.body.stockData, 'Response should contain an array for stockData');
        assert.lengthOf(res.body.stockData, 2, 'stockData should contain two stocks');
        
        // Check the first stock (AAT)
        assert.property(res.body.stockData[0], 'stock', 'First stock object should have stock property');
        assert.property(res.body.stockData[0], 'price', 'First stock object should have price property');
        assert.property(res.body.stockData[0], 'rel_likes', 'First stock object should have likes property');
        assert.equal(res.body.stockData[0].stock, 'AAT', 'The first stock should be AAT');

        // Check the second stock (ABNB)
        assert.property(res.body.stockData[1], 'stock', 'Second stock object should have stock property');
        assert.property(res.body.stockData[1], 'price', 'Second stock object should have price property');
        assert.property(res.body.stockData[1], 'rel_likes', 'Second stock object should have likes property');
        assert.equal(res.body.stockData[1].stock, 'ABNB', 'The second stock should be ABNB');

        // Check that likes for both stocks are incremented
        chai.request(server)
          .get('/api/stock-prices')
          .query({ stock: 'AAT'})  // Attempt to like the same stock again
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body, 'Response should be an object');
            assert.property(res.body, 'stockData', 'Response should contain stockData');
            assert.equal(res.body.stockData.stock, 'AAT', 'The stock should be AAT');
            assert.isAbove(res.body.stockData.likes, 0, 'Likes for AAT should be greater than 0');
            done();
          });

        chai.request(server)
          .get('/api/stock-prices')
          .query({ stock: 'ABNB'})  // Attempt to like the same stock again
          .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.isObject(res.body, 'Response should be an object');
            assert.property(res.body, 'stockData', 'Response should contain stockData');
            assert.equal(res.body.stockData.stock, 'ABNB', 'The stock should be ABNB');
            assert.isAbove(res.body.stockData.likes, 0, 'Likes for ABNB should be greater than 0');
            done();
          });
        done();
      });
  });
});
